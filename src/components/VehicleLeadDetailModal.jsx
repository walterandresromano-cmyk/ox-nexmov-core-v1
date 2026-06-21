import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import LeadStatusSelect from "./LeadStatusSelect.jsx";
import { assignVehicleToBuyerGarage } from "../services/buyerGarage.service.js";
import { updateVehicleLeadStatus } from "../services/leads.service.js";
import { normalizeWhatsAppArgentina } from "../lib/formatters.js";

function getWhatsAppLink(phone) {
  const normalized = normalizeWhatsAppArgentina(phone);
  return normalized ? `https://wa.me/${normalized}` : null;
}

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

function getCloseReason(lead) {
  const notes = String(lead?.notes || "");
  const noteReason = notes.match(/Motivo de cierre:\s*(.+)/i)?.[1]?.trim();

  return (
    lead?.close_reason ||
    lead?.closed_reason ||
    lead?.lost_reason ||
    lead?.loss_reason ||
    lead?.closing_reason ||
    lead?.closeReason ||
    lead?.lostReason ||
    noteReason ||
    ""
  );
}

function getLeadTimeline(lead, closeReason) {
  const items = [];

  if (lead?.created_at) {
    items.push({
      label: "Consulta creada",
      value: formatDateTime(lead.created_at),
      text: "El comprador genero la consulta comercial.",
    });
  }

  if (lead?.crm_status && lead.crm_status !== "new") {
    items.push({
      label: "Estado actualizado",
      value: getStatusLabel(lead.crm_status),
      text: "El dealer actualizo el seguimiento del lead.",
    });
  }

  if (lead?.next_action_date || lead?.next_action_note) {
    items.push({
      label: "Seguimiento programado",
      value: lead.next_action_date ? formatDateTime(lead.next_action_date) : "Sin fecha",
      text: lead.next_action_note || "Proxima accion comercial cargada.",
    });
  }

  if (closeReason) {
    items.push({
      label: "Motivo comercial",
      value: closeReason,
      text: "Motivo informado para el cierre o pérdida.",
    });
  }

  if (lead?.updated_at && lead.updated_at !== lead.created_at) {
    items.push({
      label: "Ultima actualizacion",
      value: formatDateTime(lead.updated_at),
      text: "Ultimo movimiento registrado en el seguimiento.",
    });
  }

  return items;
}

export default function VehicleLeadDetailModal({ lead, onClose, onUpdated }) {
  const [notes, setNotes] = useState(lead?.notes || "");
  const [nextActionNote, setNextActionNote] = useState(lead?.next_action_note || "");
  const [nextActionDate, setNextActionDate] = useState(lead?.next_action_date || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [assigningGarage, setAssigningGarage]   = useState(false);
  const [garageConfirming, setGarageConfirming] = useState(false);
  const [garageMessage, setGarageMessage]       = useState("");
  const [garageError, setGarageError]           = useState("");

  useEffect(() => {
    setNotes(lead?.notes || "");
    setNextActionNote(lead?.next_action_note || "");
    setNextActionDate(lead?.next_action_date || "");
  }, [lead?.notes, lead?.next_action_note, lead?.next_action_date]);

  if (!lead) return null;
  const closeReason = getCloseReason(lead);
  const leadTimeline = getLeadTimeline(lead, closeReason);

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setNotesError("");

    const { error } = await updateVehicleLeadStatus({
      leadId: lead.lead_id,
      crmStatus: lead.crm_status || "new",
      notes,
      nextActionNote: nextActionNote.trim() || null,
      nextActionDate: nextActionDate || null,
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

  async function handleAssignGarage() {
    setAssigningGarage(true);
    setGarageConfirming(false);
    setGarageMessage("");
    setGarageError("");

    const { error } = await assignVehicleToBuyerGarage({
      leadId: lead.lead_id,
      vehicleId: lead.vehicle_id,
      note: "Asignación directa desde detalle de lead.",
    });

    if (error) {
      setGarageError(error.message || "No se pudo asignar la unidad al Garage oX.");
      setAssigningGarage(false);
      return;
    }

    setGarageMessage("Unidad asignada al Garage oX del comprador.");
    setAssigningGarage(false);

    if (onUpdated) {
      await onUpdated();
    }
  }

  return createPortal(
    <div className="modal-backdrop">
      <section className="ticket-detail-modal" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Detalle de lead comercial</p>
            <h2 id="lead-detail-title">Lead #{lead.lead_id}</h2>
            <p>
              Consulta generada desde una publicación de vehículo usado o
              disponible en oX NEXMOV.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
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
            {lead.buyer_phone && (() => {
              const waLink = getWhatsAppLink(lead.buyer_phone);
              return waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lead-whatsapp-btn lead-whatsapp-btn--modal"
                >
                  Contactar por WhatsApp
                </a>
              ) : null;
            })()}
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

          <article className="ticket-detail-card ticket-detail-main vehicle-lead-garage-assignment">
            <span>Garage oX</span>
            <strong>Asignación directa al comprador</strong>
            <p>
              Usa este lead para asociar la unidad al comprador identificado por
              nombre, email o teléfono.
            </p>
            {garageConfirming ? (
              <div className="garage-assign-confirm">
                <small className="garage-assign-confirm__label">
                  ¿Asignar al Garage oX del comprador?
                </small>
                <div className="garage-assign-confirm__btns">
                  <button
                    type="button"
                    className="table-action-btn table-action-btn--danger"
                    onClick={handleAssignGarage}
                    disabled={assigningGarage}
                  >
                    Sí, asignar
                  </button>
                  <button
                    type="button"
                    className="table-action-btn"
                    onClick={() => setGarageConfirming(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="table-action-btn"
                onClick={() => { setGarageConfirming(true); setGarageError(""); }}
                disabled={assigningGarage || !lead.vehicle_id || !lead.lead_id}
              >
                {assigningGarage ? "Asignando..." : "Asignar a Garage oX"}
              </button>
            )}
            {garageMessage && (
              <small className="garage-assign-success">{garageMessage}</small>
            )}
            {garageError && (
              <small className="garage-assign-error">{garageError}</small>
            )}
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

          {closeReason && (
            <article className="ticket-detail-card">
              <span>Motivo registrado</span>
              <strong>{closeReason}</strong>
              <p>Motivo de cierre o pérdida informado para este lead.</p>
            </article>
          )}

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

          <article className="ticket-detail-card ticket-detail-main vehicle-lead-timeline-card">
            <span>Timeline comercial</span>
            <strong>Historial del seguimiento</strong>
            <div className="vehicle-lead-timeline">
              {leadTimeline.map((item) => (
                <div key={`${item.label}-${item.value}`} className="vehicle-lead-timeline-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
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
              rows={5}
              placeholder="Ej: Se llamó al comprador, no respondió. Consultó financiación y aceptaría permuta."
            />
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Seguimiento</span>

            <div className="lead-followup-form">
              <label className="lead-followup-label">
                Próxima acción
                <input
                  type="text"
                  className="lead-followup-input"
                  value={nextActionNote}
                  onChange={(event) => {
                    setNextActionNote(event.target.value);
                    setNotesSaved(false);
                    setNotesError("");
                  }}
                  placeholder="Ej: Llamar para confirmar visita, enviar cotización..."
                />
              </label>

              <label className="lead-followup-label">
                Fecha de seguimiento
                <input
                  type="date"
                  className="lead-followup-input lead-followup-date"
                  value={nextActionDate}
                  onChange={(event) => {
                    setNextActionDate(event.target.value);
                    setNotesSaved(false);
                    setNotesError("");
                  }}
                />
              </label>
            </div>

            <div className="lead-notes-actions">
              <button
                className="table-action-btn"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? "Guardando..." : "Guardar"}
              </button>

              {notesSaved && <span>Guardado</span>}
              {notesError && <small>{notesError}</small>}
            </div>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Gestión del estado</span>
            <LeadStatusSelect lead={lead} onUpdated={onUpdated} />
          </article>
        </div>
      </section>
    </div>,
    document.body
  );
}
