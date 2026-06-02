import { getPublicationScore, getScoreBand } from "./publicationScore.js";

// ─── CRM status normalization ─────────────────────────────────────────────────

const STATUS_NEW = new Set(["new", "nuevo"]);
const STATUS_CONTACTED = new Set(["seen", "contacted", "contactado"]);
const STATUS_NEGOTIATION = new Set([
  "negotiation", "in_progress", "en_gestion", "assigned", "asignado", "reserved",
]);
const STATUS_CLOSED = new Set(["sold", "closed", "cerrado", "vendido"]);
const STATUS_LOST = new Set([
  "lost", "perdido", "no_response", "cancelled", "cancelado", "archived", "archivado",
]);

function norm(raw) {
  return String(raw || "").toLowerCase().trim();
}

function isTerminal(status) {
  return STATUS_CLOSED.has(status) || STATUS_LOST.has(status);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// ─── Vehicle helpers ──────────────────────────────────────────────────────────

function vehicleTitle(v) {
  return (
    [v.brand, v.model, v.version].filter(Boolean).join(" ") ||
    `Vehículo ${v.vehicle_id || ""}`
  );
}

function toVehicleSummary(vehicle, leadCount) {
  const { score } = getPublicationScore(vehicle);
  return {
    id:      String(vehicle.vehicle_id || ""),
    title:   vehicleTitle(vehicle),
    brand:   vehicle.brand   || "",
    model:   vehicle.model   || "",
    version: vehicle.version || "",
    year:    vehicle.year    || null,
    views:   Number(vehicle.views ?? 0),
    leads:   leadCount,
    score,
    band:    getScoreBand(score),
  };
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function p(n, one, many) {
  return n === 1 ? one : many;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildDealerCommercialReport({
  dealer        = null,
  leads         = [],
  vehicles      = [],
  used          = 0,
  limit         = 0,
  remaining     = 0,
  isPlatinum    = false,
  expiresInDays = null,
  planStatus    = "",
} = {}) {

  const todayStr = getTodayStr();

  // ── Cross-reference: leads per vehicle ────────────────────────────
  const leadsByVehicleId = leads.reduce((acc, l) => {
    const vid = String(l.vehicle_id || "");
    if (vid) acc[vid] = (acc[vid] || 0) + 1;
    return acc;
  }, {});

  // ── Funnel ────────────────────────────────────────────────────────
  const funnel = {
    total: leads.length,
    new: 0,
    contacted: 0,
    negotiation: 0,
    closed: 0,
    lost: 0,
    active: 0,
  };

  for (const l of leads) {
    const s = norm(l.crm_status);
    if      (STATUS_NEW.has(s))          funnel.new++;
    else if (STATUS_CONTACTED.has(s))    funnel.contacted++;
    else if (STATUS_NEGOTIATION.has(s))  funnel.negotiation++;
    else if (STATUS_CLOSED.has(s))       funnel.closed++;
    else if (STATUS_LOST.has(s))         funnel.lost++;

    if (!isTerminal(s)) funnel.active++;
  }

  // ── Inventory ─────────────────────────────────────────────────────
  const activeVehicles = [];
  let inReviewCount      = 0;
  let zeroViewsCount     = 0;
  let lowScoreCount      = 0;
  let withViewsNoLeads   = 0;
  let totalViews         = 0;

  for (const v of vehicles) {
    const views = Number(v.views ?? 0);
    totalViews += views;

    if (v.review_status === "needs_review") inReviewCount++;

    if (v.is_active) {
      activeVehicles.push(v);

      const { score } = getPublicationScore(v);
      const vid       = String(v.vehicle_id || "");
      const vLeads    = leadsByVehicleId[vid] || 0;

      if (score < 50)              lowScoreCount++;
      if (views === 0)             zeroViewsCount++;
      if (views > 0 && vLeads === 0) withViewsNoLeads++;
    }
  }

  const inventory = {
    total:            vehicles.length,
    active:           activeVehicles.length,
    inReview:         inReviewCount,
    zeroViews:        zeroViewsCount,
    lowScore:         lowScoreCount,
    withViewsNoLeads,
  };

  // ── Top vehicles ──────────────────────────────────────────────────

  // mostLeads — only meaningful with 3+ leads total
  let mostLeads = null;
  if (leads.length >= 3) {
    let best = null;
    let bestCount = 0;
    for (const v of vehicles) {
      const count = leadsByVehicleId[String(v.vehicle_id || "")] || 0;
      if (count > bestCount) { bestCount = count; best = v; }
    }
    if (best && bestCount > 0) {
      mostLeads = toVehicleSummary(best, bestCount);
    }
  }

  // mostViews — only if at least one active vehicle has views > 0
  let mostViews = null;
  {
    let best = null;
    let bestV = 0;
    for (const v of activeVehicles) {
      const views = Number(v.views ?? 0);
      if (views > bestV) { bestV = views; best = v; }
    }
    if (best && bestV > 0) {
      mostViews = toVehicleSummary(best, leadsByVehicleId[String(best.vehicle_id || "")] || 0);
    }
  }

  // bestScore — active vehicle with highest score
  let bestScore = null;
  {
    let best = null;
    let bestS = -1;
    for (const v of activeVehicles) {
      const { score } = getPublicationScore(v);
      if (score > bestS) { bestS = score; best = v; }
    }
    if (best) {
      bestScore = toVehicleSummary(best, leadsByVehicleId[String(best.vehicle_id || "")] || 0);
    }
  }

  // worstScore — active vehicle with lowest score, only if different from bestScore
  let worstScore = null;
  if (activeVehicles.length >= 2) {
    let worst = null;
    let worstS = 101;
    for (const v of activeVehicles) {
      const { score } = getPublicationScore(v);
      if (score < worstS) { worstS = score; worst = v; }
    }
    if (worst && String(worst.vehicle_id) !== String(bestScore?.id ?? "")) {
      worstScore = toVehicleSummary(worst, leadsByVehicleId[String(worst.vehicle_id || "")] || 0);
    }
  }

  // highViewsNoLeads — active vehicle with most views and zero leads
  let highViewsNoLeads = null;
  {
    let best = null;
    let bestV = 0;
    for (const v of activeVehicles) {
      const views = Number(v.views ?? 0);
      const vLeads = leadsByVehicleId[String(v.vehicle_id || "")] || 0;
      if (views > 0 && vLeads === 0 && views > bestV) { bestV = views; best = v; }
    }
    if (best) {
      highViewsNoLeads = toVehicleSummary(best, 0);
    }
  }

  const topVehicles = { mostLeads, mostViews, bestScore, worstScore, highViewsNoLeads };

  // ── Actionable leads ──────────────────────────────────────────────
  let withoutFollowUp = 0;
  let overdueCount    = 0;
  let todayCount      = 0;

  for (const l of leads) {
    const s = norm(l.crm_status);
    if (isTerminal(s)) continue;

    if (!l.next_action_date) {
      withoutFollowUp++;
      continue;
    }

    if (l.next_action_date < todayStr)      overdueCount++;
    else if (l.next_action_date === todayStr) todayCount++;
  }

  const actionableLeads = {
    withoutFollowUp,
    overdue: overdueCount,
    today:   todayCount,
  };

  // ── Conversion ────────────────────────────────────────────────────
  const avgViews = activeVehicles.length > 0
    ? totalViews / activeVehicles.length
    : 0;

  const leadRatio = activeVehicles.length > 0
    ? Number((leads.length / activeVehicles.length).toFixed(1))
    : null;

  const hasEnoughViewsForRate = totalViews > 10;
  const viewToLeadRate = hasEnoughViewsForRate
    ? Number(((leads.length / totalViews) * 100).toFixed(1))
    : null;

  const conversion = {
    totalViews,
    leadRatio,
    avgViews:             Number(avgViews.toFixed(1)),
    viewToLeadRate,
    hasEnoughViewsForRate,
  };

  // ── Plan ──────────────────────────────────────────────────────────
  const quotaPct = isPlatinum
    ? 100
    : limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const quotaFull     = !isPlatinum && remaining <= 0;
  const quotaNearLimit = !isPlatinum && limit > 0 && remaining <= 2 && !quotaFull;

  const plan = {
    used,
    limit,
    remaining,
    isPlatinum,
    expiresInDays,
    planStatus,
    quotaPct,
    quotaFull,
    quotaNearLimit,
  };

  // ── Recommendations (max 4, spec order = priority order) ──────────
  const allRecs = [];

  if (funnel.new > 0) {
    allRecs.push({
      level: "urgent",
      action: "leads",
      text: `Tenés ${funnel.new} ${p(funnel.new, "lead", "leads")} sin responder. Respondé rápido para no perder oportunidades.`,
    });
  }

  if (actionableLeads.overdue > 0) {
    const n = actionableLeads.overdue;
    allRecs.push({
      level: "urgent",
      action: "leads",
      text: n === 1
        ? "Tenés 1 seguimiento vencido. Reagendá o cerrá ese contacto para mantener limpio el pipeline."
        : `Tenés ${n} seguimientos vencidos. Reagendá o cerrá esos contactos para mantener limpio el pipeline.`,
    });
  }

  if (inventory.withViewsNoLeads > 0) {
    const n = inventory.withViewsNoLeads;
    allRecs.push({
      level: "attention",
      action: "inventory",
      text: n === 1
        ? "1 publicación recibe vistas pero no genera consultas. Revisá fotos, precio y descripción."
        : `${n} publicaciones reciben vistas pero no generan consultas. Revisá fotos, precio y descripción.`,
    });
  }

  if (inventory.zeroViews > 0) {
    const n = inventory.zeroViews;
    allRecs.push({
      level: "attention",
      action: "inventory",
      text: n === 1
        ? "1 publicación activa no tiene vistas. Revisá si está completa y bien presentada."
        : `${n} publicaciones activas no tienen vistas. Revisá si están completas y bien presentadas.`,
    });
  }

  if (actionableLeads.withoutFollowUp > 3) {
    allRecs.push({
      level: "attention",
      action: "leads",
      text: `Tenés ${actionableLeads.withoutFollowUp} leads activos sin próxima acción. Asigná seguimiento para no perder oportunidades.`,
    });
  }

  if (inventory.lowScore > 0) {
    const n = inventory.lowScore;
    allRecs.push({
      level: "info",
      action: "inventory",
      text: n === 1
        ? "1 publicación tiene score bajo. Completá fotos, descripción y datos clave."
        : `${n} publicaciones tienen score bajo. Completá fotos, descripción y datos clave.`,
    });
  }

  if (plan.quotaFull) {
    allRecs.push({
      level: "urgent",
      action: "support",
      text: "Alcanzaste el cupo del período. Revisá publicaciones vendidas o consultá por más capacidad.",
    });
  }

  if (!plan.quotaFull && !isPlatinum && remaining >= 3) {
    allRecs.push({
      level: "info",
      action: "publish",
      text: `Tenés ${remaining} ${p(remaining, "espacio disponible", "espacios disponibles")} para sumar unidades al catálogo.`,
    });
  }

  if (mostLeads && mostLeads.score < 70) {
    allRecs.push({
      level: "info",
      action: "inventory",
      text: "Tu publicación con más interés puede mejorar su score. Completala para aumentar la conversión.",
    });
  }

  const recommendations = allRecs.length > 0
    ? allRecs.slice(0, 4)
    : [{ level: "ok", action: null, text: "Tu operación está ordenada. Mantené actualizados los leads y el inventario." }];

  // ── Copy text ─────────────────────────────────────────────────────
  const dealerName = dealer?.commercialName || dealer?.name || "Panel Dealer";
  const dateLabel  = new Intl.DateTimeFormat("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date());

  const topLine = mostLeads
    ? `• ${mostLeads.title} — ${mostLeads.leads} ${p(mostLeads.leads, "lead", "leads")}`
    : "• Sin datos suficientes todavía.";

  const copyText = [
    `Informe comercial — ${dealerName} — ${dateLabel}`,
    "",
    "LEADS",
    `• Total: ${funnel.total}`,
    `• Nuevos: ${funnel.new}`,
    `• En gestión: ${funnel.negotiation}`,
    `• Cerrados: ${funnel.closed}`,
    `• Perdidos: ${funnel.lost}`,
    "",
    "INVENTARIO",
    `• Activas: ${inventory.active}`,
    `• En revisión: ${inventory.inReview}`,
    `• Sin vistas: ${inventory.zeroViews}`,
    `• Score bajo: ${inventory.lowScore}`,
    "",
    "TOP PUBLICACIÓN",
    topLine,
    "",
    "RECOMENDACIÓN PRINCIPAL",
    `• ${recommendations[0].text}`,
  ].join("\n");

  return {
    funnel,
    inventory,
    topVehicles,
    actionableLeads,
    conversion,
    plan,
    recommendations,
    copyText,
  };
}
