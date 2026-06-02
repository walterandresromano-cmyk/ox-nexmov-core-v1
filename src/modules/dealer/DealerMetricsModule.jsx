import { useState, useMemo } from "react";
import {
  getPublicationScore,
  getScoreLabel,
  getScoreChipClass,
} from "../../lib/publicationScore.js";
import { formatLimit, getPlanAlertClass, getPlanAlertLabel } from "../../lib/dealerPlan.js";
import { buildDealerCommercialReport } from "../../lib/dealerCommercialReport.js";

const RESPONDED_STATUSES = new Set([
  "seen", "contacted", "contactado", "in_progress", "en_gestion",
  "negotiation", "closed", "cerrado", "lost", "perdido", "sold",
]);

function calcAvgResponseHours(leads) {
  const responded = leads.filter(
    (l) =>
      RESPONDED_STATUSES.has(String(l.crm_status || "").toLowerCase()) &&
      l.created_at &&
      l.updated_at
  );

  if (responded.length === 0) return null;

  const totalHours = responded.reduce((sum, l) => {
    const diff =
      (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) /
      (1000 * 60 * 60);
    return sum + Math.max(0, diff);
  }, 0);

  return totalHours / responded.length;
}

function formatResponseTime(hours) {
  if (hours === null) return "—";
  if (hours < 1) return "< 1 hora";
  if (hours < 24) return `${Math.round(hours)} hs`;
  const days = Math.round(hours / 24);
  return `${days} día${days !== 1 ? "s" : ""}`;
}

function getResponseBadgeClass(hours) {
  if (hours === null) return "";
  if (hours < 2) return "success";
  if (hours < 24) return "info";
  if (hours < 72) return "warning";
  return "danger";
}

const FUNNEL_STAGES = [
  { key: "new",         label: "Nuevos",           match: (s) => ["new", "nuevo"].includes(s),         cls: "info" },
  { key: "seen",        label: "Vistos",            match: (s) => s === "seen",                          cls: "" },
  { key: "contacted",   label: "Contactados",       match: (s) => ["contacted", "contactado"].includes(s), cls: "" },
  { key: "negotiation", label: "En negociación",    match: (s) => ["negotiation", "en_gestion", "in_progress", "assigned", "asignado"].includes(s), cls: "warning" },
  { key: "closed",      label: "Cerrados / Vendidos", match: (s) => ["closed", "cerrado", "sold"].includes(s), cls: "success" },
  { key: "lost",        label: "Perdidos",          match: (s) => ["lost", "perdido", "cancelled", "cancelado", "archived", "archivado"].includes(s), cls: "danger" },
];

const NEXT_PLAN = {
  inicio:   { next: "Pro",      highlight: ["Hasta 15 publicaciones", "Métricas de leads", "Soporte prioritario"] },
  pro:      { next: "Elite",    highlight: ["Hasta 30 publicaciones", "Publicaciones destacadas", "Badge Elite en todas las cards"] },
  elite:    { next: "Platinum", highlight: ["Publicaciones ilimitadas", "Máxima visibilidad", "Badge Platinum con efecto premium"] },
  platinum: { next: null,       highlight: [] },
};

export default function DealerMetricsModule({
  dealerVehicles,
  leads,
  activeVehiclesCount,
  totalDetailViews,
  mostViewedVehicle,
  newLeadsCount,
  expiresInDays,
  used,
  limit,
  remaining = 0,
  extraQuota = 0,
  isPlatinum,
  rankLabel,
  planId,
  planStatus,
  permissions,
  reviewVehiclesCount = 0,
  onRefresh,
  onBack,
  onOpenInventory,
  onOpenLeads,
  onOpenSupport,
}) {
  const avgViewsPerVehicle =
    dealerVehicles.length > 0 ? totalDetailViews / dealerVehicles.length : 0;

  const leadRatio =
    activeVehiclesCount > 0
      ? (leads.length / activeVehiclesCount).toFixed(1)
      : "—";

  const zeroViewsVehicles = dealerVehicles.filter(
    (v) => Number(v.views ?? 0) === 0 && v.is_active
  );
  const coverageOk =
    zeroViewsVehicles.length === 0 && dealerVehicles.length > 0;

  const avgResponseHours = calcAvgResponseHours(leads);
  const responseBadgeClass = getResponseBadgeClass(avgResponseHours);

  const funnelCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: leads.filter((l) =>
      stage.match(String(l.crm_status || "").toLowerCase())
    ).length,
  }));
  const maxFunnelCount = Math.max(...funnelCounts.map((s) => s.count), 1);

  const leadsByVehicle = leads.reduce((acc, l) => {
    const vid = String(l.vehicle_id || "");
    if (!acc[vid]) acc[vid] = 0;
    acc[vid]++;
    return acc;
  }, {});

  const currentPlanKey = String(planId || "inicio").toLowerCase();
  const nextPlanInfo = NEXT_PLAN[currentPlanKey] || NEXT_PLAN.inicio;

  const [copyState, setCopyState] = useState("idle");

  const commercialReport = useMemo(
    () =>
      buildDealerCommercialReport({
        dealer:       null,
        leads,
        vehicles:     dealerVehicles,
        used,
        limit,
        remaining,
        isPlatinum,
        expiresInDays,
        planStatus,
      }),
    [leads, dealerVehicles, used, limit, remaining, isPlatinum, expiresInDays, planStatus]
  );

  async function handleCopy() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(commercialReport.copyText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = commercialReport.copyText;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 2500);
  }

  // Plan performance derived data
  const quotaPct = isPlatinum ? 100 : limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const quotaNearLimit = !isPlatinum && limit > 0 && remaining <= 2;
  const quotaFull = !isPlatinum && remaining <= 0;

  const lowScoreCount = dealerVehicles.filter((v) => {
    if (!v.is_active) return false;
    const { score } = getPublicationScore(v);
    return score < 50;
  }).length;

  const closedLeads = leads.filter((l) =>
    ["sold", "closed", "cerrado"].includes(String(l.crm_status || "").toLowerCase())
  ).length;

  const planExpired = planStatus === "expired" || planStatus === "expired_grace";
  const planExpiringSoon = !planExpired && expiresInDays >= 0 && expiresInDays <= 7;

  const planBenefits = [
    isPlatinum
      ? "Publicaciones ilimitadas"
      : `Hasta ${limit} publicaciones por período`,
    permissions?.marketIntelligence && "Inteligencia de mercado",
    permissions?.sellVehicleLeads && "Compradores que buscan vender su auto",
    permissions?.fullFinancingTools && "Herramientas de financiación",
    !isPlatinum && permissions?.badgeVisibility !== "limited"
      && `Badge ${rankLabel} visible en publicaciones`,
  ].filter(Boolean).slice(0, 4);

  // Smart recommendation
  const recommendation = (() => {
    if (planExpired) return { text: "Tu plan venció. Contactá a administración para reactivar.", level: "urgent" };
    if (planExpiringSoon) return { text: `Tu plan vence en ${expiresInDays} día${expiresInDays !== 1 ? "s" : ""}. Planificá la renovación.`, level: "urgent" };
    if (quotaFull) return { text: "Alcanzaste el cupo de publicaciones. Marcá vendidas las unidades cerradas para liberar cupo.", level: "attention" };
    if (quotaNearLimit) return { text: `Quedan ${remaining} publicación${remaining !== 1 ? "es" : ""} disponible${remaining !== 1 ? "s" : ""} en tu plan.`, level: "attention" };
    if (newLeadsCount > 0) return { text: `Tenés ${newLeadsCount} lead${newLeadsCount !== 1 ? "s" : ""} nuevo${newLeadsCount !== 1 ? "s" : ""} sin responder. Respondé rápido para no perder la oportunidad.`, level: "attention" };
    if (reviewVehiclesCount > 0) return { text: `${reviewVehiclesCount} publicación${reviewVehiclesCount !== 1 ? "es" : ""} en revisión. Corregí los datos para que vuelvan a ser visibles.`, level: "attention" };
    if (lowScoreCount > 0) return { text: `${lowScoreCount} publicación${lowScoreCount !== 1 ? "es" : ""} con score bajo. Mejorá fotos y descripción para aumentar consultas.`, level: "info" };
    if (!isPlatinum && remaining >= 3) return { text: "Tenés cupo disponible para sumar más unidades a tu inventario.", level: "info" };
    return { text: "Tu plan está activo y tu inventario no tiene bloqueos críticos.", level: "ok" };
  })();

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Métricas del período</h2>
          <p>
            Actividad y rendimiento de publicaciones en el período comercial
            activo.
          </p>
        </div>
        <button className="admin-refresh-btn" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      {/* ── Rendimiento de mi plan ── */}
      <section className="dealer-plan-perf">
        <h3 className="dealer-plan-perf__title">Rendimiento de mi plan</h3>

        {/* A — Plan state */}
        <div className="dealer-plan-perf__plan-row">
          <div className="dealer-plan-perf__plan-name">
            <span className="dealer-plan-perf__plan-label">Plan activo</span>
            <strong>{rankLabel}</strong>
          </div>
          <span className={`dealer-plan-perf__plan-status ${planExpired ? "is-expired" : planExpiringSoon ? "is-expiring" : "is-ok"}`}>
            {planExpired
              ? "Vencido"
              : planExpiringSoon
                ? `Vence en ${expiresInDays}d`
                : `Activo · ${expiresInDays}d`}
          </span>
        </div>

        {/* B — Quota bar */}
        <div className="dealer-plan-perf__quota">
          <div className="dealer-plan-perf__quota-row">
            <span>
              {isPlatinum
                ? `${used} publicaciones creadas · sin límite`
                : `${used} de ${limit} publicaciones usadas`}
            </span>
            {extraQuota > 0 && (
              <span className="dealer-plan-perf__extra">+{extraQuota} extra</span>
            )}
            {!isPlatinum && <span className="dealer-plan-perf__pct">{quotaPct}%</span>}
          </div>
          {!isPlatinum && (
            <div className="dealer-plan-perf__bar">
              <div
                className={`dealer-plan-perf__bar-fill${quotaFull ? " is-full" : quotaNearLimit ? " is-near" : ""}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          )}
        </div>

        {/* C — Inventory health + commercial */}
        <div className="dealer-plan-perf__kpis">
          <div className="dealer-plan-perf__kpi">
            <strong>{activeVehiclesCount}</strong>
            <span>Publicaciones activas</span>
          </div>
          <div className="dealer-plan-perf__kpi">
            <strong>{leads.length}</strong>
            <span>Leads totales</span>
          </div>
          <div className="dealer-plan-perf__kpi">
            <strong>{newLeadsCount}</strong>
            <span>Sin responder</span>
          </div>
          <div className="dealer-plan-perf__kpi">
            <strong>{closedLeads}</strong>
            <span>Vendidos / cerrados</span>
          </div>
          {reviewVehiclesCount > 0 && (
            <div className="dealer-plan-perf__kpi dealer-plan-perf__kpi--alert">
              <strong>{reviewVehiclesCount}</strong>
              <span>En revisión</span>
            </div>
          )}
          {lowScoreCount > 0 && (
            <div className="dealer-plan-perf__kpi dealer-plan-perf__kpi--warning">
              <strong>{lowScoreCount}</strong>
              <span>Score bajo</span>
            </div>
          )}
        </div>

        {/* D — Plan benefits */}
        {planBenefits.length > 0 && (
          <div className="dealer-plan-perf__benefits">
            <span className="dealer-plan-perf__benefits-label">Incluido en tu plan</span>
            <ul>
              {planBenefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {/* E — Smart recommendation */}
        <div className={`dealer-plan-perf__rec dealer-plan-perf__rec--${recommendation.level}`}>
          <span className="dealer-plan-perf__rec-dot" />
          <p>{recommendation.text}</p>
        </div>
      </section>

      {/* ── Reporte comercial ── */}
      <section className="dealer-commercial-report">
        <div className="dealer-commercial-report__head">
          <div>
            <h3>Reporte comercial</h3>
            <p>Lectura rápida del movimiento de tus publicaciones y leads.</p>
          </div>
          <button
            type="button"
            className={`dealer-commercial-report__copy${
              copyState === "copied" ? " is-copied" : copyState === "error" ? " is-error" : ""
            }`}
            onClick={handleCopy}
            aria-label={
              copyState === "copied"
                ? "Informe copiado al portapapeles"
                : copyState === "error"
                ? "No se pudo copiar el informe"
                : "Copiar informe al portapapeles"
            }
          >
            {copyState === "copied"
              ? "Copiado ✓"
              : copyState === "error"
              ? "No se pudo copiar"
              : "Copiar informe"}
          </button>
        </div>

        {dealerVehicles.length === 0 ? (
          <p className="dealer-commercial-report__empty">
            Cargá tus primeras publicaciones para generar un reporte comercial.
          </p>
        ) : leads.length === 0 ? (
          <p className="dealer-commercial-report__empty">
            Todavía no hay leads suficientes para analizar el rendimiento comercial.
          </p>
        ) : (
          <>
            {/* A — Resumen comercial (datos distintos a plan-perf) */}
            <div>
              <p className="dealer-commercial-report__section-title">Resumen comercial</p>
              <div className="dealer-commercial-report__grid">
                <div className={`dealer-commercial-report__metric${commercialReport.funnel.new > 0 ? " dealer-commercial-report__metric--alert" : ""}`}>
                  <strong>{commercialReport.funnel.new}</strong>
                  <span>Sin responder</span>
                </div>
                <div className="dealer-commercial-report__metric">
                  <strong>{commercialReport.funnel.contacted}</strong>
                  <span>Contactados</span>
                </div>
                <div className="dealer-commercial-report__metric">
                  <strong>{commercialReport.funnel.negotiation}</strong>
                  <span>En gestión</span>
                </div>
                <div className={`dealer-commercial-report__metric${commercialReport.funnel.lost > 0 ? " dealer-commercial-report__metric--alert" : ""}`}>
                  <strong>{commercialReport.funnel.lost}</strong>
                  <span>Perdidos</span>
                </div>
                {commercialReport.actionableLeads.withoutFollowUp > 0 && (
                  <div className={`dealer-commercial-report__metric${commercialReport.actionableLeads.withoutFollowUp > 3 ? " dealer-commercial-report__metric--warning" : ""}`}>
                    <strong>{commercialReport.actionableLeads.withoutFollowUp}</strong>
                    <span>Sin seguimiento</span>
                  </div>
                )}
                {commercialReport.inventory.lowScore > 0 && (
                  <div className="dealer-commercial-report__metric dealer-commercial-report__metric--warning">
                    <strong>{commercialReport.inventory.lowScore}</strong>
                    <span>Score bajo</span>
                  </div>
                )}
              </div>
            </div>

            {/* B — Top publicaciones */}
            {(commercialReport.topVehicles.mostLeads ||
              commercialReport.topVehicles.mostViews ||
              commercialReport.topVehicles.bestScore ||
              commercialReport.topVehicles.highViewsNoLeads) ? (
              <div>
                <p className="dealer-commercial-report__section-title">Top publicaciones</p>
                <div className="dealer-commercial-report__tops">
                  {commercialReport.topVehicles.mostLeads && (
                    <div className="dealer-commercial-report__vehicle">
                      <span className="dealer-commercial-report__vehicle-label">Más interés</span>
                      <div className="dealer-commercial-report__vehicle-info">
                        <strong>{commercialReport.topVehicles.mostLeads.title}</strong>
                        <span>Score {commercialReport.topVehicles.mostLeads.score}%</span>
                      </div>
                      <div className="dealer-commercial-report__vehicle-stat">
                        <strong>{commercialReport.topVehicles.mostLeads.leads}</strong>
                        <span>{commercialReport.topVehicles.mostLeads.leads === 1 ? "lead" : "leads"}</span>
                      </div>
                    </div>
                  )}
                  {commercialReport.topVehicles.mostViews && (
                    <div className="dealer-commercial-report__vehicle">
                      <span className="dealer-commercial-report__vehicle-label">Más vistas</span>
                      <div className="dealer-commercial-report__vehicle-info">
                        <strong>{commercialReport.topVehicles.mostViews.title}</strong>
                        <span>Score {commercialReport.topVehicles.mostViews.score}%</span>
                      </div>
                      <div className="dealer-commercial-report__vehicle-stat">
                        <strong>{commercialReport.topVehicles.mostViews.views}</strong>
                        <span>vistas</span>
                      </div>
                    </div>
                  )}
                  {commercialReport.topVehicles.bestScore && (
                    <div className="dealer-commercial-report__vehicle">
                      <span className="dealer-commercial-report__vehicle-label">Mejor score</span>
                      <div className="dealer-commercial-report__vehicle-info">
                        <strong>{commercialReport.topVehicles.bestScore.title}</strong>
                        <span>{commercialReport.topVehicles.bestScore.views} vistas</span>
                      </div>
                      <div className="dealer-commercial-report__vehicle-stat">
                        <strong>{commercialReport.topVehicles.bestScore.score}%</strong>
                        <span>score</span>
                      </div>
                    </div>
                  )}
                  {commercialReport.topVehicles.highViewsNoLeads && (
                    <div className="dealer-commercial-report__vehicle">
                      <span className="dealer-commercial-report__vehicle-label">Sin consultas</span>
                      <div className="dealer-commercial-report__vehicle-info">
                        <strong>{commercialReport.topVehicles.highViewsNoLeads.title}</strong>
                        <span>Score {commercialReport.topVehicles.highViewsNoLeads.score}%</span>
                      </div>
                      <div className="dealer-commercial-report__vehicle-stat">
                        <strong>{commercialReport.topVehicles.highViewsNoLeads.views}</strong>
                        <span>vistas · 0 leads</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* C — Recomendaciones */}
            <div>
              <p className="dealer-commercial-report__section-title">Próximas acciones</p>
              <div className="dealer-commercial-report__actions">
                {commercialReport.recommendations.map((rec, i) => (
                  <div
                    key={`${rec.level}-${i}`}
                    className={`dealer-commercial-report__recommendation dealer-commercial-report__recommendation--${rec.level}`}
                  >
                    <span className="dealer-commercial-report__rec-dot" aria-hidden="true" />
                    <span>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* D — Alertas de conversión */}
            {(commercialReport.actionableLeads.withoutFollowUp > 0 ||
              commercialReport.inventory.withViewsNoLeads > 0 ||
              commercialReport.inventory.zeroViews > 0 ||
              commercialReport.conversion.hasEnoughViewsForRate) && (
              <div>
                <p className="dealer-commercial-report__section-title">Datos de conversión</p>
                <div className="dealer-commercial-report__alerts">
                  {commercialReport.actionableLeads.withoutFollowUp > 0 && (
                    <div className={`dealer-commercial-report__alert-card${
                      commercialReport.actionableLeads.withoutFollowUp > 3
                        ? " dealer-commercial-report__alert-card--warn"
                        : ""
                    }`}>
                      <span>Sin seguimiento</span>
                      <strong>{commercialReport.actionableLeads.withoutFollowUp}</strong>
                      <p>leads activos sin fecha de acción</p>
                    </div>
                  )}
                  {commercialReport.inventory.withViewsNoLeads > 0 && (
                    <div className="dealer-commercial-report__alert-card dealer-commercial-report__alert-card--warn">
                      <span>Vistas sin consulta</span>
                      <strong>{commercialReport.inventory.withViewsNoLeads}</strong>
                      <p>publicaciones con vistas pero sin leads</p>
                    </div>
                  )}
                  {commercialReport.inventory.zeroViews > 0 && (
                    <div className="dealer-commercial-report__alert-card dealer-commercial-report__alert-card--danger">
                      <span>Sin vistas</span>
                      <strong>{commercialReport.inventory.zeroViews}</strong>
                      <p>publicaciones activas sin ninguna vista</p>
                    </div>
                  )}
                  {commercialReport.conversion.hasEnoughViewsForRate && (
                    <div className={`dealer-commercial-report__alert-card${
                      (commercialReport.conversion.viewToLeadRate ?? 0) >= 2
                        ? " dealer-commercial-report__alert-card--good"
                        : ""
                    }`}>
                      <span>Conversión vista/lead</span>
                      <strong>{commercialReport.conversion.viewToLeadRate}%</strong>
                      <p>de vistas se convierten en consulta</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Period status */}
      <div className={`dealer-metrics-period ${getPlanAlertClass(expiresInDays)}`}>
        <div className="dealer-metrics-period-item">
          <span>Estado del período</span>
          <strong>{getPlanAlertLabel(expiresInDays)}</strong>
        </div>
        <div className="dealer-metrics-period-item">
          <span>Publicaciones del período</span>
          <strong>
            {isPlatinum
              ? `${used} ilimitadas`
              : `${used} de ${formatLimit(limit)} usadas`}
          </strong>
        </div>
        <div className="dealer-metrics-period-item">
          <span>Plan activo</span>
          <strong>{rankLabel}</strong>
        </div>
      </div>

      {/* KPI cards */}
      <div className="dealer-status-grid">
        <article className="dealer-status-card">
          <span>Vistas totales</span>
          <strong>{totalDetailViews}</strong>
          <p>
            {dealerVehicles.length > 0
              ? `Promedio: ${avgViewsPerVehicle.toFixed(1)} por publicación`
              : "Sin publicaciones en el período"}
          </p>
        </article>

        <article className="dealer-status-card">
          <span>Publicación más vista</span>
          <strong>
            {mostViewedVehicle
              ? `${mostViewedVehicle.brand} ${mostViewedVehicle.model}`
              : "—"}
          </strong>
          <p>
            {mostViewedVehicle
              ? `${Number(mostViewedVehicle.views ?? 0)} vistas · ${mostViewedVehicle.version || "Sin versión"}`
              : "Sin publicaciones"}
          </p>
        </article>

        <article className="dealer-status-card">
          <span>Leads recibidos</span>
          <strong>{leads.length}</strong>
          <p>
            {activeVehiclesCount > 0
              ? `Ratio: ${leadRatio} leads por publicación activa`
              : "Sin publicaciones activas"}
          </p>
        </article>

        <article className="dealer-status-card">
          <span>Tiempo de respuesta</span>
          <strong>
            {avgResponseHours === null
              ? "Sin datos"
              : formatResponseTime(avgResponseHours)}
          </strong>
          {avgResponseHours !== null && (
            <p>
              <span className={`admin-chip ${responseBadgeClass}`}>
                {avgResponseHours < 2
                  ? "Excelente"
                  : avgResponseHours < 24
                  ? "Bueno"
                  : avgResponseHours < 72
                  ? "Mejorable"
                  : "Lento"}
              </span>
              {" "}promedio sobre leads respondidos
            </p>
          )}
          {avgResponseHours === null && (
            <p>Respondé leads para ver tu tiempo de respuesta.</p>
          )}
        </article>

        <article className="dealer-status-card">
          <span>{coverageOk ? "Cobertura de vistas" : "Sin vistas"}</span>
          <strong>{coverageOk ? "100%" : zeroViewsVehicles.length}</strong>
          <p>
            {coverageOk
              ? "Todas las publicaciones activas recibieron visitas."
              : "Publicaciones activas sin visitas. Revisá fotos, precio y datos."}
          </p>
          {!coverageOk && (
            <button
              type="button"
              className="table-action-btn"
              onClick={onOpenInventory}
            >
              Ver inventario
            </button>
          )}
        </article>

        <article className="dealer-status-card">
          <span>Nuevos leads</span>
          <strong>{newLeadsCount}</strong>
          <p>
            {newLeadsCount > 0
              ? "Consultas pendientes de respuesta."
              : "Sin leads nuevos en el período."}
          </p>
          {newLeadsCount > 0 && (
            <button
              type="button"
              className="table-action-btn"
              onClick={onOpenLeads}
            >
              Ver leads
            </button>
          )}
        </article>
      </div>

      {/* Lead funnel */}
      {leads.length > 0 && (
        <div className="dealer-metrics-funnel">
          <h3 className="dealer-metrics-section-title">Embudo de leads</h3>
          <div className="dealer-metrics-funnel-stages">
            {funnelCounts
              .filter((s) => s.count > 0)
              .map((stage) => (
                <div key={stage.key} className="dealer-metrics-funnel-row">
                  <span className="dealer-metrics-funnel-label">
                    {stage.label}
                  </span>
                  <div className="dealer-metrics-funnel-bar-wrap">
                    <div
                      className={`dealer-metrics-funnel-bar ${stage.cls}`}
                      style={{
                        width: `${Math.round((stage.count / maxFunnelCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className={`admin-chip ${stage.cls}`}>
                    {stage.count}
                  </span>
                </div>
              ))}
            {funnelCounts.every((s) => s.count === 0) && (
              <p className="dealer-metrics-empty">Sin leads en el período.</p>
            )}
          </div>
        </div>
      )}

      {/* Per-vehicle performance table */}
      {dealerVehicles.length > 0 && (
        <div className="admin-table-wrap dealer-metrics-table">
          <h3 className="dealer-metrics-section-title">
            Rendimiento por publicación
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Publicación</th>
                <th>Vistas</th>
                <th>vs. promedio</th>
                <th>Leads</th>
                <th>Conversión</th>
                <th>Calidad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {[...dealerVehicles]
                .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
                .map((vehicle) => {
                  const views = Number(vehicle.views ?? 0);
                  const vehicleLeads =
                    leadsByVehicle[String(vehicle.vehicle_id)] || 0;

                  const conversion =
                    views > 0
                      ? ((vehicleLeads / views) * 100).toFixed(1)
                      : null;

                  const vsAvg =
                    avgViewsPerVehicle > 0
                      ? (
                          ((views - avgViewsPerVehicle) / avgViewsPerVehicle) *
                          100
                        ).toFixed(0)
                      : null;
                  const vsAvgLabel =
                    vsAvg === null
                      ? "—"
                      : Number(vsAvg) > 0
                      ? `+${vsAvg}%`
                      : `${vsAvg}%`;
                  const vsAvgChip =
                    vsAvg === null || Number(vsAvg) === 0
                      ? ""
                      : Number(vsAvg) > 0
                      ? "success"
                      : views === 0
                      ? "danger"
                      : "warning";

                  const { score, missing } = getPublicationScore(vehicle);
                  const scoreLabel = getScoreLabel(score);
                  const scoreChip = getScoreChipClass(score);

                  return (
                    <tr key={vehicle.vehicle_id}>
                      <td>
                        <strong>
                          {vehicle.brand} {vehicle.model}
                        </strong>
                        <span>{vehicle.version || "Sin versión"}</span>
                      </td>
                      <td>
                        <strong>{views}</strong>
                      </td>
                      <td>
                        {vsAvgChip ? (
                          <span className={`admin-chip ${vsAvgChip}`}>
                            {vsAvgLabel}
                          </span>
                        ) : (
                          <span>{vsAvgLabel}</span>
                        )}
                      </td>
                      <td>
                        <strong>{vehicleLeads}</strong>
                      </td>
                      <td>
                        {conversion !== null ? (
                          <span
                            className={`admin-chip ${
                              Number(conversion) >= 5
                                ? "success"
                                : Number(conversion) >= 2
                                ? "info"
                                : "warning"
                            }`}
                          >
                            {conversion}%
                          </span>
                        ) : (
                          <span className="admin-chip">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`admin-chip ${scoreChip}`}
                          title={
                            missing.length > 0
                              ? `Falta: ${missing.join(", ")}`
                              : "Publicación completa"
                          }
                        >
                          {score}% · {scoreLabel}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            vehicle.is_active
                              ? "admin-chip success"
                              : "admin-chip warning"
                          }
                        >
                          {vehicle.is_active ? "Activa" : "No visible"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan upgrade CTA */}
      {nextPlanInfo.next && (
        <div className="dealer-metrics-upgrade">
          <div className="dealer-metrics-upgrade-content">
            <div>
              <h3>Pasá a {nextPlanInfo.next}</h3>
              <ul className="dealer-metrics-upgrade-list">
                {nextPlanInfo.highlight.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="dealer-metrics-upgrade-btn"
              onClick={onOpenSupport}
            >
              Solicitar upgrade →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
