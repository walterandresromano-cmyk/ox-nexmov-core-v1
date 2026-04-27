export function formatARS(value) {
  if (!Number.isFinite(value)) return "Consultar";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatKm(value) {
  if (!Number.isFinite(value)) return "Km no informado";

  return `${new Intl.NumberFormat("es-AR").format(value)} km`;
}

export function getMarketDelta(vehicle) {
  const reference = vehicle.marketReferencePrice;
  const price = vehicle.price;

  if (!Number.isFinite(reference) || !Number.isFinite(price) || reference <= 0) {
    return null;
  }

  const amount = reference - price;
  const percent = (amount / reference) * 100;

  return {
    amount,
    percent,
    isBelowMarket: amount > 0,
  };
}