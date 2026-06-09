/**
 * Genera iconos PNG para PWA e iOS usando Node.js puro (sin dependencias).
 * Produce: public/icons/pwa-192x192.png, pwa-512x512.png, public/apple-touch-icon.png
 *
 * Correr con: node scripts/generate-icons.js
 */

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

// ── Rounded rect hit test ─────────────────────────────────────────────────────
function inRoundedRect(px, py, w, h, r) {
  if (px < 0 || px >= w || py < 0 || py >= h) return false;
  const x1 = r, y1 = r, x2 = w - r, y2 = h - r;
  if (px < x1 && py < y1 && (px - x1) ** 2 + (py - y1) ** 2 > r * r) return false;
  if (px >= x2 && py < y1 && (px - x2) ** 2 + (py - y1) ** 2 > r * r) return false;
  if (px < x1 && py >= y2 && (px - x1) ** 2 + (py - y2) ** 2 > r * r) return false;
  if (px >= x2 && py >= y2 && (px - x2) ** 2 + (py - y2) ** 2 > r * r) return false;
  return true;
}

// ── Generate PNG ──────────────────────────────────────────────────────────────
function generatePNG(size, { radius, bg, accent, glowAlpha = 0.18 }) {
  const [br, bg_, bb] = bg;
  const [ar, ag, ab] = accent;
  const cx = size / 2, cy = size / 2;
  const innerR = size * 0.28;   // inner circle for the mark

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4;
      if (!inRoundedRect(x, y, size, size, radius)) {
        row[i + 3] = 0; // transparent outside
        continue;
      }

      // Distance from center — used for vignette/glow
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / (size * 0.5);

      // Base background with subtle gradient (dark top → darker bottom)
      const grad = 1 - dist * 0.3;
      let r = Math.round(br * grad);
      let g = Math.round(bg_ * grad);
      let b = Math.round(bb * grad);

      // Accent glow ring near the border
      const borderDist = Math.abs(dist - 0.92);
      if (borderDist < 0.06) {
        const t = 1 - borderDist / 0.06;
        const alpha = t * glowAlpha;
        r = Math.round(r * (1 - alpha) + ar * alpha);
        g = Math.round(g * (1 - alpha) + ag * alpha);
        b = Math.round(b * (1 - alpha) + ab * alpha);
      }

      // ── Draw "oX" letters ────────────────────────────────────────────────
      // Normalise to [-1, 1] space
      const nx = (x - cx) / (size * 0.46);
      const ny = (y - cy) / (size * 0.46);

      // "o" — circle on the left  (center: -0.28, 0)
      const oCx = -0.30, oCy = 0;
      const oOuter = 0.30, oInner = 0.17;
      const oDist = Math.sqrt((nx - oCx) ** 2 + (ny - oCy) ** 2);
      const inO = oDist >= oInner && oDist <= oOuter;

      // "X" — two diagonal strokes on the right (center: +0.28, 0)
      const xCx = 0.30, xCy = 0;
      const lnx = nx - xCx, lny = ny - xCy;
      const strokeW = 0.075;
      const maxExtent = 0.28;
      const inX1 = Math.abs(lnx - lny) < strokeW && Math.abs(lnx) < maxExtent;
      const inX2 = Math.abs(lnx + lny) < strokeW && Math.abs(lnx) < maxExtent;
      const inX = inX1 || inX2;

      if (inO || inX) {
        // Blend accent color
        const blendT = 0.92;
        r = Math.round(r * (1 - blendT) + ar * blendT);
        g = Math.round(g * (1 - blendT) + ag * blendT);
        b = Math.round(b * (1 - blendT) + ab * blendT);
      }

      row[i]     = Math.min(255, Math.max(0, r));
      row[i + 1] = Math.min(255, Math.max(0, g));
      row[i + 2] = Math.min(255, Math.max(0, b));
      row[i + 3] = 255;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG sig
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const BRAND = {
  bg:     [2, 6, 23],         // #020617
  accent: [56, 189, 248],     // #38bdf8
};

const icons = [
  { size: 512,  radius: 144, file: "public/icons/pwa-512x512.png"  },
  { size: 192,  radius:  54, file: "public/icons/pwa-192x192.png"  },
  { size: 180,  radius:  40, file: "public/apple-touch-icon.png"   },
];

for (const { size, radius, file } of icons) {
  const outPath = path.join(__dirname, "..", file);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const png = generatePNG(size, { radius, ...BRAND });
  fs.writeFileSync(outPath, png);
  console.log(`✓ ${file} (${size}×${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}
