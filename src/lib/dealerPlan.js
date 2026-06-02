export function formatLimit(limit) {
  return limit === Infinity ? "Ilimitado" : limit;
}

export function getPlanAlertClass(days) {
  if (days <= 0) return "plan-alert expired";
  if (days <= 2) return "plan-alert critical";
  if (days <= 6) return "plan-alert urgent";
  if (days <= 14) return "plan-alert warning";
  return "plan-alert healthy";
}

export function getPlanAlertLabel(days) {
  if (days <= 0) return "Período vencido";
  if (days <= 2) return `Vence en ${days} días`;
  if (days <= 6) return `Vencimiento cercano · ${days} días`;
  if (days <= 14) return `Próximo a vencer · ${days} días`;
  return `Activo · ${days} días restantes`;
}
