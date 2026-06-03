import { formatARS, formatKm } from "./formatters.js";

// ── Internal helpers (not exported) ──────────────────────────────────────────

function _getKm(vehicle) {
  const raw = vehicle.km ?? vehicle.kilometers;
  if (raw === null || raw === undefined || isNaN(Number(raw))) return null;
  return Number(raw);
}

function _isUnavailable(vehicle) {
  return (
    !vehicle.is_active ||
    vehicle.reserved ||
    vehicle.publication_status === "review" ||
    vehicle.publication_status === "paused"
  );
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function buildVehicleSocialCopy(vehicle, { dealerName = "", publicUrl = "" } = {}) {
  if (!vehicle) return "";

  const lines = [];

  // 1. Title
  const titleParts = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
  const versionPart = vehicle.version ? ` — ${vehicle.version}` : "";
  const sourcePart  = dealerName ? ` — disponible en ${dealerName}` : " — disponible";
  lines.push(`${titleParts}${versionPart}${sourcePart}`);
  lines.push("");

  // 2. Main specs
  const specs = [];
  const km = _getKm(vehicle);
  if (km !== null)          specs.push(formatKm(km));
  if (vehicle.fuel_type)    specs.push(vehicle.fuel_type);
  if (vehicle.transmission) specs.push(vehicle.transmission);
  if (vehicle.body_type)    specs.push(vehicle.body_type);
  if (specs.length > 0) lines.push(specs.join(" · "));

  // 3. Location
  const locationParts = [vehicle.city, vehicle.province].filter(Boolean);
  if (locationParts.length > 0) {
    lines.push(`Ubicación: ${locationParts.join(", ")}`);
  }

  // 4. Price — only if positive
  const price = Number(vehicle.price || 0);
  if (price > 0) {
    lines.push(`Precio publicado: ${formatARS(price)}`);
  }

  // 5. Financing — only if flag + complete data
  const delivery = Number(vehicle.delivery || 0);
  const months   = Number(vehicle.months  || 0);
  if (vehicle.financing && delivery > 0 && months > 0) {
    lines.push(`Financiación disponible: entrega desde ${formatARS(delivery)} · ${months} cuotas`);
  }

  // 6. Availability warning
  if (_isUnavailable(vehicle)) {
    lines.push("Consultá disponibilidad actual.");
  }

  lines.push("");

  // 7. CTA
  lines.push("Consultá esta unidad en oX NEXMOV:");

  // 8. Link — only if provided
  if (publicUrl) {
    lines.push(publicUrl);
  }

  lines.push("");

  // 9. Signature
  lines.push("oX NEXMOV — plataforma automotriz para buscar, comparar y consultar vehículos.");

  return lines.join("\n");
}

export function buildVehicleShortSocialCopy(vehicle, { dealerName = "", publicUrl = "" } = {}) {
  if (!vehicle) return "";

  const lines = [];

  // 1. Title — brand/model/year + version, no dealer suffix
  const titleParts = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
  const versionPart = vehicle.version ? ` — ${vehicle.version}` : "";
  lines.push(`${titleParts}${versionPart}`);

  // 2. Compact specs + location in one line
  const compactParts = [];
  const km = _getKm(vehicle);
  if (km !== null) compactParts.push(formatKm(km));
  // prefer transmission; fall back to fuel_type if only one is available
  if (vehicle.transmission) compactParts.push(vehicle.transmission);
  // GNC always shown — key differentiator in Argentina; other fuel types shown only without transmission
  if (vehicle.fuel_type && (vehicle.fuel_type === "GNC" || !vehicle.transmission)) {
    compactParts.push(vehicle.fuel_type);
  }
  const locationParts = [vehicle.city, vehicle.province].filter(Boolean);
  if (locationParts.length > 0) compactParts.push(locationParts.join(", "));
  if (compactParts.length > 0) lines.push(compactParts.join(" · "));

  // 3. Price — only if positive
  const price = Number(vehicle.price || 0);
  if (price > 0) {
    lines.push("");
    lines.push(formatARS(price));
  }

  // 4. Availability warning
  if (_isUnavailable(vehicle)) {
    lines.push("");
    lines.push("Consultá disponibilidad actual.");
  }

  lines.push("");

  // 5. Short signature
  lines.push("Publicado en oX NEXMOV.");

  // 6. Link — only if provided
  if (publicUrl) lines.push(publicUrl);

  return lines.join("\n");
}
