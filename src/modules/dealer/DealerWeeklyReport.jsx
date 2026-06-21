import { useMemo } from "react";

const CLOSED_SET = new Set(["sold", "closed", "cerrado", "vendido"]);
const TERMINAL_SET = new Set([
  "sold", "closed", "cerrado", "vendido",
  "lost", "perdido", "cancelled", "cancelado", "archived", "archivado",
]);

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function delta(current, prev) {
  if (current === 0 && prev === 0) return null;
  const diff = current - prev;
  if (diff === 0) return { text: "= igual", cls: "" };
  return diff > 0
    ? { text: `↑ ${diff}`, cls: "success" }
    : { text: `↓ ${Math.abs(diff)}`, cls: "warning" };
}

function fmt(d) {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function DealerWeeklyReport({
  leads = [],
  vehicles = [],
  recommendations = [],
  copyText = "",
  copyState = "idle",
  onCopy,
  onClose,
}) {
  const { weekLabel, kpis, funnel, topVehicle } = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const label = `${fmt(weekAgo)} — ${fmt(now)}`;

    const thisNew = [];
    const prevNew = [];
    const thisClosed = [];
    const prevClosed = [];
    const thisManaged = [];

    for (const l of leads) {
      const createdAt = l.created_at ? new Date(l.created_at) : null;
      const updatedAt = l.updated_at ? new Date(l.updated_at) : null;
      const s = norm(l.crm_status);

      if (createdAt) {
        if (createdAt >= weekAgo)                           thisNew.push(l);
        else if (createdAt >= twoWeeksAgo)                  prevNew.push(l);
      }

      if (CLOSED_SET.has(s) && updatedAt) {
        if (updatedAt >= weekAgo)                           thisClosed.push(l);
        else if (updatedAt >= twoWeeksAgo && updatedAt < weekAgo) prevClosed.push(l);
      }

      if (!TERMINAL_SET.has(s) && s !== "new" && s !== "nuevo" && updatedAt && updatedAt >= weekAgo) {
        thisManaged.push(l);
      }
    }

    const kpiData = [
      {
        label: "Consultas nuevas",
        value: thisNew.length,
        delta: delta(thisNew.length, prevNew.length),
        sub: "vs. semana anterior",
      },
      {
        label: "Cerrados / vendidos",
        value: thisClosed.length,
        delta: delta(thisClosed.length, prevClosed.length),
        sub: "vs. semana anterior",
      },
      {
        label: "En gestión activa",
        value: thisManaged.length,
        delta: null,
        sub: "consultas actualizadas esta semana",
      },
    ];

    // Mini funnel for this week's leads
    const funnelThisWeek = [
      { label: "Nuevos",       count: thisNew.filter(l => ["new","nuevo"].includes(norm(l.crm_status))).length,             cls: "info" },
      { label: "Contactados",  count: thisNew.filter(l => ["seen","contacted","contactado"].includes(norm(l.crm_status))).length, cls: "" },
      { label: "Negociación",  count: thisNew.filter(l => ["negotiation","in_progress","en_gestion","assigned","asignado"].includes(norm(l.crm_status))).length, cls: "warning" },
      { label: "Cerrados",     count: thisClosed.length,                                                                    cls: "success" },
    ].filter(f => f.count > 0);

    const maxFunnel = Math.max(...funnelThisWeek.map(f => f.count), 1);

    // Top vehicle by leads created this week
    const leadsByVehicle = {};
    for (const l of thisNew) {
      const vid = String(l.vehicle_id || "");
      if (vid) leadsByVehicle[vid] = (leadsByVehicle[vid] || 0) + 1;
    }
    let topVehicleData = null;
    let topCount = 0;
    for (const v of vehicles) {
      const count = leadsByVehicle[String(v.vehicle_id || "")] || 0;
      if (count > topCount) { topCount = count; topVehicleData = v; }
    }

    return {
      weekLabel: label,
      kpis: kpiData,
      funnel: { stages: funnelThisWeek, max: maxFunnel },
      topVehicle: topVehicleData ? { vehicle: topVehicleData, leads: topCount } : null,
    };
  }, [leads, vehicles]);

  const mainRec = recommendations[0] ?? null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="dealer-weekly-modal">
        {/* Header */}
        <div className="dealer-weekly-head">
          <div>
            <p className="eyebrow">Reporte semanal</p>
            <h2>Resumen de actividad</h2>
            <p className="dealer-weekly-period">{weekLabel}</p>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        {/* KPI row */}
        <div className="dealer-weekly-kpis">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="dealer-weekly-kpi">
              <span className="dealer-weekly-kpi__label">{kpi.label}</span>
              <strong className="dealer-weekly-kpi__value">{kpi.value}</strong>
              <div className="dealer-weekly-kpi__foot">
                {kpi.delta ? (
                  <span className={`admin-chip ${kpi.delta.cls}`}>{kpi.delta.text}</span>
                ) : (
                  <span className="dealer-weekly-kpi__sub">{kpi.sub}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mini funnel */}
        {funnel.stages.length > 0 && (
          <div className="dealer-weekly-section">
            <h3 className="dealer-weekly-section__title">Consultas nuevas por estado</h3>
            <div className="dealer-weekly-funnel">
              {funnel.stages.map((s) => (
                <div key={s.label} className="dealer-weekly-funnel-row">
                  <span className="dealer-weekly-funnel-label">{s.label}</span>
                  <div className="dealer-weekly-funnel-bar-wrap">
                    <div
                      className={`dealer-weekly-funnel-bar ${s.cls}`}
                      style={{ width: `${Math.round((s.count / funnel.max) * 100)}%` }}
                    />
                  </div>
                  <span className={`admin-chip ${s.cls}`}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top vehicle */}
        {topVehicle && (
          <div className="dealer-weekly-section">
            <h3 className="dealer-weekly-section__title">Publicación más consultada esta semana</h3>
            <div className="dealer-weekly-top-vehicle">
              <div className="dealer-weekly-top-vehicle__info">
                <strong>
                  {topVehicle.vehicle.brand} {topVehicle.vehicle.model}
                  {topVehicle.vehicle.version ? ` · ${topVehicle.vehicle.version}` : ""}
                </strong>
                <span>{topVehicle.vehicle.year || ""}</span>
              </div>
              <span className="admin-chip info">{topVehicle.leads} consulta{topVehicle.leads !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}

        {/* Recommendation */}
        {mainRec && (
          <div className="dealer-weekly-section">
            <h3 className="dealer-weekly-section__title">Recomendación principal</h3>
            <div className={`dealer-weekly-rec dealer-weekly-rec--${mainRec.level}`}>
              <p>{mainRec.text}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="dealer-weekly-footer">
          <button
            type="button"
            className="table-action-btn"
            onClick={onCopy}
            disabled={copyState === "copied"}
          >
            {copyState === "copied" ? "¡Copiado!" : copyState === "error" ? "Error al copiar" : "Copiar reporte completo"}
          </button>
          <button type="button" className="table-action-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </section>
    </div>
  );
}
