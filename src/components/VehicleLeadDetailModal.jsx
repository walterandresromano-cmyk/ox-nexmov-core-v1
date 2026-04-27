import { useEffect, useState } from "react";

import LeadStatusSelect from "./LeadStatusSelect.jsx";
import { updateVehicleLeadStatus } from "../services/leads.service.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatARS(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function getStatusLabel(status) {
  const labels = {
    new: "Nuevo",
    seen: "Visto",
    contacted: "Contactado",
    negotiation: "Negociación",
    reserved: "Reservado",
    sold: "Vendido",
    lost: "Perdido",
    no_response: "Sin respuesta",
    closed: "Cerrado",
  };

  return labels[status] || status || "Sin estado";
}

export default function VehicleLeadDetailModal({ lead, onClose, onUpdated }) {
  const [notes, setNotes] = useState(lead?.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    setNotes(lead?.notes || "");
  }, [lead?.notes]);

  if (!lead) return null;

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setNotesError("");

    const { error } = await updateVehicleLeadStatus({
      leadId: lead.lead_id,
      crmStatus: lead.crm_status || "new",
      notes,
    });

    if (error) {
      setNotesError(error.message || "No se pudieron guardar las notas.");
      setSavingNotes(false);
      return;
    }

    setSavingNotes(false);
    setNotesSaved(true);

    if (onUpdated) {
      await onUpdated();
    }

    window.setTimeout(() => {
      setNotesSaved(false);
    }, 1600);
  }

  return (
    <div className="modal-backdrop">
      <section className="ticket-detail-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Detalle de lead comercial</p>
            <h2>Lead #{lead.lead_id}</h2>
            <p>
              Consulta generada desde una publicación de vehículo usado o
              disponible en oX NEXMOV.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ticket-detail-grid">
          <article className="ticket-detail-card ticket-detail-main">
            <span>Comprador</span>
            <strong>
              {lead.buyer_first_name || "Sin nombre"}{" "}
              {lead.buyer_last_name || ""}
            </strong>
            <p>{lead.buyer_email || "Email no informado"}</p>
            <p>{lead.buyer_phone || "Teléfono no informado"}</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Vehículo consultado</span>
            <strong>
              {lead.vehicle_brand || "Marca no informada"}{" "}
              {lead.vehicle_model || "Modelo no informado"}
            </strong>
            <p>
              {lead.vehicle_version ||
                lead.vehicle_title_snapshot ||
                "Sin versión"}
            </p>
            <p>Vehículo ID: {lead.vehicle_id || "No informado"}</p>
          </article>

          <article className="ticket-detail-card">
            <span>Dealer</span>
            <strong>
              {lead.dealer_name_real ||
                lead.dealer_name_snapshot ||
                "Dealer no informado"}
            </strong>
            <p>{lead.dealer_phone_snapshot || "Teléfono no informado"}</p>
          </article>

          <article className="ticket-detail-card">
            <span>Precio snapshot</span>
            <strong>{formatARS(lead.price_snapshot)}</strong>
            <p>Precio registrado al momento de crear el lead.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Canal</span>
            <strong>{lead.channel || "contact_gate"}</strong>
            <p>{lead.action_type || "vehicle_contact"}</p>
          </article>

          <article className="ticket-detail-card">
            <span>Estado actual</span>
            <strong>{getStatusLabel(lead.crm_status)}</strong>
            <p>Estado comercial de seguimiento.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Fecha de creación</span>
            <strong>{formatDateTime(lead.created_at)}</strong>
            <p>Momento en que el comprador generó la consulta.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Última actualización</span>
            <strong>{formatDateTime(lead.updated_at)}</strong>
            <p>Último movimiento comercial registrado.</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Mensaje del comprador</span>
            <p>{lead.message || "Sin mensaje adicional."}</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Notas internas</span>

            <textarea
              className="lead-notes-textarea"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setNotesSaved(false);
                setNotesError("");
              }}
              rows={6}
              placeholder="Ej: Se llamó al comprador, no respondió. Volver a intentar mañana. Consultó financiación y aceptaría permuta."
            />

            <div className="lead-notes-actions">
              <button
                className="table-action-btn"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? "Guardando..." : "Guardar notas"}
              </button>

              {notesSaved && <span>Notas guardadas</span>}
              {notesError && <small>{notesError}</small>}
            </div>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Gestión del estado</span>
            <LeadStatusSelect lead={lead} onUpdated={onUpdated} />
          </article>
        </div>
      </section>
    </div>
  );
}