import { useState } from "react";

import DealerSellVehicleLeadDetailModal from "../../components/DealerSellVehicleLeadDetailModal.jsx";
import DealerSellVehicleLeadStatusSelect from "../../components/DealerSellVehicleLeadStatusSelect.jsx";
import { formatARS } from "../../lib/formatters.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default function DealerSellVehicleModule({
  sellVehicleLeads,
  isPlatinum,
  onRefresh,
  onBack,
}) {
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Oportunidades Vender mi vehículo</h2>
          <p>
            Solicitudes de compradores asignadas por administración para que el
            vendedor pueda evaluarlas y gestionarlas.
          </p>
        </div>
        <button className="admin-refresh-btn" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      {isPlatinum && (
        <article className="platinum-operational-card platinum-opportunity-state">
          <span className="dealer-platinum-badge">Oportunidades Platinum</span>
          <strong>
            {sellVehicleLeads.length} oportunidades reales asignadas
          </strong>
          <p>
            Tu plan Platinum está habilitado para oportunidades comerciales. Las
            asignaciones dependen del admin y de la operación real.
          </p>
        </article>
      )}

      {sellVehicleLeads.length === 0 ? (
        <div className="empty-state">
          Todavía no tenés oportunidades asignadas de "Vender mi vehículo".
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vendedor</th>
                <th>Vehículo</th>
                <th>Precio esperado</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>

            <tbody>
              {sellVehicleLeads.map((lead) => (
                <tr key={lead.lead_id}>
                  <td>
                    <strong>{formatDateTime(lead.created_at)}</strong>
                    <span>{lead.priority || "normal"}</span>
                  </td>

                  <td>
                    <strong>{lead.full_name}</strong>
                    <span>{lead.email}</span>
                    <span>{lead.phone}</span>
                  </td>

                  <td>
                    <strong>
                      {lead.brand} {lead.model}
                    </strong>
                    <span>{lead.version || "Sin versión"}</span>
                    <span>
                      {lead.year || "Sin año"} ·{" "}
                      {Number(lead.km || 0).toLocaleString("es-AR")} km
                    </span>
                    <span>
                      {lead.city}, {lead.province}
                    </span>
                  </td>

                  <td>
                    <strong>{formatARS(lead.expected_price)}</strong>
                    <span>{lead.condition || "Sin condición"}</span>
                  </td>

                  <td>
                    <DealerSellVehicleLeadStatusSelect
                      lead={lead}
                      onUpdated={onRefresh}
                    />
                  </td>

                  <td>
                    <button
                      className="table-action-btn"
                      onClick={() => setSelectedLead(lead)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLead && (
        <DealerSellVehicleLeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
}
