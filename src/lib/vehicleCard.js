import { formatARS, formatKm } from "./formatters.js";

const SIZE = 1080;
const FONT = "system-ui, -apple-system, sans-serif";
const PAD  = 56;

const C = {
  bgTop:       "#0c1830",
  bgBot:       "#040a18",
  glow:        "rgba(56,189,248,0.10)",
  dimmer:      "rgba(4,10,24,0.38)",
  overlayMid:  "rgba(4,10,24,0)",
  overlayBot:  "rgba(4,10,24,0.88)",
  footerBg:    "rgba(4,8,20,0.95)",
  footerLine:  "rgba(56,189,248,0.20)",
  brand:       "rgba(56,189,248,0.95)",
  white:       "rgba(248,250,252,0.97)",
  muted:       "rgba(148,163,184,0.82)",
  priceBg:     "rgba(4,10,24,0.70)",
  priceBorder: "rgba(248,250,252,0.16)",
  accentLine:  "rgba(56,189,248,0.28)",
  warn:        "rgba(251,191,36,0.90)",
};

const FOOTER_H   = 96;
const BOTTOM_PAD = 30;

// ── helpers ───────────────────────────────────────────────────────────────────

function truncate(text, max) {
  if (!text) return "";
  const s = String(text).trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function isUnavailable(vehicle) {
  return (
    !vehicle.is_active ||
    vehicle.reserved ||
    vehicle.publication_status === "review" ||
    vehicle.publication_status === "paused"
  );
}

function buildFilename(vehicle) {
  const parts = [vehicle.brand, vehicle.model, vehicle.year]
    .filter(Boolean)
    .map((p) =>
      String(p).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    )
    .filter(Boolean);
  return `ox-nexmov-${parts.join("-") || "vehiculo"}.png`;
}

// Safe km: guards null, undefined, empty string, NaN, negative
function getKm(vehicle) {
  const raw = vehicle.km ?? vehicle.kilometers;
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (s === "") return "";
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "";
  return formatKm(n);
}

// Version must be at least 3 chars to avoid single-letter artefacts
function getVersion(vehicle) {
  const raw = String(vehicle.version || "").trim();
  if (raw.length < 3) return "";
  return truncate(raw, 36);
}

// ── round rect path ───────────────────────────────────────────────────────────

function buildRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// ── background layers ─────────────────────────────────────────────────────────

function drawFallbackBackground(ctx) {
  // diagonal gradient: deep navy top-left → near-black bottom-right
  const bg = ctx.createLinearGradient(0, 0, SIZE * 0.7, SIZE);
  bg.addColorStop(0, C.bgTop);
  bg.addColorStop(1, C.bgBot);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // subtle brand glow in top-left corner
  const glow = ctx.createRadialGradient(
    SIZE * 0.12, SIZE * 0.18, 0,
    SIZE * 0.12, SIZE * 0.18, SIZE * 0.52
  );
  glow.addColorStop(0, C.glow);
  glow.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawCoverImage(ctx, img) {
  const iw = img.naturalWidth  || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(SIZE / iw, SIZE / ih);
  const sw    = iw * scale;
  const sh    = ih * scale;
  ctx.drawImage(img, (SIZE - sw) / 2, (SIZE - sh) / 2, sw, sh);
}

// Light uniform dimming over vehicle photo for text contrast
function drawImageDimmer(ctx) {
  ctx.fillStyle = C.dimmer;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

// Gradient from mid-card to footer bottom — brand-tinted, not pure black
function drawOverlay(ctx) {
  const gradY0   = SIZE * 0.30;
  const gradY1   = SIZE - FOOTER_H;
  const grad     = ctx.createLinearGradient(0, gradY0, 0, gradY1);
  grad.addColorStop(0,    C.overlayMid);
  grad.addColorStop(0.52, "rgba(4,10,24,0.62)");
  grad.addColorStop(1,    C.overlayBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, gradY1);
}

// ── footer ────────────────────────────────────────────────────────────────────

function drawFooter(ctx, dealerName) {
  const y = SIZE - FOOTER_H;

  // background
  ctx.fillStyle = C.footerBg;
  ctx.fillRect(0, y, SIZE, FOOTER_H);

  // top border
  ctx.fillStyle = C.footerLine;
  ctx.fillRect(0, y, SIZE, 1.5);

  // "oX NEXMOV" — left
  ctx.font         = `700 38px ${FONT}`;
  ctx.fillStyle    = C.brand;
  ctx.textBaseline = "middle";
  ctx.textAlign    = "left";
  ctx.fillText("oX NEXMOV", PAD, y + FOOTER_H / 2);

  // dealer name — right (only if meaningful length)
  if (dealerName && dealerName.trim().length >= 2) {
    ctx.font      = `400 26px ${FONT}`;
    ctx.fillStyle = C.muted;
    ctx.textAlign = "right";
    ctx.fillText(truncate(dealerName.trim(), 28), SIZE - PAD, y + FOOTER_H / 2);
  }
}

// ── price badge ───────────────────────────────────────────────────────────────

// Returns the y coordinate of the top of the badge (for cursor adjustment)
function drawPriceBadge(ctx, priceStr, baselineY) {
  const font   = `700 46px ${FONT}`;
  ctx.font     = font;
  const textW  = ctx.measureText(priceStr).width;
  const pH     = 64;    // badge height
  const padH   = 20;    // horizontal padding inside badge
  const r      = 12;    // corner radius
  const badgeW = textW + padH * 2;
  const badgeY = baselineY - pH + 12; // baseline positioned ~80% from badge top

  // background fill
  buildRoundRectPath(ctx, PAD - padH, badgeY, badgeW, pH, r);
  ctx.fillStyle = C.priceBg;
  ctx.fill();

  // border stroke
  buildRoundRectPath(ctx, PAD - padH, badgeY, badgeW, pH, r);
  ctx.strokeStyle = C.priceBorder;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // price text
  ctx.font         = font;
  ctx.fillStyle    = C.white;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign    = "left";
  ctx.fillText(priceStr, PAD, baselineY);

  return badgeY;
}

// ── content block (bottom-up layout) ─────────────────────────────────────────

function drawContent(ctx, vehicle) {
  const bottomEdge = SIZE - FOOTER_H - BOTTOM_PAD;

  const title    = truncate(
    [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" "),
    22
  );
  const version  = getVersion(vehicle);
  const km       = getKm(vehicle);
  const location = [vehicle.city, vehicle.province].filter(Boolean).join(", ");
  const specLine = [km, truncate(location, 32)].filter(Boolean).join("  ·  ");
  const price    = Number(vehicle.price || 0);
  const priceStr = price > 0 ? formatARS(price) : "";
  const unavail  = isUnavailable(vehicle);

  let cursor = bottomEdge;

  // 1 — availability warning (bottom-most)
  if (unavail) {
    ctx.font         = `500 24px ${FONT}`;
    ctx.fillStyle    = C.warn;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign    = "left";
    ctx.fillText("Consultá disponibilidad actual.", PAD, cursor);
    cursor -= 42;
  }

  // 2 — price badge
  if (priceStr) {
    const badgeTop = drawPriceBadge(ctx, priceStr, cursor);
    cursor = badgeTop - 24;

    // accent separator line (above price badge, below specs)
    ctx.fillStyle = C.accentLine;
    ctx.fillRect(PAD, cursor, 210, 1.5);
    cursor -= 30;
  }

  // 3 — specs (km · location)
  if (specLine) {
    ctx.font         = `400 26px ${FONT}`;
    ctx.fillStyle    = C.muted;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign    = "left";
    ctx.fillText(truncate(specLine, 50), PAD, cursor);
    cursor -= 42;
  }

  // 4 — version
  if (version) {
    ctx.font         = `400 30px ${FONT}`;
    ctx.fillStyle    = C.muted;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign    = "left";
    ctx.fillText(version, PAD, cursor);
    cursor -= 52;
  }

  // 5 — title (top-most, drawn last)
  ctx.font         = `900 62px ${FONT}`;
  ctx.fillStyle    = C.white;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign    = "left";
  ctx.fillText(title, PAD, cursor);
}

// ── image loader ──────────────────────────────────────────────────────────────

async function loadImageAsBlob(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}

// ── main export ───────────────────────────────────────────────────────────────

export async function generateVehiclePromoCard(vehicle, options = {}) {
  const { dealerName = "", imageUrl = "" } = options;

  const canvas  = document.createElement("canvas");
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx     = canvas.getContext("2d");

  // Base fill (always, prevents empty canvas if everything else fails)
  ctx.fillStyle = C.bgBot;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Attempt to load vehicle image
  let hadImage = false;
  const blobUrl = await loadImageAsBlob(imageUrl);
  if (blobUrl) {
    hadImage = await new Promise((resolve) => {
      const img   = new Image();
      img.onload  = () => { drawCoverImage(ctx, img); resolve(true);  };
      img.onerror = () => resolve(false);
      img.src     = blobUrl;
    });
    URL.revokeObjectURL(blobUrl);
  }

  // Fallback gradient when no image
  if (!hadImage) drawFallbackBackground(ctx);

  // Dimming + gradient overlay
  if (hadImage) drawImageDimmer(ctx);
  drawOverlay(ctx);

  // Content and footer
  drawContent(ctx, vehicle);
  drawFooter(ctx, dealerName);

  return {
    dataUrl:  canvas.toDataURL("image/png"),
    filename: buildFilename(vehicle),
  };
}
