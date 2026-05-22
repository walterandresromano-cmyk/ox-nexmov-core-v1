import { useState } from "react";

import LeadStatusSelect from "../../components/LeadStatusSelect.jsx";
import VehicleLeadDetailModal from "../../components/VehicleLeadDetailModal.jsx";
import { updateVehicleLeadStatus } from "../../services/leads.service.js";
import { formatRelativeTime, normalizeWhatsAppArgentina } from "../../lib/formatters.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function getWhatsAppLink(phone) {
  const normalized = normalizeWhatsAppArgentina(phone);
  return normalized ? `https://wa.me/${normalized}` : null;
}

function getFollowUpState(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(dateStr + "T00:00:00");
  if (followUp < today) return "overdue";
  if (followUp.getTime() === today.getTime()) return "today";
  return "upcoming";
}

function formatFollowUpDate(dateStr) {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"));
}

export default function DealerLeadsModule({ leads, onRefresh, onBack }) {
  const [selectedLead, setSelectedLead] = useState(null);

  async function handleOpenLead(lead) {
    setSelectedLead(lead);

    if (lead.crm_status === "new") {
      await updateVehicleLeadStatus({
        leadId: lead.lead_id,
        crmStatus: "seen",
      });
      onRefresh();
    }
  }

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
              {leads.map((lead) => {
                const waLink = getWhatsAppLink(lead.buyer_phone);
                const isNew = lead.crm_status === "new";
                const followUpState = getFollowUpState(lead.next_action_date);

                return (
                  <tr
                    key={lead.lead_id}
                    className={isNew ? "lead-row--new" : ""}
                  >
                    <td>
                      <strong title={formatDateTime(lead.created_at)}>
                        {formatRelativeTime(lead.created_at)}
                      </strong>
                      <span>Lead #{lead.lead_id}</span>
                      {isNew && (
                        <span className="lead-new-badge">Nuevo</span>
                      )}
                      {(followUpState || lead.next_action_note) && (
                        <span className="lead-followup-block">
                          {followUpState && (
                            <span className={`lead-followup-chip lead-followup-chip--${followUpState}`}>
                              {followUpState === "overdue" && "Vencido: "}
                              {followUpState === "today" && "Hoy: "}
                              {followUpState === "upcoming" && "Próxima acción: "}
                              {formatFollowUpDate(lead.next_action_date)}
                            </span>
                          )}
                          {lead.next_action_note && (
                            <span
                              className="lead-followup-note"
                              title={lead.next_action_note}
                            >
                              {lead.next_action_note}
                            </span>
                          )}
                        </span>
                      )}
                    </td>

                    <td>
                      <strong>
                        {lead.buyer_first_name} {lead.buyer_last_name}
                      </strong>
                      <span>{lead.buyer_email}</span>
                      {lead.buyer_phone && (
                        <span className="lead-buyer-phone">
                          {lead.buyer_phone}
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lead-whatsapp-btn"
                            >
                              WhatsApp
                            </a>
                          )}
                        </span>
                      )}
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
                        onClick={() => handleOpenLead(lead)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
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
