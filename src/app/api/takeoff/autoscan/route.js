import { readFileSync } from 'fs'
import { GoogleGenAI } from '@google/genai'
import { pixelCenterToNormalizedBounds } from '../../../../lib/autoscanCoordinates.mjs'
import { addMarkers, findCandidates, getTakeoffPage } from '../../../../lib/takeoffScan'

export async function POST(request) {
  try {
    const body = await request.json()
    const { session, page, debug } = body

    if (!session || !page) {
      return Response.json({ error: 'Missing session or page' }, { status: 400 })
    }

    const { imagePath, width: globalWidth, height: globalHeight } = getTakeoffPage(session, page)

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      return Response.json({ error: 'Please set your GEMINI_API_KEY in .env.local first!' }, { status: 500 })
    }

    // ==========================================
    // PHASE 1: PROGRAMMATIC CANDIDATE PROPOSAL
    // ==========================================
    let candidates
    try {
      candidates = findCandidates(imagePath)
    } catch (err) {
      console.error('Candidate detection error:', err)
      return Response.json({ error: 'Failed to detect fixture candidates.' }, { status: 500 })
    }

    if (candidates.length > 80) {
      console.warn(`AutoScan: ${candidates.length} candidates, truncating to 80`)
      candidates = candidates.slice(0, 80)
    }

    if (candidates.length === 0) {
      const image = { width: globalWidth, height: globalHeight, coordinateSpace: 'source-pixels' }
      const payload = { items: [], image }
      if (debug) payload.debug = { image, candidates: [], classificationRaw: [], dropped: [] }
      return Response.json(payload)
    }

    // ==========================================
    // PHASE 2: GEMINI CLASSIFICATION (NAMES ONLY)
    // ==========================================
    const markedPath = imagePath.replace(/\.png$/, '-marked.png')
    try {
      addMarkers(imagePath, markedPath, candidates)
    } catch (err) {
      console.error('Marker overlay error:', err)
      return Response.json({ error: 'Failed to draw candidate markers.' }, { status: 500 })
    }
    const markedBuffer = readFileSync(markedPath)

    const prompt = `You are an expert electrical trade estimator examining a full electrical floor plan drawing. This plan has ${candidates.length} red numbered circle markers; each circle sits on an electrical symbol.

For EACH marker number, identify the electrical symbol under the circle and classify it into one of these electrical categories:

BRANCH POWER: Duplex Receptacle (Outlet), GFCI Receptacle, Quad Outlet, Dedicated 240V Outlet, Floor Box Outlet, USB Outlet, Exterior Weatherproof Receptacle
CONTROLS & DEVICES: Single Pole Switch, 3-Way Switch, 4-Way Switch, Dimmer Switch, Occupancy Sensor, Motion Sensor, Smart Timer Switch
LIGHTING FIXTURES: 2x4 LED Lay-in Troffer, 2x2 LED Troffer, Recessed Downlight (Can Light), High-Bay LED Fixture, Strip Light, Exterior Wall Pack, Emergency Exit Sign Combo, Track Light Head, Pendant Light
DISTRIBUTION & GEAR: Main Distribution Panel, Sub-Panel / Load Center, Circuit Breaker, Disconnect Switch, Transformer, Meter Socket, Junction Box (J-Box), Pull Box
FIRE ALARM & SAFETY: Smoke Detector, Fire Alarm Horn/Strobe, Manual Pull Station, Heat Detector, Carbon Monoxide Detector
LOW VOLTAGE & DATA: Data / Ethernet Outlet (RJ45), TV / Coax Outlet, Telephone Outlet, Intercom Speaker, Security Camera
STRUCTURAL & OTHER: Column, Door, Window, Wall Line, Dimension Line, Text Label, Room Name, Grid Line

Use the most specific electrical item name from the lists above. If the circle sits on something that is NOT an electrical component (plain text, dimension tick, wall line fragment), answer exactly "Not a fixture".

Use this exact JSON format:
[
  { "n": 1, "name": "Duplex Receptacle 20A", "category": "Branch Power" }
]
Output one entry per marker number, ONLY valid JSON without any markdown formatting or code blocks.`

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, { inlineData: { data: markedBuffer.toString('base64'), mimeType: 'image/png' } }],
      config: { responseMimeType: 'application/json' },
    })

    const text = res.text || '[]'
    let classifications = []
    try {
      classifications = JSON.parse(text)
      if (!Array.isArray(classifications)) classifications = [classifications]
    } catch (e) {
      console.error('Failed to parse Gemini classification:', text)
      classifications = []
    }

    const nameByMarker = new Map()
    const categoryByMarker = new Map()
    for (const c of classifications) {
      const n = Number(c?.n)
      if (Number.isInteger(n) && c.name) {
        nameByMarker.set(n, String(c.name))
        if (c.category) categoryByMarker.set(n, String(c.category))
      }
    }

    const kept = []
    const dropped = []
    candidates.forEach((cand, i) => {
      const name = nameByMarker.get(i + 1)
      if (name && /not a fixture/i.test(name)) {
        dropped.push({ n: i + 1, x: cand.cx, y: cand.cy, reason: name })
        return
      }
      // Unclassified candidates are kept rather than silently lost — recall
      // is the priority; the user can delete wrong rows from the estimate.
      kept.push({ n: i + 1, name: name || 'Fixture', category: categoryByMarker.get(i + 1) || '', x: cand.cx, y: cand.cy })
    })

    const items = kept.map((item) => ({
      name: item.name,
      category: item.category,
      x: item.x,
      y: item.y,
      ...pixelCenterToNormalizedBounds(item.x, item.y, globalWidth, globalHeight),
    }))

    const payload = {
      items,
      image: { width: globalWidth, height: globalHeight, coordinateSpace: 'source-pixels' },
    }
    if (debug) {
      payload.debug = {
        image: { width: globalWidth, height: globalHeight, coordinateSpace: 'source-pixels' },
        candidates: candidates.map((c, i) => ({ n: i + 1, x: c.cx, y: c.cy, w: c.w, h: c.h, area: c.area })),
        classificationRaw: classifications,
        dropped,
      }
    }

    return Response.json(payload)
  } catch (err) {
    console.error('AutoScan Error:', err)
    return Response.json({ error: err.message || 'Auto-scan failed' }, { status: err.status || 500 })
  }
}
