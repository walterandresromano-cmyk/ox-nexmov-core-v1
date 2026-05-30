export function formatRelativeTime(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffH < 24) return `hace ${diffH} h`;
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `hace ${diffD} días`;

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
  }).format(date);
}

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
    reference,
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
