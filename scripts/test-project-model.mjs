#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  createProject,
  normalizeEstimateItem,
  parseProjectBackup,
  projectToCsv,
  serializeProject,
  updateProject,
} from '../src/lib/projectModel.mjs'

const now = '2026-08-23T12:00:00.000Z'
const project = createProject({
  id: 'project-1',
  name: ' Clinic MEP ',
  client: 'Northwind',
  trade: 'MEP',
  estimate: {
    category: 'Plumbing',
    autoAccessories: true,
    items: [{ name: 'Sink, Commercial', qty: 2, price: 120.5, labor: 0.75 }],
  },
}, now)

assert.equal(project.name, 'Clinic MEP')
assert.equal(project.createdAt, now)
assert.equal(project.estimate.items[0].total, 241)
assert.equal(project.estimate.items[0].laborTotal, 1.5)
assert.deepEqual(normalizeEstimateItem({ name: 'Pipe', qty: -2, price: 'bad' }).qty, 1)

const updated = updateProject(project, { client: 'Contoso' }, '2026-08-24T12:00:00.000Z')
assert.equal(updated.client, 'Contoso')
assert.equal(updated.id, project.id)
assert.equal(updated.createdAt, project.createdAt)
assert.equal(updated.updatedAt, '2026-08-24T12:00:00.000Z')

const csv = projectToCsv(project)
assert.match(csv, /"Sink, Commercial"/)
assert.match(csv, /241\.00/)

const imported = parseProjectBackup(serializeProject(project))
assert.notEqual(imported.id, project.id)
assert.equal(imported.name, 'Clinic MEP (Imported)')
assert.equal(imported.estimate.items.length, 1)

console.log('Project model checks passed.')
