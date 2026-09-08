const NORMALIZED_MAX = 1000
const MARKER_HALF_SIZE = 5

function isFiniteNumber(value) {
  return Number.isFinite(Number(value))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function validDimensions(width, height) {
  return isFiniteNumber(width) && isFiniteNumber(height) && Number(width) > 0 && Number(height) > 0
}

export function pixelCenterToNormalizedBounds(x, y, width, height) {
  if (!validDimensions(width, height) || !isFiniteNumber(x) || !isFiniteNumber(y)) return null

  const normalizedX = (Number(x) / Number(width)) * NORMALIZED_MAX
  const normalizedY = (Number(y) / Number(height)) * NORMALIZED_MAX
  return {
    xmin: clamp(normalizedX - MARKER_HALF_SIZE, 0, NORMALIZED_MAX),
    xmax: clamp(normalizedX + MARKER_HALF_SIZE, 0, NORMALIZED_MAX),
    ymin: clamp(normalizedY - MARKER_HALF_SIZE, 0, NORMALIZED_MAX),
    ymax: clamp(normalizedY + MARKER_HALF_SIZE, 0, NORMALIZED_MAX),
  }
}

export function autoscanItemToPixel(item, width, height) {
  if (!validDimensions(width, height) || !item) return null

  let x
  let y
  if (isFiniteNumber(item.x) && isFiniteNumber(item.y)) {
    x = Number(item.x)
    y = Number(item.y)
  } else if (
    isFiniteNumber(item.xmin) &&
    isFiniteNumber(item.xmax) &&
    isFiniteNumber(item.ymin) &&
    isFiniteNumber(item.ymax)
  ) {
    x = ((Number(item.xmin) + Number(item.xmax)) / 2 / NORMALIZED_MAX) * Number(width)
    y = ((Number(item.ymin) + Number(item.ymax)) / 2 / NORMALIZED_MAX) * Number(height)
  } else {
    return null
  }

  return {
    x: clamp(x, 0, Number(width)),
    y: clamp(y, 0, Number(height)),
  }
}

export { NORMALIZED_MAX }
