import { formatARS, formatKm } from "./formatters.js";

const SIZE = 1080;

const COLORS = {
  bg:          "#0a0f1e",
  overlayFrom: "rgba(0,0,0,0)",
  overlayTo:   "rgba(0,0,0,0.82)",
  footer:      "rgba(5,10,20,0.92)",
  accent:      "rgba(56,189,248,0.9)",
  white:       "rgba(248,250,252,0.98)",
  muted:       "rgba(148,163,184,0.75)",
  warn:        "rgba(251,191,36,0.85)",
};

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
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
    .map((p) => String(p).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean);
  return `ox-nexmov-${parts.join("-") || "vehiculo"}.png`;
}

async function loadImageAsBlob(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function drawCoverImage(ctx, img) {
  const iw = img.naturalWidth  || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.max(SIZE / iw, SIZE / ih);
  const sw    = iw * scale;
  const sh    = ih * scale;
  const sx    = (SIZE - sw) / 2;
  const sy    = (SIZE - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh);
}

function drawOverlay(ctx) {
  const grad = ctx.createLinearGradient(0, SIZE * 0.35, 0, SIZE);
  grad.addColorStop(0, COLORS.overlayFrom);
  grad.addColorStop(1, COLORS.overlayTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawFooter(ctx, dealerName) {
  const footerH = 90;
  const y       = SIZE - footerH;

  ctx.fillStyle = COLORS.footer;
  ctx.fillRect(0, y, SIZE, footerH);

  ctx.font        = "700 36px system-ui, -apple-system, sans-serif";
  ctx.fillStyle   = COLORS.accent;
  ctx.textBaseline = "middle";
  ctx.textAlign   = "left";
  ctx.fillText("oX NEXMOV", 48, y + footerH / 2);

  if (dealerName) {
    const name = truncate(dealerName, 32);
    ctx.font      = "500 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = "right";
    ctx.fillText(name, SIZE - 48, y + footerH / 2);
  }
}

function drawTextBlock(ctx, vehicle) {
  const footerH    = 90;
  const bottomEdge = SIZE - footerH - 32;
  const padX       = 48;

  const titleParts = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
  const version    = vehicle.version ? truncate(vehicle.version, 40) : "";

  const km    = (() => {
    const raw = vehicle.km ?? vehicle.kilometers;
    if (raw === null || raw === undefined || Number.isNaN(Number(raw))) return "";
    return formatKm(Number(raw));
  })();

  const location = [vehicle.city, vehicle.province].filter(Boolean).join(", ");
  const specLine = [km, location].filter(Boolean).join("  ·  ");

  const price    = Number(vehicle.price || 0);
  const priceStr = price > 0 ? formatARS(price) : "";

  const unavailable = isUnavailable(vehicle);

  // Layout from bottom up
  let cursor = bottomEdge;

  if (unavailable) {
    ctx.font        = "500 26px system-ui, -apple-system, sans-serif";
    ctx.fillStyle   = COLORS.warn;
    ctx.textAlign   = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Consultá disponibilidad actual.", padX, cursor);
    cursor -= 44;
  }

  if (priceStr) {
    ctx.font        = "800 64px system-ui, -apple-system, sans-serif";
    ctx.fillStyle   = COLORS.white;
    ctx.textAlign   = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(truncate(priceStr, 22), padX, cursor);
    cursor -= 76;
  }

  if (specLine) {
    ctx.font        = "400 30px system-ui, -apple-system, sans-serif";
    ctx.fillStyle   = COLORS.muted;
    ctx.textAlign   = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(truncate(specLine, 48), padX, cursor);
    cursor -= 44;
  }

  if (version) {
    ctx.font        = "400 32px system-ui, -apple-system, sans-serif";
    ctx.fillStyle   = COLORS.muted;
    ctx.textAlign   = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(version, padX, cursor);
    cursor -= 52;
  }

  ctx.font        = "800 68px system-ui, -apple-system, sans-serif";
  ctx.fillStyle   = COLORS.white;
  ctx.textAlign   = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(titleParts, 26), padX, cursor);
}

export async function generateVehiclePromoCard(vehicle, options = {}) {
  const { dealerName = "", imageUrl = "" } = options;

  const canvas = document.createElement("canvas");
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // Solid background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Vehicle image
  const blobUrl = await loadImageAsBlob(imageUrl);
  if (blobUrl) {
    await new Promise((resolve) => {
      const img    = new Image();
      img.onload   = () => { drawCoverImage(ctx, img); resolve(); };
      img.onerror  = () => resolve();
      img.src      = blobUrl;
    });
    URL.revokeObjectURL(blobUrl);
  }

  drawOverlay(ctx);
  drawTextBlock(ctx, vehicle);
  drawFooter(ctx, dealerName);

  const dataUrl  = canvas.toDataURL("image/png");
  const filename = buildFilename(vehicle);

  return { dataUrl, filename };
}
