function clamp(v) {
  return Math.max(0, Math.min(100, Number(v)));
}

export function clampPosition(v) {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n) : 50;
}

export function getObjectPositionXY(x, y) {
  return `${clampPosition(x)}% ${clampPosition(y)}%`;
}

// Backward compat: converts old preset string to XY
const PRESET_TO_XY = {
  center: { x: 50, y: 50 },
  top:    { x: 50, y:  0 },
  bottom: { x: 50, y: 100 },
  left:   { x:  0, y: 50 },
  right:  { x: 100, y: 50 },
};

export function normalizeImagePositionXY(x, y, legacyPreset) {
  const nx = Number(x);
  const ny = Number(y);
  if (Number.isFinite(nx) && Number.isFinite(ny)) {
    return { x: clamp(nx), y: clamp(ny) };
  }
  if (legacyPreset && PRESET_TO_XY[String(legacyPreset).toLowerCase()]) {
    return PRESET_TO_XY[String(legacyPreset).toLowerCase()];
  }
  return { x: 50, y: 50 };
}
