import { readFileSync } from 'fs'
import { join } from 'path'
import { TAX_RATE } from '../../../lib/utils'

const CATALOG = JSON.parse(readFileSync(join(process.cwd(), 'public/data/catalog.json'), 'utf-8'))

const RULES = [
  {
    category: 'Plumbing',
    test: /toilet/i,
    deps: [
      { name: 'Wax Ring with Bolts', size: 'Standard', qty: 'main' },
      { name: 'Toilet Bolts - Brass Pair', qty: 'main' },
      { name: 'Angle Stop Valve', size: '1/2 inch', qty: 'main' },
      { name: 'Braided Supply Line - 3/8 inch x 12 inch', qty: 'main' },
    ],
  },
  {
    category: 'Plumbing',
    test: /water heater|tankless|indirect water heater|hybrid heat pump water heater/i,
    deps: [
      { name: 'Expansion Tank', size: '4.5 Gallon', qty: 'main' },
      { name: 'Ball Valve - Brass Full Port', size: '3/4 inch', qty: 'main' },
      { name: 'Dielectric Union', size: '3/4 inch', qty: 'main' },
      { name: 'Flexible Braided Stainless Connector', size: '3/4 inch x 18 inch', qty: 'main' },
      { name: 'Teflon Tape', size: '1/2 inch x 520 inch', qty: 'main' },
    ],
  },
  {
    category: 'Plumbing',
    test: /sink|lavatory/i,
    deps: [
      { name: 'Faucet', qty: 'main' },
      { name: 'Angle Stop Valve', size: '1/2 inch', qty: 'main' },
      { name: 'Braided Supply Line - 3/8 inch x 12 inch', qty: 'main' },
      { name: 'P-Trap - PVC', size: '1-1/2 inch', qty: 'main' },
      { name: 'Silicone Caulk', qty: 'main' },
    ],
  },
  {
    category: 'Plumbing',
    test: /copper pipe|copper tubing|copper/i,
    deps: [
      { name: 'Solder - Lead Free', size: '1 lb', qty: 1 },
      { name: 'Flux - 4 oz', qty: 1 },
      { name: '90 Degree Elbow - Copper', size: '1/2 inch', qty: 1 },
    ],
  },
  {
    category: 'Drywall',
    test: /drywall|sheetrock/i,
    deps: [
      { name: 'Joint Tape', qty: 1 },
      { name: 'Pre-Mixed Joint Compound', qty: 1 },
      { name: 'Drywall Screws', qty: 1 },
    ],
  },
  {
    category: 'Paint',
    test: /paint|primer/i,
    deps: [
      { name: 'Latex Primer', qty: 1 },
      { name: 'Brushes', qty: 1 },
      { name: 'Rollers', qty: 1 },
      { name: 'Painters Tape', qty: 1 },
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

  return score
}

function findCatalogItem(name, sizeHint = '') {
  let best = null
  let bestScore = 0
  for (const item of CATALOG) {
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

export async function POST(request) {
  try {
    const body = await request.json()
    const rawItems = Array.isArray(body.items) ? body.items : []
    const autoAccessories = body.autoAccessories !== false
    const category = body.category || 'Plumbing'

    const withDeps = autoIncludeDependencies(rawItems, autoAccessories, category)
    const enriched = enrichWithPricing(withDeps)

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
