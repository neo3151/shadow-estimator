import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { mkdirSync, readdirSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectScaleFromImage } from '../../../../lib/autoScale'

// Allow up to 3 minutes for large architectural PDF conversion
export const maxDuration = 180

const DEFAULT_SCALE = { scaleText: '1/4" = 1\'-0" (Default)', pixelsPerFoot: 18.0 }

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

    const fileMB = statSync(inputPath).size / (1024 * 1024)
    let pageCount = 1
    try {
      const info = execSync(`pdfinfo "${inputPath}"`, { encoding: 'utf-8', timeout: 10000 })
      const m = info.match(/Pages:\s+(\d+)/)
      if (m) pageCount = parseInt(m[1], 10)
    } catch {
      // pdfinfo unavailable
    }

    // Architectural plan sets are huge (24x36 sheets). Keep conversion tight:
    // - large files: first 6 pages at 72dpi
    // - small files: all pages (cap 12) at 100dpi
    const isLarge = fileMB > 1.5 || pageCount > 6
    const MAX_PAGES = isLarge ? 6 : 12
    const dpi = isLarge ? 72 : 100
    const lastPage = Math.min(pageCount, MAX_PAGES)

    // Budget ~5s/page + 20s base, max 90s. Never allow multi-minute hangs.
    const timeoutMs = Math.min(90000, 5000 * lastPage + 20000)
    const outPrefix = join(dir, 'page')
    const convertCmd = `pdftoppm -png -r ${dpi} -f 1 -l ${lastPage} "${inputPath}" "${outPrefix}"`

    try {
      execSync(convertCmd, { timeout: timeoutMs })
    } catch (convErr) {
      // Fallback: page 1 only at 72dpi
      try {
        execSync(`pdftoppm -png -r 72 -f 1 -l 1 "${inputPath}" "${outPrefix}"`, { timeout: 30000 })
      } catch {
        return Response.json(
          {
            error: `Failed to convert PDF (${pageCount} pages, ${fileMB.toFixed(1)}MB): ${convErr.message}`,
          },
          { status: 500 }
        )
      }
    }

    const files = readdirSync(dir)
      .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const an = parseInt(a.replace(/\D/g, ''), 10)
        const bn = parseInt(b.replace(/\D/g, ''), 10)
        return an - bn
      })

    if (files.length === 0) {
      return Response.json({ error: 'PDF conversion produced no page images' }, { status: 500 })
    }

    // Scale detection: only hit Gemini on the FIRST page of small PDFs.
    // Parallel Gemini on 20 giant blueprint pages was the real timeout source.
    let firstPageScale = null
    if (!isLarge && files.length > 0) {
      try {
        firstPageScale = await detectScaleFromImage(join(dir, files[0]))
      } catch {
        firstPageScale = null
      }
    }
    const scale = firstPageScale || DEFAULT_SCALE

    const pages = files.map((f) => {
      const pagePath = join(dir, f)
      const page = parseInt(f.replace(/^page-/, '').replace(/\.png$/, ''), 10)
      const dims = execSync(`identify -format "%w %h" "${pagePath}"`, {
        encoding: 'utf-8',
        timeout: 10000,
      })
        .trim()
        .split(' ')
      return {
        page,
        url: `/api/takeoff/image?session=${session}&page=${page}`,
        width: parseInt(dims[0], 10),
        height: parseInt(dims[1], 10),
        scaleText: scale.scaleText,
        pixelsPerFoot: scale.pixelsPerFoot,
      }
    })

    return Response.json({
      session,
      pages,
      truncated: pageCount > MAX_PAGES ? { shown: pages.length, total: pageCount } : null,
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to convert PDF' }, { status: 500 })
  }
}
