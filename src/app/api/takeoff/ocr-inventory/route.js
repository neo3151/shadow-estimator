import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { GoogleGenAI } from '@google/genai'

const ELECTRICAL_VOCABULARY = `
BRANCH POWER: Duplex Receptacle (Outlet), GFCI Receptacle, Quad Outlet, Dedicated 240V Outlet, Floor Box Outlet, USB Outlet, Exterior Weatherproof Receptacle
CONTROLS & DEVICES: Single Pole Switch, 3-Way Switch, 4-Way Switch, Dimmer Switch, Occupancy Sensor, Motion Sensor, Smart Timer Switch
LIGHTING FIXTURES: 2x4 LED Lay-in Troffer, 2x2 LED Troffer, Recessed Downlight (Can Light), High-Bay LED Fixture, Strip Light, Exterior Wall Pack, Emergency Exit Sign Combo, Track Light Head, Pendant Light
DISTRIBUTION & GEAR: Main Distribution Panel, Sub-Panel / Load Center, Circuit Breaker, Disconnect Switch, Transformer, Meter Socket, Junction Box (J-Box), Pull Box
CONDUIT & WIRE: EMT Conduit, PVC Conduit, MC Cable, NM-B Romex, THHN Copper Wire
FIRE ALARM & SAFETY: Smoke Detector, Fire Alarm Horn/Strobe, Manual Pull Station, Heat Detector, Carbon Monoxide Detector
LOW VOLTAGE & DATA: Data / Ethernet Outlet (RJ45), TV / Coax Outlet, Telephone Outlet, Intercom Speaker, Security Camera`

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
  const lowerName = (itemName || '').toLowerCase()

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

  // Electrical fallbacks by type / keyword (aligned with Electrical Edition catalog)
  if (/gfci|gfi/.test(lowerName)) return { price: 18.5, labor: 0.35, size: '20 Amp 125 Volt', unit: 'each', category: 'Branch Power' }
  if (/receptacle|outlet|duplex|quad/.test(lowerName)) return { price: 3.85, labor: 0.25, size: '20 Amp 125 Volt', unit: 'each', category: 'Branch Power' }
  if (/dimmer|occupancy|motion|sensor|timer/.test(lowerName)) return { price: 28.0, labor: 0.4, size: 'Standard', unit: 'each', category: 'Controls & Devices' }
  if (/switch|3-way|4-way|single.?pole/.test(lowerName)) return { price: 4.5, labor: 0.3, size: '20 Amp 120/277V', unit: 'each', category: 'Controls & Devices' }
  if (/troffer|downlight|high-?bay|wall.?pack|exit.?sign|strip.?light|pendant|track.?light|fixture|luminaire/.test(lowerName)) {
    return { price: 45.0, labor: 0.5, size: 'Standard', unit: 'each', category: 'Lighting Fixtures' }
  }
  if (/panel|load.?center|sub-?panel|breaker|disconnect|transformer|meter.?socket/.test(lowerName)) {
    return { price: 185.0, labor: 1.5, size: 'Standard', unit: 'each', category: 'Distribution & Gear' }
  }
  if (/junction|j-?box|pull.?box/.test(lowerName)) return { price: 22.0, labor: 0.35, size: '8x8x4 inch', unit: 'each', category: 'Distribution & Gear' }
  if (/emt|conduit|pvc conduit|mc cable|romex|nm-?b|thhn|wire|cable/.test(lowerName) || type === 'conduit' || type === 'wire') {
    return { price: 1.85, labor: 0.08, size: '3/4 inch', unit: 'per foot', category: 'Conduit & Wire' }
  }
  if (/smoke|horn|strobe|pull.?station|heat.?detector|carbon.?monoxide|detector/.test(lowerName)) {
    return { price: 35.0, labor: 0.4, size: 'Standard', unit: 'each', category: 'Controls & Devices' }
  }
  if (/data|ethernet|rj45|coax|telephone|camera|intercom/.test(lowerName)) {
    return { price: 8.5, labor: 0.3, size: 'Standard', unit: 'each', category: 'Branch Power' }
  }

  return { price: 25.0, labor: 0.35, size: 'Standard', unit: 'each', category: 'Branch Power' }
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

    const prompt = `You are an expert electrical construction estimator and OCR engine. Analyze this electrical blueprint / power plan image in detail.
Perform full OCR and electrical item inventory extraction.

Prefer item names from this vocabulary whenever possible:
${ELECTRICAL_VOCABULARY}

Output a valid JSON object with the following structure:
{
  "title": "Title or Header text on drawing",
  "scale": "Scale text found on drawing (e.g. 1/4\\" = 1'-0\\")",
  "rooms": ["Room 1", "Room 2"],
  "notes": ["All text notes, callouts, or legend specifications found"],
  "items": [
    {
      "name": "Specific electrical item name (e.g., Duplex Receptacle, GFCI Outlet, Single Pole Switch, 2x4 LED Lay-In Troffer, Main Distribution Panel, EMT Conduit 3/4 inch)",
      "type": "device" or "fixture" or "gear" or "conduit" or "wire",
      "qty": 2,
      "specs": "Notes or specs extracted for this item (e.g. 20A 125V, 3/4 in EMT)"
    }
  ]
}

Extract ALL electrical devices, lighting fixtures, panels, breakers, disconnects, junction boxes, conduit runs, and wire/cable visible on the plan.
Ignore architectural furniture, doors, windows, and non-electrical marks.
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
      data = { title: 'Electrical Blueprint OCR Takeoff', notes: [], items: [] }
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
        type: item.type || 'device',
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
      title: data.title || 'Electrical Blueprint Takeoff',
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
