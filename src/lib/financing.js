// Tasas mensuales disponibles en el selector de la calculadora
export const FINANCING_RATES = [
  { label: "Tasa baja (TNA ~30%)",    monthly: 0.025 },
  { label: "Tasa media (TNA ~42%)",   monthly: 0.035 },
  { label: "Tasa alta (TNA ~55%)",    monthly: 0.046 },
  { label: "Tasa banco (TNA ~70%)",   monthly: 0.058 },
];

export const DEFAULT_RATE_INDEX = 1; // "Tasa media" como default

// Entrega default: 30% del precio
export const DEFAULT_DOWN_PCT = 0.30;

// Plazo default
export const DEFAULT_TERM_MONTHS = 36;

/**
 * Calcula cuota mensual por sistema francés.
 * Devuelve null si los parámetros son inválidos.
 */
export function calcMonthly({ price, downPayment, termMonths, monthlyRate }) {
  const p = Number(price)       || 0;
  const d = Number(downPayment) || 0;
  const t = Number(termMonths)  || DEFAULT_TERM_MONTHS;
  const r = Number(monthlyRate) || FINANCING_RATES[DEFAULT_RATE_INDEX].monthly;

  if (!p || d >= p || t <= 0 || r <= 0) return null;

  const financed = p - d;
  const monthly  =
    financed * ((r * Math.pow(1 + r, t)) / (Math.pow(1 + r, t) - 1));

  return {
    financed,
    monthly,
    totalPaid:   monthly * t,
    termMonths:  t,
    monthlyRate: r,
  };
}

/**
 * Estimación rápida para mostrar en la tarjeta de vehículo.
 * Usa 30% de entrega, 36 meses, tasa media.
 * Devuelve null si price inválido.
 */
export function quickEstimate(price) {
  const p = Number(price) || 0;
  if (!p) return null;

  const down = p * DEFAULT_DOWN_PCT;
  return calcMonthly({
    price: p,
    downPayment: down,
    termMonths:  DEFAULT_TERM_MONTHS,
    monthlyRate: FINANCING_RATES[DEFAULT_RATE_INDEX].monthly,
  });
}
