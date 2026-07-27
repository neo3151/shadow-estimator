import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { mkdirSync, readdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf')
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No PDF file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const session = randomUUID()
    const dir = join(tmpdir(), `takeoff-${session}`)
    mkdirSync(dir, { recursive: true })

    const inputPath = join(dir, 'input.pdf')
    writeFileSync(inputPath, buffer)

    // 72 dpi => 1 PDF point = 1 pixel, so calibration and drag distances are simple
    execSync(`pdftoppm -png -r 72 "${inputPath}" "${join(dir, 'page')}"`, { timeout: 30000 })

    const files = readdirSync(dir)
      .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const an = parseInt(a.replace(/\D/g, ''), 10)
        const bn = parseInt(b.replace(/\D/g, ''), 10)
        return an - bn
      })

    const pages = files.map((f) => {
      const pagePath = join(dir, f)
      const page = parseInt(f.replace(/^page-/, '').replace(/\.png$/, ''), 10)
      const dims = execSync(`identify -format "%w %h" "${pagePath}"`, { encoding: 'utf-8' }).trim().split(' ')
      return {
        page,
        url: `/api/takeoff/image?session=${session}&page=${page}`,
        width: parseInt(dims[0], 10),
        height: parseInt(dims[1], 10),
      }
    })

    return Response.json({ session, pages })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to convert PDF' }, { status: 500 })
  }
}
