#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  autoscanItemToPixel,
  pixelCenterToNormalizedBounds,
} from '../src/lib/autoscanCoordinates.mjs'

const width = 612
const height = 792
const center = pixelCenterToNormalizedBounds(306, 396, width, height)
assert.deepEqual(center, { xmin: 495, xmax: 505, ymin: 495, ymax: 505 })
assert.deepEqual(autoscanItemToPixel({ x: 306, y: 396 }, width, height), { x: 306, y: 396 })
assert.deepEqual(autoscanItemToPixel(center, width, height), { x: 306, y: 396 })

const edge = pixelCenterToNormalizedBounds(0, height, width, height)
assert.deepEqual(edge, { xmin: 0, xmax: 5, ymin: 995, ymax: 1000 })
const edgePoint = autoscanItemToPixel(edge, width, height)
assert.equal(edgePoint.x, 1.53)
assert.ok(Math.abs(edgePoint.y - 790.02) < 1e-9)
assert.deepEqual(autoscanItemToPixel({ x: -20, y: 900 }, width, height), { x: 0, y: height })
assert.equal(autoscanItemToPixel({ xmin: 'bad' }, width, height), null)
assert.equal(pixelCenterToNormalizedBounds(1, 1, 0, height), null)

console.log('Autoscan coordinate checks passed.')
