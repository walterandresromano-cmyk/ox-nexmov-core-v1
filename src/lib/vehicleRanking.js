import { getPublicationScore } from "./publicationScore.js";

const VIEW_THRESHOLD   = 3;
const AGE_THRESHOLD    = 20;
const HIGH_SCORE       = 80;
const GOOD_SCORE       = 60;
const PROMOTE_SCORE    = 70;

function computeAgeDays(vehicle) {
  const raw = vehicle.created_at ?? vehicle.createdAt ?? vehicle.published_at ?? null;
  if (!raw) return null;
  const ms = Date.now() - new Date(raw).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

export function getVehicleStockSignal(vehicle, {
  leads   = 0,
  score   = null,
  ageDays = null,
} = {}) {
  if (!vehicle) {
    return { key: "active", label: "Activa", level: "neutral", reason: "", action: "" };
  }

  const resolvedScore = score !== null ? score : getPublicationScore(vehicle).score;
  const resolvedAge   = ageDays !== null ? ageDays : computeAgeDays(vehicle);
  const views         = Number(vehicle.views ?? 0);
  const leadCount     = Number(leads ?? 0);
  const isActive      = vehicle.is_active === true;
  const pubStatus     = String(vehicle.publication_status || "").toLowerCase();
  const price         = Number(vehicle.price || 0);
  const ref           = Number(vehicle.market_reference_price || vehicle.avg || 0);
  const isPriceOk     = ref > 0 && price > 0 ? price <= ref : true;

  // 1. Reservada
  if (vehicle.reserved === true) {
    return {
      key:    "reserved",
      label:  "Reservada",
      level:  "neutral",
      reason: "La unidad está marcada como reservada.",
      action: "Seguimiento comercial",
    };
  }

  // 2. Requiere revisión
  if (vehicle.review_status === "needs_review") {
    return {
      key:    "needs_review",
      label:  "Requiere revisión",
      level:  "urgent",
      reason: "La publicación necesita revisión antes de competir mejor.",
      action: "Corregir publicación",
    };
  }

  // 3. Pausada / no activa
  if (!isActive || pubStatus === "paused" || pubStatus === "paused_by_system") {
    return {
      key:    "paused",
      label:  "Pausada",
      level:  "neutral",
      reason: "La publicación no está activa públicamente.",
      action: "Revisar estado",
    };
  }

  // From here on: vehicle is active and not reserved

  // 4. Buen rendimiento
  if (leadCount > 0 && resolvedScore >= GOOD_SCORE) {
    return {
      key:    "good_performance",
      label:  "Buen rendimiento",
      level:  "good",
      reason: "La unidad ya genera consultas y tiene una publicación aceptable.",
      action: "Mantener seguimiento",
    };
  }

  // 5. Alta oportunidad
  if (resolvedScore >= HIGH_SCORE && views > 0 && isPriceOk) {
    return {
      key:    "high_opportunity",
      label:  "Alta oportunidad",
      level:  "good",
      reason: "Tiene buena calidad de publicación y señales de interés.",
      action: "Promocionar",
    };
  }

  // 6. Vistas sin consulta
  if (views >= VIEW_THRESHOLD && leadCount === 0) {
    return {
      key:    "views_no_leads",
      label:  "Vistas sin consulta",
      level:  "attention",
      reason: "Recibe vistas pero no genera consultas.",
      action: "Revisar precio y fotos",
    };
  }

  // 7. Lista para promocionar
  if (resolvedScore >= PROMOTE_SCORE && views < VIEW_THRESHOLD && leadCount === 0) {
    return {
      key:    "ready_to_promote",
      label:  "Lista para promocionar",
      level:  "info",
      reason: "La publicación está suficientemente completa para difundirla.",
      action: "Compartir en redes",
    };
  }

  // 8. Auto frío
  if (views < VIEW_THRESHOLD && leadCount === 0 && resolvedAge !== null && resolvedAge >= AGE_THRESHOLD) {
    return {
      key:    "cold",
      label:  "Auto frío",
      level:  "attention",
      reason: "La unidad lleva tiempo publicada sin generar movimiento.",
      action: "Revisar presentación",
    };
  }

  // 9. Default
  return {
    key:    "active",
    label:  "Activa",
    level:  "neutral",
    reason: "Publicación activa sin señal comercial destacada.",
    action: "",
  };
}
