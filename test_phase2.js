const { GoogleGenAI } = require('@google/genai')
const fs = require('fs')

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  
  // Create a dummy black square image for testing (base64)
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

  const prompt2 = `This is a highly zoomed-in 150x150 pixel micro-crop of a Toilet from a plumbing floorplan. 
Return the tight bounding box [ymin, xmin, ymax, xmax] of the Toilet's black ink symbol. 
Use a 0-1000 scale relative to this 150x150 image. Wrap tightly around the ink.

Use this exact JSON format:
{ "ymin": 200, "xmin": 200, "ymax": 800, "xmax": 800 }
Output ONLY valid JSON without any markdown formatting or code blocks.`

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt2,
        { inlineData: { data: dummyBase64, mimeType: 'image/png' } }
      ],
      config: { responseMimeType: 'application/json' }
    })
    console.log("Response:", res.text)
  } catch(e) {
    console.log("Error:", e)
  }
}

test()
