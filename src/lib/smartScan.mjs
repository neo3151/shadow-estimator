const NAME_ALIASES = new Map([
  ['bathroom sink', 'sink'],
  ['lavatory', 'sink'],
  ['wash basin', 'sink'],
  ['double basin sink', 'double sink'],
  ['receptacle', 'electrical outlet'],
  ['electrical outlet receptacle', 'electrical outlet'],
  ['breaker box', 'panel board'],
  ['panel board breaker box', 'panel board'],
  ['air conditioning unit', 'ac unit'],
  ['washing machine', 'washer dryer'],
  ['washer', 'washer dryer'],
])

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function canonicalSmartScanName(value) {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
  return NAME_ALIASES.get(normalized) || normalized
}

function positiveQuantity(value, fallback = 0) {
  const quantity = Number(value)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : fallback
}

function normalizeCategory(value) {
  const category = cleanText(value)
  return category || 'General'
}

export function normalizeSmartScanConfidence(value, fallback = 0.5) {
  const confidence = Number(value)
  if (!Number.isFinite(confidence)) return fallback
  return Math.min(1, Math.max(0, confidence))
}

export function dedupeSmartDetections(detections = [], distance = 12) {
  return detections
    .map((item, index) => ({ ...item, index, confidence: normalizeSmartScanConfidence(item?.confidence) }))
    .filter((item) => {
      const name = cleanText(item?.name)
      return name && !/not a fixture/i.test(name) && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y))
    })
    .sort((a, b) => b.confidence - a.confidence || a.index - b.index)
    .filter((item, index, sorted) => !sorted.slice(0, index).some((kept) =>
      canonicalSmartScanName(kept.name) === canonicalSmartScanName(item.name) &&
      Math.hypot(Number(kept.x) - Number(item.x), Number(kept.y) - Number(item.y)) <= distance
    ))
    .sort((a, b) => a.index - b.index)
    .map(({ index, ...item }) => item)
}

export function reconcileSmartScan({ detections = [], inventory = [], page }) {
  const pageNumber = Number(page)
  const positionedCounts = new Map()
  const positioned = dedupeSmartDetections(detections).flatMap((item) => {
    const name = cleanText(item?.name)
    const x = Number(item?.x)
    const y = Number(item?.y)
    if (!name || /not a fixture/i.test(name) || !Number.isFinite(x) || !Number.isFinite(y)) return []

    const key = canonicalSmartScanName(name)
    positionedCounts.set(key, (positionedCounts.get(key) || 0) + 1)
    return [{
      name,
      category: normalizeCategory(item.category),
      qty: 1,
      size: cleanText(item.size),
      unit: cleanText(item.unit) || 'each',
      specs: cleanText(item.specs),
      confidence: normalizeSmartScanConfidence(item.confidence),
      reviewStatus: 'pending',
      x,
      y,
      page: pageNumber,
      source: 'smart-symbol',
    }]
  })

  const groupedInventory = new Map()
  for (const item of inventory) {
    const name = cleanText(item?.name)
    const quantity = positiveQuantity(item?.qty)
    if (!name || !quantity) continue
    const key = canonicalSmartScanName(name)
    const existing = groupedInventory.get(key)
    if (existing) {
      existing.qty += quantity
      existing.confidence = Math.max(existing.confidence, normalizeSmartScanConfidence(item.confidence))
      if (!existing.size) existing.size = cleanText(item.size)
      if (!existing.specs) existing.specs = cleanText(item.specs)
    } else {
      groupedInventory.set(key, {
        name,
        category: normalizeCategory(item.category),
        qty: quantity,
        size: cleanText(item.size),
        unit: cleanText(item.unit) || 'each',
        specs: cleanText(item.specs),
        confidence: normalizeSmartScanConfidence(item.confidence),
      })
    }
  }

  const unpositioned = []
  for (const [key, item] of groupedInventory) {
    const qty = Math.max(0, item.qty - (positionedCounts.get(key) || 0))
    if (!qty) continue
    unpositioned.push({
      ...item,
      qty,
      reviewStatus: 'pending',
      page: pageNumber,
      source: 'smart-inventory',
    })
  }

  return [...positioned, ...unpositioned]
}

export function normalizeSmartScanDocument(value) {
  const document = value && typeof value === 'object' ? value : {}
  return {
    title: cleanText(document.title),
    scale: cleanText(document.scale),
    rooms: Array.isArray(document.rooms) ? document.rooms.map(cleanText).filter(Boolean) : [],
    notes: Array.isArray(document.notes) ? document.notes.map(cleanText).filter(Boolean) : [],
  }
}
