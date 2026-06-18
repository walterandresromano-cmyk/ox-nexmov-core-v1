const KEY = "ox-vp-v1";
const TTL = 10 * 60 * 1000; // 10 min

export function saveVehiclePreview(vehicles) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ v: vehicles.slice(0, 8), t: Date.now() })
    );
  } catch { /* localStorage lleno o no disponible */ }
}

export function loadVehiclePreview() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    if (!Array.isArray(v) || v.length === 0) return null;
    if (Date.now() - t > TTL) return null;
    return v;
  } catch {
    return null;
  }
}
