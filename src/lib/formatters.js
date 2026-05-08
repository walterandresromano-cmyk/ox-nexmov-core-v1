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

export function normalizeWhatsAppArgentina(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("549") && digits.length >= 12) return digits;

  if (digits.startsWith("54")) {
    const national = digits.slice(2).replace(/^0+/, "");

    if (national.startsWith("9") && national.length >= 11) {
      return `54${national}`;
    }

    const mobileNational = normalizeArgentineMobileNational(national);
    return mobileNational ? `549${mobileNational}` : "";
  }

  const mobileNational = normalizeArgentineMobileNational(digits);
  return mobileNational ? `549${mobileNational}` : "";
}

function normalizeArgentineMobileNational(value) {
  let national = String(value || "").replace(/\D/g, "").replace(/^0+/, "");

  if (!national) return "";

  if (national.startsWith("15") && national.length >= 10) {
    national = national.slice(2);
  }

  if (national.startsWith("11") && national.slice(2, 4) === "15") {
    national = `11${national.slice(4)}`;
  }

  if (national.length < 10 || national.length > 11) return "";

  return national;
}
