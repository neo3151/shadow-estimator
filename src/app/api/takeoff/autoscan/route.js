import { readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { GoogleGenAI } from '@google/genai'

export async function POST(request) {
  try {
    const body = await request.json()
    const { session, page } = body

    if (!session || !page) {
      return Response.json({ error: 'Missing session or page' }, { status: 400 })
    }

    const imagePath = join(tmpdir(), `takeoff-${session}`, `page-${page}.png`)
    
    // 1. Get original dimensions
    let dims = []
    try {
      dims = execSync(`identify -format "%w %h" "${imagePath}"`).toString().trim().split(' ')
    } catch (e) {
      console.error('Identify failed', e)
      return Response.json({ error: 'Failed to identify image' }, { status: 500 })
    }
    const globalWidth = parseInt(dims[0])
    const globalHeight = parseInt(dims[1])
    
    const quadWidth = Math.floor(globalWidth / 2)
    const quadHeight = Math.floor(globalHeight / 2)
    const maxQuadDim = Math.max(quadWidth, quadHeight)
    
    const quadPadX = (maxQuadDim - quadWidth) / 2
    const quadPadY = (maxQuadDim - quadHeight) / 2

    // ==========================================
    // PHASE 1: REGION PROPOSAL (QUADRANTS)
    // ==========================================
    const tilePattern = join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-%d.png`)
    try {
      execSync(`convert "${imagePath}" -crop 50%x50% +repage "${tilePattern}"`)
      for (let i = 0; i < 4; i++) {
        const tilePath = join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-${i}.png`)
        execSync(`convert "${tilePath}" -background white -gravity center -extent ${maxQuadDim}x${maxQuadDim} "${tilePath}"`)
      }
    } catch (err) {
      console.error('ImageMagick crop/square error:', err)
      return Response.json({ error: 'Failed to slice image into square quadrants.' }, { status: 500 })
    }

    const tiles = [
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-0.png`)),
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-1.png`)),
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-2.png`)),
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-3.png`))
    ]

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      return Response.json({ error: 'Please set your GEMINI_API_KEY in .env.local first!' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const prompt1 = `You are an expert plumbing estimator. I am providing you with 4 images representing the four quadrants of a floor plan in this exact order:
1. Top-Left Quadrant (tile 0)
2. Top-Right Quadrant (tile 1)
3. Bottom-Left Quadrant (tile 2)
4. Bottom-Right Quadrant (tile 3)

Find all plumbing fixtures (Toilet, Sink, Bathtub, Shower, Water Heater) across all 4 images.
Return a JSON array of objects representing each found fixture. 
Each object must have:
- "name": The type of fixture.
- "quadrant": 0, 1, 2, or 3 (representing which tile image it was found in).
- "cx", "cy": The exact center coordinates of the fixture, normalized to a 0-1000 scale RELATIVE to the specific quadrant image it was found in. Pinpoint the exact center of the black ink symbol.

Use this exact JSON format:
[
  { "name": "Toilet", "quadrant": 2, "cx": 225, "cy": 125 }
]
Output ONLY valid JSON without any markdown formatting or code blocks.`

    const config = { responseMimeType: 'application/json' }
    
    const res1 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt1,
        { inlineData: { data: tiles[0].toString('base64'), mimeType: 'image/png' } },
        { inlineData: { data: tiles[1].toString('base64'), mimeType: 'image/png' } },
        { inlineData: { data: tiles[2].toString('base64'), mimeType: 'image/png' } },
        { inlineData: { data: tiles[3].toString('base64'), mimeType: 'image/png' } }
      ],
      config
    })

    const text1 = res1.text || '[]'
    let rawItems = []
    try {
      rawItems = JSON.parse(text1)
    } catch (e) {
      console.error('Failed to parse Gemini Phase 1:', text1)
      rawItems = []
    }

    const roughGlobalItems = rawItems.map(item => {
      const abs_x = (item.cx / 1000) * maxQuadDim
      const abs_y = (item.cy / 1000) * maxQuadDim

      const orig_abs_x = abs_x - quadPadX
      const orig_abs_y = abs_y - quadPadY

      const final_quad_x = Math.max(0, Math.min(1000, (orig_abs_x / quadWidth) * 1000))
      const final_quad_y = Math.max(0, Math.min(1000, (orig_abs_y / quadHeight) * 1000))

      let gx = final_quad_x / 2
      let gy = final_quad_y / 2

      if (item.quadrant === 1) { gx += 500 }
      else if (item.quadrant === 2) { gy += 500 }
      else if (item.quadrant === 3) { gx += 500; gy += 500; }

      // We need absolute pixels for cropping in Phase 2
      const abs_gx = (gx / 1000) * globalWidth
      const abs_gy = (gy / 1000) * globalHeight

      return {
        name: item.name,
        abs_gx: Math.round(abs_gx),
        abs_gy: Math.round(abs_gy)
      }
    })

    // ==========================================
    // PHASE 2: SNIPER REFINEMENT (MICRO-CROPS)
    // ==========================================
    const cropSize = 150
    const halfCrop = cropSize / 2

    const refinePromises = roughGlobalItems.map(async (item, i) => {
      // 1. Calculate safe crop bounds
      let cropX = item.abs_gx - halfCrop
      let cropY = item.abs_gy - halfCrop

      // Constrain to image boundaries
      if (cropX < 0) cropX = 0
      if (cropY < 0) cropY = 0
      if (cropX + cropSize > globalWidth) cropX = globalWidth - cropSize
      if (cropY + cropSize > globalHeight) cropY = globalHeight - cropSize

      const microCropPath = join(tmpdir(), `takeoff-${session}`, `page-${page}-micro-${i}.png`)
      
      try {
        execSync(`convert "${imagePath}" -crop ${cropSize}x${cropSize}+${Math.round(cropX)}+${Math.round(cropY)} +repage "${microCropPath}"`)
      } catch (err) {
        console.error('Sniper crop error:', err)
        // Fallback to rough coordinates if crop fails
        return {
          name: item.name,
          xmin: (item.abs_gx / globalWidth) * 1000 - 5,
          xmax: (item.abs_gx / globalWidth) * 1000 + 5,
          ymin: (item.abs_gy / globalHeight) * 1000 - 5,
          ymax: (item.abs_gy / globalHeight) * 1000 + 5
        }
      }

      const microBuffer = readFileSync(microCropPath)
      
      const prompt2 = `This is a highly zoomed-in 150x150 pixel micro-crop of a ${item.name} from a plumbing floorplan. 
Return the tight bounding box [ymin, xmin, ymax, xmax] of the ${item.name}'s black ink symbol. 
Use a 0-1000 scale relative to this 150x150 image. Wrap tightly around the ink.

Use this exact JSON format:
{ "ymin": 200, "xmin": 200, "ymax": 800, "xmax": 800 }
Output ONLY valid JSON without any markdown formatting or code blocks.`

      try {
        const res2 = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            prompt2,
            { inlineData: { data: microBuffer.toString('base64'), mimeType: 'image/png' } }
          ],
          config
        })
        
        let microRes = JSON.parse(res2.text || '{}')
        if (microRes.xmin == null || microRes.xmax == null || microRes.ymin == null || microRes.ymax == null) {
          throw new Error("Missing bounding box coordinates")
        }

        const micro_cx = (microRes.xmin + microRes.xmax) / 2
        const micro_cy = (microRes.ymin + microRes.ymax) / 2

        // Convert the 0-1000 micro coordinates to absolute micro pixels
        const micro_abs_x = (micro_cx / 1000) * cropSize
        const micro_abs_y = (micro_cy / 1000) * cropSize

        // Add the micro offset to the global crop anchor
        const refined_abs_gx = cropX + micro_abs_x
        const refined_abs_gy = cropY + micro_abs_y

        // Convert refined absolute pixels back to global 0-1000 scale for the frontend
        const final_gx = (refined_abs_gx / globalWidth) * 1000
        const final_gy = (refined_abs_gy / globalHeight) * 1000

        return {
          name: item.name,
          xmin: final_gx - 5,
          xmax: final_gx + 5,
          ymin: final_gy - 5,
          ymax: final_gy + 5
        }

      } catch (e) {
        console.error('Sniper inference failed for item:', item.name, e)
        // Fallback to rough coordinates
        return {
          name: item.name,
          xmin: (item.abs_gx / globalWidth) * 1000 - 5,
          xmax: (item.abs_gx / globalWidth) * 1000 + 5,
          ymin: (item.abs_gy / globalHeight) * 1000 - 5,
          ymax: (item.abs_gy / globalHeight) * 1000 + 5
        }
      }
    })

    const finalItems = await Promise.all(refinePromises)

    return Response.json({ items: finalItems })

  } catch (err) {
    console.error('AutoScan Error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
