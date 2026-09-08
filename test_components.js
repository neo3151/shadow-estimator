const { execSync } = require('child_process');
const { join } = require('path');
const { tmpdir } = require('os');

const session = '5ac84082-d19b-4e9e-833c-eb1605e18e31';
const imagePath = join(tmpdir(), `takeoff-${session}`, `page-1.png`);

function parseComponents(out) {
  const blobs = []
  for (const line of out.split('\n')) {
    const m = line.match(/(\d+)x(\d+)\+(\d+)\+(\d+)\s+([\d.]+),([\d.]+)\s+(\d+)\s+gray\((\d+)\)/)
    if (!m) continue
    blobs.push({
      w: Number(m[1]),
      h: Number(m[2]),
      x: Number(m[3]),
      y: Number(m[4]),
      cx: Number(m[5]),
      cy: Number(m[6]),
      area: Number(m[7]),
      gray: Number(m[8]),
    })
  }
  return blobs
}

const MERGE_EXPAND = 2; // Smaller expand so wall lines don't swallow fixtures
function mergeNearby(blobs) {
  const parent = blobs.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
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
  blobs.forEach((b, i) => {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(b)
  })

  return [...groups.values()].map((members) => {
    const area = members.reduce((s, b) => s + b.area, 0)
    return {
      x: Math.min(...members.map((b) => b.x)),
      y: Math.min(...members.map((b) => b.y)),
      w: Math.max(...members.map((b) => b.x + b.w)) - Math.min(...members.map((b) => b.x)),
      h: Math.max(...members.map((b) => b.y + b.h)) - Math.min(...members.map((b) => b.y)),
      cx: members.reduce((s, b) => s + b.cx * b.area, 0) / area,
      cy: members.reduce((s, b) => s + b.cy * b.area, 0) / area,
      area,
      count: members.length
    }
  })
}

const out = execSync(
  `convert "${imagePath}" -colorspace Gray -threshold 60% ` +
    `-define connected-components:verbose=true -connected-components 8 null:`,
  { encoding: 'utf-8', timeout: 30000 }
)
const ink = parseComponents(out).filter((b) => b.gray === 0 && b.area >= 30)

// Separate wall lines (long dimensions) from candidate symbols BEFORE merging
const wallCandidate = ink.find((b) => b.w * b.h > 50000) || ink[0]
const nonWalls = ink.filter((b) => Math.max(b.w, b.h) <= 120)

const merged = mergeNearby(nonWalls)
console.log("Filtered & Merged blobs count:", merged.length)
merged.forEach((b, i) => {
  console.log(`  Candidate ${i+1}: ${b.w}x${b.h} at (${Math.round(b.cx)},${Math.round(b.cy)}), area=${b.area}`)
})
