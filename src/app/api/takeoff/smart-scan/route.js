import { readFileSync } from 'fs'
import { GoogleGenAI } from '@google/genai'
import { pixelCenterToNormalizedBounds } from '../../../../lib/autoscanCoordinates.mjs'
import { normalizeSmartScanDocument, reconcileSmartScan } from '../../../../lib/smartScan.mjs'
import { addMarkers, findCandidates, getTakeoffPage } from '../../../../lib/takeoffScan'

export const maxDuration = 180

const COMPONENT_VOCABULARY = `
BRANCH POWER: Duplex Receptacle (Outlet), GFCI Receptacle, Quad Outlet, Dedicated 240V Outlet, Floor Box Outlet, USB Outlet, Exterior Weatherproof Receptacle
CONTROLS & DEVICES: Single Pole Switch, 3-Way Switch, 4-Way Switch, Dimmer Switch, Occupancy Sensor, Motion Sensor, Smart Timer Switch
LIGHTING FIXTURES: 2x4 LED Lay-in Troffer, 2x2 LED Troffer, Recessed Downlight (Can Light), High-Bay LED Fixture, Strip Light, Exterior Wall Pack, Emergency Exit Sign Combo, Track Light Head, Pendant Light
DISTRIBUTION & GEAR: Main Distribution Panel, Sub-Panel / Load Center, Circuit Breaker, Disconnect Switch, Transformer, Meter Socket, Junction Box (J-Box), Pull Box
FIRE ALARM & SAFETY: Smoke Detector, Fire Alarm Horn/Strobe, Manual Pull Station, Heat Detector, Carbon Monoxide Detector
LOW VOLTAGE & DATA: Data / Ethernet Outlet (RJ45), TV / Coax Outlet, Telephone Outlet, Intercom Speaker, Security Camera`

function retryableScanError(error) {
  return error instanceof SyntaxError || error.retryable || /429|503|unavailable|high demand|rate limit|invalid smart scan json/i.test(String(error?.message || error))
}

async function generateSmartResult(ai, prompt, imageData) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, { inlineData: { data: imageData, mimeType: 'image/png' } }],
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      })
      const result = JSON.parse(response.text || '{}')
      if (!result || typeof result !== 'object' || !Array.isArray(result.classifications) || !result.document) {
        const error = new Error('Invalid Smart Scan JSON response')
        error.retryable = true
        throw error
      }
      return result
    } catch (err) {
      lastError = err
      if (attempt === 2 || !retryableScanError(err)) throw err
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function POST(request) {
  try {
    const { session, page } = await request.json()
    if (!session || !page) {
      return Response.json({ error: 'Missing session or page' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      return Response.json({ error: 'Please set your GEMINI_API_KEY in .env.local first!' }, { status: 500 })
    }

    const takeoffPage = getTakeoffPage(session, page)
    let candidates = findCandidates(takeoffPage.imagePath)
    if (candidates.length > 80) candidates = candidates.slice(0, 80)

    let analysisPath = takeoffPage.imagePath
    if (candidates.length) {
      analysisPath = takeoffPage.imagePath.replace(/\.png$/, '-smart-marked.png')
      addMarkers(takeoffPage.imagePath, analysisPath, candidates)
    }

    const prompt = `You are an expert construction estimator and construction-document OCR engine. Analyze this complete blueprint page. ${candidates.length ? `It contains ${candidates.length} red numbered circle markers placed at deterministic symbol candidates.` : 'No deterministic symbol candidates were found, but you must still inspect schedules, notes, and visible equipment.'}

For every numbered marker, classify the symbol beneath it using the most specific name and category from this vocabulary:
${COMPONENT_VOCABULARY}

Use "Not a fixture" for text, dimensions, wall fragments, doors, windows, cabinets, or other non-building-system marks. Also perform OCR for the drawing title, printed scale, room names, notes, schedules, and visible inventory. Inventory names should use the same vocabulary whenever possible. Inventory quantities must describe the entire page, including marked symbols; the application will reconcile them with positioned detections.

Return exactly this JSON object:
{
  "classifications": [
    { "n": 1, "name": "Toilet", "category": "Plumbing", "confidence": 0.94 }
  ],
  "document": {
    "title": "Drawing title",
    "scale": "Printed scale",
    "rooms": ["Room name"],
    "notes": ["Relevant note"],
    "inventory": [
      { "name": "Toilet", "category": "Plumbing", "qty": 2, "size": "", "unit": "each", "specs": "", "confidence": 0.9 }
    ]
  }
}

Include one classification entry for every marker number. Confidence must be a calibrated number from 0 to 1: use values below 0.6 when the symbol or text is ambiguous. Use empty arrays or empty strings when information is absent. Output only valid JSON.`

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const result = await generateSmartResult(ai, prompt, readFileSync(analysisPath).toString('base64'))

    const classifications = Array.isArray(result.classifications) ? result.classifications : []
    const classificationByMarker = new Map()
    for (const classification of classifications) {
      const marker = Number(classification?.n)
      if (Number.isInteger(marker) && marker >= 1 && marker <= candidates.length) {
        classificationByMarker.set(marker, classification)
      }
    }

    const detections = candidates.flatMap((candidate, index) => {
      const classification = classificationByMarker.get(index + 1)
      const name = String(classification?.name || 'Fixture').trim()
      if (/not a fixture/i.test(name)) return []
      return [{
        name,
        category: classification?.category || '',
        confidence: classification?.confidence,
        x: candidate.cx,
        y: candidate.cy,
      }]
    })
    const inventory = Array.isArray(result.document?.inventory) ? result.document.inventory : []
    const items = reconcileSmartScan({ detections, inventory, page: takeoffPage.page }).map((item) => ({
      ...item,
      ...(item.x == null
        ? {}
        : pixelCenterToNormalizedBounds(item.x, item.y, takeoffPage.width, takeoffPage.height)),
    }))

    return Response.json({
      items,
      document: normalizeSmartScanDocument(result.document),
      image: {
        width: takeoffPage.width,
        height: takeoffPage.height,
        coordinateSpace: 'source-pixels',
      },
    })
  } catch (err) {
    console.error('Smart Scan Error:', err)
    return Response.json({ error: err.message || 'Smart Scan failed' }, { status: err.status || 500 })
  }
}
