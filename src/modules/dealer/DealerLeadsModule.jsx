import { useState } from "react";

import LeadStatusSelect from "../../components/LeadStatusSelect.jsx";
import VehicleLeadDetailModal from "../../components/VehicleLeadDetailModal.jsx";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default function DealerLeadsModule({ leads, onRefresh, onBack }) {
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Leads recibidos</h2>
          <p>Consultas generadas desde publicaciones asociadas a este dealer.</p>
        </div>
        <button className="admin-refresh-btn" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="empty-state">
          Todavía no hay leads reales para mostrar.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Comprador</th>
                <th>Vehículo</th>
                <th>Mensaje</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr key={lead.lead_id}>
                  <td>
                    <strong>{formatDateTime(lead.created_at)}</strong>
                    <span>Lead #{lead.lead_id}</span>
                  </td>

                  <td>
                    <strong>
                      {lead.buyer_first_name} {lead.buyer_last_name}
                    </strong>
                    <span>{lead.buyer_email}</span>
                    <span>{lead.buyer_phone}</span>
                  </td>

                  <td>
                    <strong>
                      {lead.vehicle_brand} {lead.vehicle_model}
                    </strong>
                    <span>{lead.vehicle_version}</span>
                    <span>{lead.vehicle_title_snapshot}</span>
                  </td>

                  <td>
                    <span>{lead.message || "Sin mensaje."}</span>
                  </td>

                  <td>
                    <LeadStatusSelect lead={lead} onUpdated={onRefresh} />
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
        <VehicleLeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
}
