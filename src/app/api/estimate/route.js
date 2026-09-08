import { readFileSync } from 'fs'
import { join } from 'path'
import { TAX_RATE } from '../../../lib/utils'

const CATALOG = JSON.parse(readFileSync(join(process.cwd(), 'public/data/catalog.json'), 'utf-8'))

const RULES = [
  {
    category: 'Electrical',
    test: /receptacle|outlet|gfci|duplex|quad/i,
    deps: [
      { name: '4 in. Square Box 1-1/2 in. Deep', size: '4 in. x 4 in. Metallic Steel J-Box', qty: 'main' },
      { name: 'Single-Gang Mud Ring 1/2 in.', size: '4 in. Square to 1-Gang 1/2 in. Raised', qty: 'main' },
      { name: '1-Gang Nylon Wallplate', size: 'Single Gang Duplex/Toggle Plate White', qty: 'main' },
      { name: 'Wire Nut Connectors (Pack of 100)', size: 'Yellow / Red Wire Nuts #18 to #10 AWG', qty: 1 },
    ],
  },
  {
    category: 'Electrical',
    test: /switch|dimmer|sensor|motion/i,
    deps: [
      { name: '4 in. Square Box 1-1/2 in. Deep', size: '4 in. x 4 in. Metallic Steel J-Box', qty: 'main' },
      { name: 'Single-Gang Mud Ring 1/2 in.', size: '4 in. Square to 1-Gang 1/2 in. Raised', qty: 'main' },
      { name: '1-Gang Nylon Wallplate', size: 'Single Gang Duplex/Toggle Plate White', qty: 'main' },
      { name: 'Wire Nut Connectors (Pack of 100)', size: 'Yellow / Red Wire Nuts #18 to #10 AWG', qty: 1 },
    ],
  },
  {
    category: 'Electrical',
    test: /troffer|fixture|high-bay|downlight|strip/i,
    deps: [
      { name: 'Junction / Pull Box (J-Box)', size: '8x8x4 inch NEMA 1 Steel J-Box', qty: 1 },
      { name: 'Wire Nut Connectors (Pack of 100)', size: 'Yellow / Red Wire Nuts #18 to #10 AWG', qty: 1 },
    ],
  },
  {
    category: 'Electrical',
    test: /emt|conduit|pvc conduit/i,
    deps: [
      { name: 'EMT Set-Screw Connector 3/4 in.', size: '3/4 in. Steel Connector (Box of 25)', qty: 1 },
      { name: 'EMT Set-Screw Coupling 3/4 in.', size: '3/4 in. Steel Coupling (Box of 25)', qty: 1 },
      { name: 'Conduit Strap 1-Hole 3/4 in.', size: '3/4 in. Malleable Iron Strap', qty: 2 },
    ],
  },
  {
    category: 'Electrical',
    test: /panel|sub-panel|load center/i,
    deps: [
      { name: 'Grounding Rod & Clamp Kit', size: '5/8 in. x 8 ft Copper Bonded Rod + Clamp', qty: 1 },
      { name: 'THHN Copper Wire #12 AWG', size: '#12 Stranded Copper THHN 500ft Spool', qty: 10 },
      { name: 'Circuit Breaker 20A 1-Pole', size: '20 Amp 1-Pole 120V Standard Plug-on', qty: 4 },
    ],
  },
]

function scoreMatch(item, query, sizeHint) {
  const q = query.toLowerCase()
  const name = item.item_name.toLowerCase()
  const size = (item.size || '').toLowerCase()
  const h = (sizeHint || '').toLowerCase()
  const sizeMatches = size && h && (size === h || size.includes(h) || h.includes(size))
  let score = 0

  if (name === q) score += sizeMatches ? 150 : 80
  else if (name.startsWith(q + ' ')) score += sizeMatches ? 90 : 50
  else if (name.startsWith(q)) score += sizeMatches ? 70 : 40
  else if (name.includes(q)) score += sizeMatches ? 55 : 30
  else if (q.includes(name)) score += sizeMatches ? 35 : 10

  if (size && h) {
    if (size === h) score += 25
    else if (size.includes(h) || h.includes(size)) score += 12
  }

  if (score > 0 && item.price_status === 'priced') score += Number(item.source_priority) || 0
  return score
}

function findCatalogItem(name, sizeHint = '') {
  let best = null
  let bestScore = 0
  for (const item of CATALOG) {
    if (item.price_status === 'unpriced') continue
    const score = scoreMatch(item, name, sizeHint)
    if (score > bestScore) {
      bestScore = score
      best = item
    }
  }
  return best
}

function autoIncludeDependencies(items, autoAccessories, category) {
  if (!autoAccessories) return items

  const activeRules = category === 'General' ? RULES : RULES.filter((rule) => rule.category === category)
  const main = items.map((it) => ({ name: it.name, qty: Number(it.qty) || 1, size: it.size || '' }))
  const extras = new Map()

  for (const it of main) {
    for (const rule of activeRules) {
      if (rule.test.test(it.name)) {
        for (const dep of rule.deps) {
          const qty = dep.qty === 'main' ? it.qty : Number(dep.qty) || 1
          const key = dep.name + '|' + (dep.size || '')
          const existing = extras.get(key)
          if (existing) {
            existing.qty += qty
          } else {
            extras.set(key, { name: dep.name, size: dep.size || '', qty })
          }
        }
      }
    }
  }

  return [...main, ...extras.values()]
}

function enrichWithPricing(items) {
  return items.map((it) => {
    if (it.price !== undefined && it.price !== null && it.price !== '') {
      const price = Number(it.price) || 0
      const labor = Number(it.labor) || 0
      return {
        ...it,
        price,
        labor,
        total: Number(it.qty || 1) * price,
        laborTotal: Number(it.qty || 1) * labor,
      }
    }

    const match = findCatalogItem(it.name, it.size || '')
    if (match) {
      const price = Number(match.estimated_price_usd) || 0
      const labor = Number(match.labor_hours_per_unit) || 0
      return {
        ...it,
        id: match.id,
        name: match.item_name,
        size: match.size,
        unit: match.unit,
        category: match.category,
        source: match.source,
        sourceName: match.source_name,
        priceAsOf: match.price_as_of,
        priceConfidence: match.price_confidence,
        priceMin: match.price_min_usd,
        priceMax: match.price_max_usd,
        productKey: match.product_key,
        price,
        labor,
        total: Number(it.qty || 1) * price,
        laborTotal: Number(it.qty || 1) * labor,
        manual: false,
      }
    }

    return {
      ...it,
      price: 0,
      labor: 0,
      total: 0,
      laborTotal: 0,
      manual: true,
    }
  })
}

function consolidateItems(items) {
  const map = new Map()
  for (const it of items) {
    const key = (it.name || '').trim().toLowerCase() + '|' + (it.size || '').trim().toLowerCase()
    const qty = Number(it.qty) || 1
    if (map.has(key)) {
      map.get(key).qty += qty
    } else {
      map.set(key, { ...it, qty })
    }
  }
  return [...map.values()]
}

export async function POST(request) {
  try {
    const body = await request.json()
    const rawItems = Array.isArray(body.items) ? body.items : []
    const autoAccessories = body.autoAccessories !== false
    const category = body.category || 'Electrical'

    const consolidatedRaw = consolidateItems(rawItems)
    const withDeps = autoIncludeDependencies(consolidatedRaw, autoAccessories, category)
    const consolidatedAll = consolidateItems(withDeps)
    const enriched = enrichWithPricing(consolidatedAll)

    const subtotal = enriched.reduce((sum, it) => sum + (it.total || 0), 0)
    const laborTotal = enriched.reduce((sum, it) => sum + (it.laborTotal || 0), 0)
    const tax = subtotal * TAX_RATE
    const total = subtotal + tax

    return Response.json({
      items: enriched,
      category,
      subtotal,
      tax,
      total,
      laborTotal,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
