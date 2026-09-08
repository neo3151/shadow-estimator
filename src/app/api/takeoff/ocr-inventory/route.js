import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { GoogleGenAI } from '@google/genai'

// Load catalog for price matching
function loadCatalog() {
  const catalogPath = join(process.cwd(), 'public', 'data', 'catalog.json')
  if (existsSync(catalogPath)) {
    try {
      return JSON.parse(readFileSync(catalogPath, 'utf-8'))
    } catch (e) {
      console.error('Failed to load catalog:', e)
    }
  }
  return []
}

function matchCatalogItem(catalog, itemName, type) {
  const lowerName = itemName.toLowerCase()
  
  // Try exact or fuzzy match in catalog
  const pricedCatalog = catalog.filter((c) => c.price_status !== 'unpriced' && Number(c.estimated_price_usd) > 0)
  let match = pricedCatalog.find(
    (c) => c.item_name.toLowerCase() === lowerName || (c.category && c.category.toLowerCase().includes(lowerName))
  )

  if (!match) {
    match = pricedCatalog.find((c) => {
      const cName = c.item_name.toLowerCase()
      return lowerName.split(' ').some((word) => word.length > 3 && cName.includes(word))
    })
  }

  if (match) {
    return {
      price: match.estimated_price_usd,
      labor: match.labor_hours_per_unit,
      size: match.size || 'Standard',
      unit: match.unit || 'each',
      category: match.category || 'General',
    }
  }

  // Fallbacks by type
  if (lowerName.includes('toilet')) return { price: 285.0, labor: 1.5, size: 'Standard', unit: 'each', category: 'Plumbing Fixtures' }
  if (lowerName.includes('sink')) return { price: 145.0, labor: 0.8, size: 'Standard', unit: 'each', category: 'Plumbing Fixtures' }
  if (lowerName.includes('water heater')) return { price: 685.0, labor: 2.5, size: '50 Gallon', unit: 'each', category: 'Water Heating Equipment' }
  if (lowerName.includes('shower')) return { price: 195.0, labor: 1.2, size: 'Standard', unit: 'each', category: 'Plumbing Fixtures' }
  if (lowerName.includes('bathtub') || lowerName.includes('tub')) return { price: 425.0, labor: 2.5, size: '60 inch', unit: 'each', category: 'Plumbing Fixtures' }
  if (lowerName.includes('washer') || lowerName.includes('dryer')) return { price: 350.0, labor: 1.0, size: 'Standard', unit: 'each', category: 'Plumbing Fixtures' }
  if (lowerName.includes('pipe')) return { price: 4.85, labor: 0.12, size: '1/2 inch', unit: 'per foot', category: 'Piping & Tubing' }

  return { price: 50.0, labor: 0.5, size: 'Standard', unit: 'each', category: 'General' }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { session, page } = body

    if (!session || !page) {
      return Response.json({ error: 'Missing session or page' }, { status: 400 })
    }

    const imagePath = join(tmpdir(), `takeoff-${session}`, `page-${page}.png`)
    if (!existsSync(imagePath)) {
      return Response.json({ error: 'Blueprint page image not found' }, { status: 404 })
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      return Response.json({ error: 'Please set your GEMINI_API_KEY in .env.local first!' }, { status: 500 })
    }

    const imageBuffer = readFileSync(imagePath)
    const catalog = loadCatalog()

    const prompt = `You are an expert construction document estimator and OCR engine. Analyze this blueprint image in detail.
Perform full OCR and item inventory extraction.

Output a valid JSON object with the following structure:
{
  "title": "Title or Header text on drawing",
  "scale": "Scale text found on drawing (e.g. 1/4\" = 1'-0\")",
  "rooms": ["Room 1", "Room 2"],
  "notes": ["All text notes, callouts, or legend specifications found"],
  "items": [
    {
      "name": "Specific item name (e.g., Toilet, Bathroom Sink, Water Heater, Copper Pipe 1/2 inch, PVC Pipe 2 inch)",
      "type": "fixture" or "pipe" or "equipment",
      "qty": 2,
      "specs": "Notes or specs extracted for this item (e.g. low-flow 1.28gpf)"
    }
  ]
}

Extract ALL fixtures, appliances, piping runs, water heaters, sinks, toilets, tubs, and showers visible on the plan.
Return ONLY valid JSON without markdown formatting.`

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' } }],
      config: { responseMimeType: 'application/json' },
    })

    const text = res.text || '{}'
    let data = {}
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error('Failed to parse Gemini OCR response:', text)
      data = { title: 'Blueprint OCR Takeoff', notes: [], items: [] }
    }

    const rawItems = Array.isArray(data.items) ? data.items : []
    const inventory = rawItems.map((item) => {
      const match = matchCatalogItem(catalog, item.name, item.type)
      const qty = Number(item.qty) || 1
      const unitPrice = match.price
      const laborHrs = match.labor
      const totalMaterial = unitPrice * qty
      const totalLabor = laborHrs * qty

      return {
        id: Date.now() + Math.random(),
        name: item.name,
        type: item.type || 'fixture',
        qty,
        size: match.size,
        unit: match.unit,
        category: match.category,
        unitPrice,
        laborHrs,
        totalMaterial,
        totalLabor,
        specs: item.specs || '',
      }
    })

    const totalItems = inventory.reduce((sum, i) => sum + i.qty, 0)
    const totalMaterialCost = inventory.reduce((sum, i) => sum + i.totalMaterial, 0)
    const totalLaborHours = inventory.reduce((sum, i) => sum + i.totalLabor, 0)

    return Response.json({
      title: data.title || 'Architectural Blueprint Takeoff',
      scale: data.scale || 'As Shown',
      rooms: data.rooms || [],
      notes: data.notes || [],
      inventory,
      summary: {
        totalItems,
        totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
        totalLaborHours: Math.round(totalLaborHours * 10) / 10,
      },
    })
  } catch (err) {
    console.error('OCR Inventory Error:', err)
    return Response.json({ error: err.message || 'Failed to perform OCR inventory' }, { status: 500 })
  }
}
