import { readFileSync, existsSync } from 'fs'
import { GoogleGenAI } from '@google/genai'

export async function detectScaleFromImage(imagePath) {
  if (!existsSync(imagePath)) return null
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE') return null

  try {
    const imageBuffer = readFileSync(imagePath)
    const prompt = `Inspect this architectural/electrical blueprint image and find the scale specification or major dimension lines.

Return a valid JSON object:
{
  "scaleText": "Extracted scale text like '1/4\" = 1'-0\"' or 'Scale: 1/8\" = 1'-0\"' or dimension line '24'-0\"'",
  "pixelsPerFoot": 18.0
}

Standard conversion rules at 72 DPI:
- 1/4" = 1'-0" => 0.25 * 72 = 18 pixels per foot
- 1/8" = 1'-0" => 0.125 * 72 = 9 pixels per foot
- 3/8" = 1'-0" => 0.375 * 72 = 27 pixels per foot
- 1/2" = 1'-0" => 0.5 * 72 = 36 pixels per foot
- 3/4" = 1'-0" => 0.75 * 72 = 54 pixels per foot
- 1" = 1'-0" => 1.0 * 72 = 72 pixels per foot

If a dimension line text (e.g. 24' - 0") spans across an outer wall boundary, calculate pixelsPerFoot = wallPixelWidth / feet.
Return ONLY valid JSON without markdown.`

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' } }],
      config: { responseMimeType: 'application/json' },
    })

    const data = JSON.parse(res.text || '{}')
    if (data.pixelsPerFoot && data.pixelsPerFoot > 0) {
      return {
        scaleText: data.scaleText || 'Auto-Detected',
        pixelsPerFoot: Number(data.pixelsPerFoot),
      }
    }
  } catch (err) {
    console.error('Auto scale detection error:', err)
  }

  // Fallback: 1/4" = 1'-0" at 72dpi is 18 px/ft
  return { scaleText: '1/4" = 1\'-0" (Default)', pixelsPerFoot: 18.0 }
}
