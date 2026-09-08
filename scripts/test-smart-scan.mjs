#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  canonicalSmartScanName,
  dedupeSmartDetections,
  normalizeSmartScanConfidence,
  normalizeSmartScanDocument,
  reconcileSmartScan,
} from '../src/lib/smartScan.mjs'

assert.equal(canonicalSmartScanName('Bathroom Sink'), 'sink')
assert.equal(canonicalSmartScanName('Electrical Outlet (Receptacle)'), 'electrical outlet')
assert.equal(canonicalSmartScanName('Washing Machine'), 'washer dryer')
assert.equal(normalizeSmartScanConfidence(1.4), 1)
assert.equal(normalizeSmartScanConfidence(-0.2), 0)
assert.equal(normalizeSmartScanConfidence('invalid'), 0.5)
assert.equal(dedupeSmartDetections([
  { name: 'Sink', x: 10, y: 10, confidence: 0.4 },
  { name: 'Bathroom Sink', x: 12, y: 12, confidence: 0.9 },
]).length, 1)

const items = reconcileSmartScan({
  page: 3,
  detections: [
    { name: 'Toilet', category: 'Plumbing', x: 10, y: 20, confidence: 0.7 },
    { name: 'Toilet', category: 'Plumbing', x: 11, y: 21, confidence: 0.9 },
    { name: 'Toilet', category: 'Plumbing', x: 30, y: 40, confidence: 0.8 },
    { name: 'Sink', category: 'Plumbing', x: 50, y: 60 },
    { name: 'Not a fixture', x: 70, y: 80 },
    { name: 'Missing position' },
  ],
  inventory: [
    { name: 'Toilet', category: 'Plumbing', qty: 2 },
    { name: 'Bathroom Sink', category: 'Plumbing', qty: 3 },
    { name: 'Copper Pipe', category: 'Plumbing', qty: 12, unit: 'per foot', size: '1/2 inch' },
    { name: 'Copper Pipe', category: 'Plumbing', qty: 3, unit: 'per foot' },
    { name: 'Invalid', qty: 0 },
    { name: 'Negative', qty: -5 },
  ],
})

assert.equal(items.length, 5)
assert.equal(items.filter((item) => item.source === 'smart-symbol').length, 3)
assert.equal(items.find((item) => item.name === 'Bathroom Sink').qty, 2)
assert.equal(items.find((item) => item.name === 'Copper Pipe').qty, 15)
assert.ok(items.every((item) => item.page === 3))
assert.ok(items.filter((item) => item.source === 'smart-symbol').every((item) => item.qty === 1))
assert.ok(items.every((item) => item.reviewStatus === 'pending'))
assert.equal(items.find((item) => item.name === 'Toilet').x, 11)
assert.equal(items.find((item) => item.name === 'Toilet').confidence, 0.9)
assert.equal(items.some((item) => item.name === 'Invalid'), false)
assert.equal(items.some((item) => item.name === 'Negative'), false)

assert.deepEqual(normalizeSmartScanDocument({
  title: ' A-101 ',
  scale: null,
  rooms: [' Kitchen ', '', 12],
  notes: [' Note one ', null],
}), {
  title: 'A-101',
  scale: '',
  rooms: ['Kitchen'],
  notes: ['Note one'],
})
assert.deepEqual(normalizeSmartScanDocument(null), { title: '', scale: '', rooms: [], notes: [] })

console.log('Smart Scan reconciliation checks passed.')
