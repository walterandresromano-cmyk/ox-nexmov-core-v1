import { formatARS, formatKm } from "./formatters.js";

export function buildVehicleSocialCopy(vehicle, { dealerName = "", publicUrl = "" } = {}) {
  if (!vehicle) return "";

  const lines = [];

  // 1. Title
  const titleParts = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
  const versionPart = vehicle.version ? ` — ${vehicle.version}` : "";
  const sourcePart = dealerName ? ` — disponible en ${dealerName}` : " — disponible";
  lines.push(`${titleParts}${versionPart}${sourcePart}`);
  lines.push("");

  // 2. Main specs
  const specs = [];
  const kmRaw = vehicle.km ?? vehicle.kilometers;
  if (kmRaw !== null && kmRaw !== undefined && !isNaN(Number(kmRaw))) {
    specs.push(formatKm(Number(kmRaw)));
  }
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
  const isUnavailable =
    !vehicle.is_active ||
    vehicle.reserved ||
    vehicle.publication_status === "review" ||
    vehicle.publication_status === "paused";

  if (isUnavailable) {
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
