#!/usr/bin/env node
/**
 * Diagnose why the AI auto-scan misses fixtures.
 *
 * Renders a test plan PDF at 72dpi (same as /api/takeoff/convert), calls
 * /api/takeoff/autoscan with debug:true RUNS times, and scores detections
 * against the known fixture centers. Attributes every miss to a pipeline
 * stage: phase1 (Gemini never proposed it), dedupe (merged with another
 * detection), or position drift (proposed but landed too far away).
 *
 * Usage:
 *   node scripts/diagnose-autoscan.mjs [complex|simple] [--runs N] [--port P]
 */
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { autoscanItemToPixel } from '../src/lib/autoscanCoordinates.mjs'

// Expected fixture centers in 72dpi top-down pixels (1pt = 1px), from
// scripts/generate-complex-plan.py.
const PLANS = {
  complex: {
    pdf: 'public/test-plan-complex.pdf',
    expected: [
      { name: 'Toilet (Bath 1)', x: 120, y: 250 },
      { name: 'Sink (Bath 1)', x: 195, y: 245 },
      { name: 'Bathtub (Bath 1)', x: 130, y: 340 },
      { name: 'Toilet (Bath 2)', x: 280, y: 250 },
      { name: 'Sink (Bath 2)', x: 355, y: 245 },
      { name: 'Shower (Bath 2)', x: 335, y: 335 },
      { name: 'Double Sink (Kitchen)', x: 435, y: 240 },
      { name: 'Water Heater (Kitchen)', x: 500, y: 250 },
      { name: 'Washer (Kitchen)', x: 495, y: 345 },
    ],
  },
  simple: {
    pdf: 'public/test-plan.pdf',
    // Centroids measured from the rendered page (see diagnose runs).
    expected: [
      { name: 'Blue Rect', x: 112, y: 462 },
      { name: 'Orange Rect', x: 328, y: 462 },
      { name: 'Toilet', x: 99, y: 615 },
      { name: 'Purple Rect', x: 175, y: 615 },
    ],
  },
}

const MATCH_TOL = 15 // px: detection -> expected fixture
const PHASE1_TOL = 40 // px: Gemini rough guess -> expected fixture (rough guesses are loose)

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { plan: 'complex', runs: 5, port: 3002 }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--runs') opts.runs = Number(args[++i])
    else if (args[i] === '--port') opts.port = Number(args[++i])
    else opts.plan = args[i]
  }
  if (!PLANS[opts.plan]) {
    console.error(`Unknown plan "${opts.plan}". Expected one of: ${Object.keys(PLANS).join(', ')}`)
    process.exit(1)
  }
  return opts
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/** Convert an autoscan item to source-image pixel coordinates. */
function itemToPx(item, width, height) {
  const point = autoscanItemToPixel(item, width, height)
  return point ? { name: item.name, ...point } : null
}

async function main() {
  const opts = parseArgs()
  const plan = PLANS[opts.plan]

  // 1. Render the PDF exactly like /api/takeoff/convert does.
  const session = randomUUID()
  const dir = join(tmpdir(), `takeoff-${session}`)
  mkdirSync(dir, { recursive: true })
  const pdfPath = join(process.cwd(), plan.pdf)
  execSync(`pdftoppm -png -r 72 "${pdfPath}" "${join(dir, 'page')}"`, { timeout: 30000 })
  const imagePath = join(dir, 'page-1.png')
  const [width, height] = execSync(`identify -format "%w %h" "${imagePath}"`, { encoding: 'utf-8' })
    .trim()
    .split(' ')
    .map(Number)
  console.log(`Plan: ${opts.plan} (${pdfPath})`)
  console.log(`Rendered: ${imagePath} (${width}x${height})`)
  console.log(`Server: http://localhost:${opts.port}  Runs: ${opts.runs}\n`)

  const runs = []
  for (let run = 1; run <= opts.runs; run++) {
    let data = null
    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = await fetch(`http://localhost:${opts.port}/api/takeoff/autoscan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, page: 1, debug: true }),
        signal: AbortSignal.timeout(120000),
      })
      data = await res.json()
      if (res.ok) break
      const transient = res.status === 500 && String(data.error || '').match(/503|UNAVAILABLE|high demand/i)
      if (!transient || attempt === 4) {
        console.error(`Run ${run}: API error ${res.status}:`, data)
        process.exit(1)
      }
      const wait = attempt * 15
      console.log(`Run ${run}: Gemini unavailable (attempt ${attempt}/4), retrying in ${wait}s...`)
      await new Promise((r) => setTimeout(r, wait * 1000))
    }
    if (!data.debug) {
      console.error(`Run ${run}: no debug field in response — is the dev server running the latest code?`)
      process.exit(1)
    }
    runs.push(data)
    process.stdout.write(`Run ${run}/${opts.runs} done (${data.items.length} detections)\r`)
  }
  console.log('\n')

  // 2. Score each run.
  const expected = plan.expected
  const hitCounts = expected ? new Map(expected.map((e) => [e.name, 0])) : null
  const stageMisses = { phase1: 0, dedupe: 0, drift: 0 }
  let totalFalsePositives = 0

  runs.forEach((data, i) => {
    const converted = data.items.map((it) => itemToPx(it, width, height))
    const invalidCoordinates = converted.filter((point) => !point).length
    const detections = converted.filter(Boolean)
    const outOfBounds = detections.filter((point) => point.x < 0 || point.x > width || point.y < 0 || point.y > height).length
    const candidates = data.debug.candidates || []
    const dropped = data.debug.dropped || []

    console.log(`=== Run ${i + 1}: ${detections.length} detections, ${candidates.length} candidates, ${dropped.length} rejected, ${invalidCoordinates} invalid, ${outOfBounds} out of bounds ===`)

    if (!expected) {
      for (const d of detections) console.log(`  ${d.name} @ (${d.x.toFixed(0)}, ${d.y.toFixed(0)})`)
      return
    }

    // False positives: detections with no expected fixture nearby.
    const fps = detections.filter((d) => !expected.some((e) => dist(d, e) < MATCH_TOL))
    totalFalsePositives += fps.length

    for (const e of expected) {
      const hit = detections.find((d) => dist(d, e) < MATCH_TOL)
      if (hit) {
        hitCounts.set(e.name, hitCounts.get(e.name) + 1)
        console.log(`  HIT   ${e.name} <- "${hit.name}" @ (${hit.x.toFixed(0)}, ${hit.y.toFixed(0)}) err ${dist(hit, e).toFixed(1)}px`)
        continue
      }
      // Miss: attribute to a stage.
      let stage
      const proposed = candidates.some((c) => dist(c, e) < PHASE1_TOL)
      if (!proposed) {
        stage = 'proposal (blob never detected)'
        stageMisses.phase1++
      } else if (dropped.some((d) => dist(d, e) < MATCH_TOL + 10)) {
        stage = `classification (rejected: "${dropped.find((d) => dist(d, e) < MATCH_TOL + 10).reason}")`
        stageMisses.dedupe++
      } else {
        stage = 'classification (candidate kept but no item emitted)'
        stageMisses.drift++
      }
      console.log(`  MISS  ${e.name} — ${stage}`)
    }

    for (const fp of fps) {
      console.log(`  FALSE+ "${fp.name}" @ (${fp.x.toFixed(0)}, ${fp.y.toFixed(0)}) — classification accepted a distractor`)
    }
    for (const d of dropped) {
      const legit = expected.some((e) => dist(d, e) < MATCH_TOL)
      console.log(`  REJ   #${d.n} @ (${d.x.toFixed(0)}, ${d.y.toFixed(0)}) "${d.reason}"${legit ? ' — WRONG, this is a real fixture!' : ''}`)
    }
    console.log('')
  })

  // 3. Summary.
  console.log('=== SUMMARY ===')
  if (expected) {
    for (const e of expected) {
      console.log(`  ${e.name}: ${hitCounts.get(e.name)}/${opts.runs} runs detected`)
    }
    console.log(
      `\nMiss attribution: proposal=${stageMisses.phase1}  classification-rejected=${stageMisses.dedupe}  other=${stageMisses.drift}`
    )
  }
  console.log(`False positives across all runs: ${totalFalsePositives}`)

  rmSync(dir, { recursive: true, force: true })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
