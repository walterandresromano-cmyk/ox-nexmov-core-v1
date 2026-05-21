export function normalizeRole(role) {
  const value = String(role || "buyer").trim().toLowerCase();

  if (value === "comprador") return "buyer";
  if (value === "soporte") return "support";
  if (value === "internal_0km") return "internal0km";

  return value;
}
