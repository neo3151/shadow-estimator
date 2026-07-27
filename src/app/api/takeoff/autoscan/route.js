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

    // 2. Crop into 4 quadrants AND pad them to perfect squares!
    // This combines the resolution of Quadrants with the mathematical perfection of Square Padding to defeat Gemini's internal aspect ratio distortion.
    const tilePattern = join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-%d.png`)
    try {
      // First crop into 4 repaged quadrants
      execSync(`convert "${imagePath}" -crop 50%x50% +repage "${tilePattern}"`)
      
      // Then pad each quadrant into a square
      for (let i = 0; i < 4; i++) {
        const tilePath = join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-${i}.png`)
        execSync(`convert "${tilePath}" -background white -gravity center -extent ${maxQuadDim}x${maxQuadDim} "${tilePath}"`)
      }
    } catch (err) {
      console.error('ImageMagick crop/square error:', err)
      return Response.json({ error: 'Failed to slice image into square quadrants.' }, { status: 500 })
    }

    const tiles = [
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-0.png`)), // Top-Left
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-1.png`)), // Top-Right
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-2.png`)), // Bottom-Left
      readFileSync(join(tmpdir(), `takeoff-${session}`, `page-${page}-tile-3.png`))  // Bottom-Right
    ]

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      return Response.json({ error: 'Please set your GEMINI_API_KEY in .env.local first!' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const prompt = `You are an expert plumbing estimator. I am providing you with 4 images representing the four quadrants of a floor plan in this exact order:
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

    const contents = [
      prompt,
      { inlineData: { data: tiles[0].toString('base64'), mimeType: 'image/png' } },
      { inlineData: { data: tiles[1].toString('base64'), mimeType: 'image/png' } },
      { inlineData: { data: tiles[2].toString('base64'), mimeType: 'image/png' } },
      { inlineData: { data: tiles[3].toString('base64'), mimeType: 'image/png' } }
    ]

    const config = { responseMimeType: 'application/json' }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config
    })

    const text = response.text || '[]'
    let rawItems = []
    try {
      rawItems = JSON.parse(text)
    } catch (e) {
      console.error('Failed to parse Gemini output:', text)
      rawItems = []
    }

    // Mathematically translate square-padded quadrant coordinates back to global 0-1000 scale
    const globalItems = rawItems.map(item => {
      // 1. Convert Gemini's 0-1000 scale to absolute pixels on the PADDED square quadrant
      const abs_x = (item.cx / 1000) * maxQuadDim
      const abs_y = (item.cy / 1000) * maxQuadDim

      // 2. Subtract the padding to get absolute pixels on the ORIGINAL rectangular quadrant
      const orig_abs_x = abs_x - quadPadX
      const orig_abs_y = abs_y - quadPadY

      // 3. Convert absolute quadrant pixels to normalized 0-1000 Quadrant Coordinates
      const final_quad_x = Math.max(0, Math.min(1000, (orig_abs_x / quadWidth) * 1000))
      const final_quad_y = Math.max(0, Math.min(1000, (orig_abs_y / quadHeight) * 1000))

      // 4. Map the Quadrant 0-1000 coordinates to the Global 0-1000 coordinates
      let gx = final_quad_x / 2
      let gy = final_quad_y / 2

      if (item.quadrant === 1) { // Top-Right
        gx += 500
      } else if (item.quadrant === 2) { // Bottom-Left
        gy += 500
      } else if (item.quadrant === 3) { // Bottom-Right
        gx += 500
        gy += 500
      }

      // To seamlessly integrate with the frontend which expects xmin/xmax, we just create a tiny 10x10 bounding box around the center point.
      return {
        name: item.name,
        xmin: gx - 5,
        xmax: gx + 5,
        ymin: gy - 5,
        ymax: gy + 5
      }
    }).filter(item => {
       return (item.xmax > 0 && item.xmin < 1000 && item.ymax > 0 && item.ymin < 1000)
    })

    return Response.json({ items: globalItems })

  } catch (err) {
    console.error('AutoScan Error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
