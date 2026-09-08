import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const MAX_DIM = 100
const MIN_DIM = 4
const MAX_ASPECT = 6
const MERGE_EXPAND = 10

function parseComponents(out) {
  const blobs = []
  for (const line of out.split('\n')) {
    const match = line.match(/(\d+)x(\d+)\+(\d+)\+(\d+)\s+([\d.]+),([\d.]+)\s+(\d+)\s+gray\((\d+)\)/)
    if (!match) continue
    blobs.push({
      w: Number(match[1]),
      h: Number(match[2]),
      x: Number(match[3]),
      y: Number(match[4]),
      cx: Number(match[5]),
      cy: Number(match[6]),
      area: Number(match[7]),
      gray: Number(match[8]),
    })
  }
  return blobs
}

function mergeNearby(blobs) {
  const parent = blobs.map((_, index) => index)
  const find = (index) => (parent[index] === index ? index : (parent[index] = find(parent[index])))
  const overlaps = (a, b) =>
    a.x - MERGE_EXPAND <= b.x + b.w + MERGE_EXPAND &&
    b.x - MERGE_EXPAND <= a.x + a.w + MERGE_EXPAND &&
    a.y - MERGE_EXPAND <= b.y + b.h + MERGE_EXPAND &&
    b.y - MERGE_EXPAND <= a.y + a.h + MERGE_EXPAND

  for (let i = 0; i < blobs.length; i++) {
    for (let j = i + 1; j < blobs.length; j++) {
      if (overlaps(blobs[i], blobs[j])) parent[find(i)] = find(j)
    }
  }

  const groups = new Map()
  blobs.forEach((blob, index) => {
    const root = find(index)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(blob)
  })

  return [...groups.values()].map((members) => {
    const area = members.reduce((sum, blob) => sum + blob.area, 0)
    const x = Math.min(...members.map((blob) => blob.x))
    const y = Math.min(...members.map((blob) => blob.y))
    return {
      x,
      y,
      w: Math.max(...members.map((blob) => blob.x + blob.w)) - x,
      h: Math.max(...members.map((blob) => blob.y + blob.h)) - y,
      cx: members.reduce((sum, blob) => sum + blob.cx * blob.area, 0) / area,
      cy: members.reduce((sum, blob) => sum + blob.cy * blob.area, 0) / area,
      area,
    }
  })
}

export function getTakeoffPage(session, page) {
  if (typeof session !== 'string' || !/^[\w-]+$/.test(session)) {
    const error = new Error('Invalid session')
    error.status = 400
    throw error
  }

  const pageNumber = Number(page)
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    const error = new Error('Invalid page')
    error.status = 400
    throw error
  }

  const imagePath = join(tmpdir(), `takeoff-${session}`, `page-${pageNumber}.png`)
  if (!existsSync(imagePath)) {
    const error = new Error('Blueprint page image not found')
    error.status = 404
    throw error
  }

  const dimensions = execFileSync('identify', ['-format', '%w %h', imagePath], {
    encoding: 'utf-8',
    timeout: 10000,
  }).trim().split(' ')

  return {
    imagePath,
    page: pageNumber,
    width: Number(dimensions[0]),
    height: Number(dimensions[1]),
  }
}

export function findCandidates(imagePath) {
  const out = execFileSync(
    'convert',
    [
      imagePath,
      '-colorspace',
      'Gray',
      '-threshold',
      '60%',
      '-define',
      'connected-components:verbose=true',
      '-connected-components',
      '8',
      'null:',
    ],
    { encoding: 'utf-8', timeout: 30000 }
  )
  const ink = parseComponents(out).filter((blob) => blob.gray === 0 && blob.area >= 30)
  const wall = ink.reduce(
    (best, blob) => (blob.w * blob.h > (best?.w ?? 0) * (best?.h ?? 0) ? blob : best),
    null
  )
  const merged = mergeNearby(ink.filter((blob) => Math.max(blob.w, blob.h) <= 140))
  const shaped = merged.filter((blob) => {
    const minDim = Math.min(blob.w, blob.h)
    const maxDim = Math.max(blob.w, blob.h)
    return minDim > MIN_DIM && maxDim <= MAX_DIM && maxDim / minDim <= MAX_ASPECT
  })
  const inside = wall
    ? shaped.filter(
        (blob) =>
          blob.cx > wall.x &&
          blob.cx < wall.x + wall.w &&
          blob.cy > wall.y &&
          blob.cy < wall.y + wall.h
      )
    : shaped
  const contains = (outer, blob) =>
    outer !== blob &&
    outer.x <= blob.x &&
    outer.y <= blob.y &&
    outer.x + outer.w >= blob.x + blob.w &&
    outer.y + outer.h >= blob.y + blob.h &&
    outer.w * outer.h > blob.w * blob.h

  return inside.filter((blob) => !inside.some((outer) => contains(outer, blob)))
}

export function addMarkers(sourcePath, destinationPath, candidates) {
  const circles = candidates
    .map((candidate) => `circle ${candidate.cx},${candidate.cy} ${candidate.cx},${candidate.cy + 10}`)
    .join(' ')
  const labels = candidates
    .map((candidate, index) => `text ${candidate.cx - 4},${candidate.cy - 14} '${index + 1}'`)
    .join(' ')

  execFileSync(
    'convert',
    [
      sourcePath,
      '-stroke',
      '#e11d48',
      '-strokewidth',
      '2',
      '-fill',
      'none',
      '-draw',
      circles,
      '-stroke',
      'none',
      '-fill',
      '#e11d48',
      '-font',
      'DejaVu-Sans',
      '-pointsize',
      '14',
      '-draw',
      labels,
      destinationPath,
    ],
    { timeout: 30000 }
  )
}
