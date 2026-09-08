export const PROJECT_SCHEMA_VERSION = 1

const PROJECT_STATUSES = new Set(['active', 'archived'])
const PROJECT_TRADES = new Set(['MEP', 'Plumbing', 'Electrical', 'HVAC', 'General'])

function text(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function isoDate(value, fallback) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

export function normalizeEstimateItem(item = {}) {
  const qty = number(item.qty, 1)
  const price = number(item.price)
  const labor = number(item.labor)
  return {
    ...item,
    name: text(item.name, 'Unnamed Item'),
    size: text(item.size),
    unit: text(item.unit, 'each'),
    category: text(item.category, 'General'),
    qty,
    price,
    labor,
    total: qty * price,
    laborTotal: qty * labor,
    manual: Boolean(item.manual),
  }
}

export function createProject(input = {}, now = new Date().toISOString()) {
  const timestamp = isoDate(now, new Date().toISOString())
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: text(input.id) || crypto.randomUUID(),
    name: text(input.name, 'Untitled Project'),
    client: text(input.client),
    address: text(input.address),
    trade: PROJECT_TRADES.has(input.trade) ? input.trade : 'MEP',
    status: PROJECT_STATUSES.has(input.status) ? input.status : 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    estimate: {
      items: Array.isArray(input.estimate?.items) ? input.estimate.items.map(normalizeEstimateItem) : [],
      category: text(input.estimate?.category, 'General'),
      autoAccessories: input.estimate?.autoAccessories !== false,
    },
  }
}

export function normalizeProject(input = {}) {
  const created = createProject(input, input.createdAt)
  return {
    ...created,
    updatedAt: isoDate(input.updatedAt, created.createdAt),
  }
}

export function updateProject(project, changes = {}, now = new Date().toISOString()) {
  return normalizeProject({
    ...project,
    ...changes,
    estimate: changes.estimate ? { ...project.estimate, ...changes.estimate } : project.estimate,
    id: project.id,
    createdAt: project.createdAt,
    updatedAt: now,
  })
}

export function serializeProject(project) {
  return JSON.stringify(normalizeProject(project), null, 2)
}

export function parseProjectBackup(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid project backup')
  const project = normalizeProject(parsed)
  return {
    ...project,
    id: crypto.randomUUID(),
    name: `${project.name} (Imported)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function csvCell(value) {
  const content = String(value ?? '')
  return /[",\n]/.test(content) ? `"${content.replace(/"/g, '""')}"` : content
}

export function projectToCsv(project) {
  const normalized = normalizeProject(project)
  const rows = [
    ['Project', normalized.name],
    ['Client', normalized.client],
    ['Address', normalized.address],
    ['Trade', normalized.trade],
    [],
    ['Item', 'Category', 'Size', 'Unit', 'Quantity', 'Unit Price', 'Labor Hours', 'Material Total', 'Labor Total'],
    ...normalized.estimate.items.map((item) => [
      item.name,
      item.category,
      item.size,
      item.unit,
      item.qty,
      item.price.toFixed(2),
      item.labor.toFixed(2),
      item.total.toFixed(2),
      item.laborTotal.toFixed(2),
    ]),
  ]
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}
