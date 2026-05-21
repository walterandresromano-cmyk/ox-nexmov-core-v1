function formatLimit(limit) {
  return limit === Infinity ? "Ilimitado" : limit;
}

function getPlanAlertClass(days) {
  if (days <= 0) return "plan-alert expired";
  if (days <= 2) return "plan-alert critical";
  if (days <= 6) return "plan-alert urgent";
  if (days <= 14) return "plan-alert warning";
  return "plan-alert healthy";
}

function getPlanAlertLabel(days) {
  if (days <= 0) return "Período vencido";
  if (days <= 2) return `Vence en ${days} días`;
  if (days <= 6) return `Vencimiento cercano · ${days} días`;
  if (days <= 14) return `Próximo a vencer · ${days} días`;
  return `Activo · ${days} días restantes`;
}

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
  isPlatinum,
  rankLabel,
  onRefresh,
  onBack,
  onOpenInventory,
  onOpenLeads,
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

      <div
        className={`dealer-metrics-period ${getPlanAlertClass(expiresInDays)}`}
      >
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

      <div className="dealer-status-grid">
        <article className="dealer-status-card">
          <span>Vistas totales</span>
          <strong>{totalDetailViews}</strong>
          <p>
            {dealerVehicles.length > 0
              ? `Promedio: ${avgViewsPerVehicle.toFixed(1)} vistas por publicación`
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
          <span>Publicaciones activas</span>
          <strong>{activeVehiclesCount}</strong>
          <p>
            {dealerVehicles.length > 0
              ? `${Math.round((activeVehiclesCount / dealerVehicles.length) * 100)}% del total cargado`
              : "Sin publicaciones"}
          </p>
        </article>

        <article className="dealer-status-card">
          <span>{coverageOk ? "Cobertura de vistas" : "Sin vistas"}</span>
          <strong>{coverageOk ? "100%" : zeroViewsVehicles.length}</strong>
          <p>
            {coverageOk
              ? "Todas las publicaciones activas recibieron al menos una visita."
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

      {dealerVehicles.length > 0 && (
        <div className="admin-table-wrap dealer-metrics-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Publicación</th>
                <th>Vistas</th>
                <th>vs. promedio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {[...dealerVehicles]
                .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
                .map((vehicle) => {
                  const views = Number(vehicle.views ?? 0);
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
    </div>
  );
}
