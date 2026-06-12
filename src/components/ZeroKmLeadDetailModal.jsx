import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import ZeroKmLeadStatusSelect from "./ZeroKmLeadStatusSelect.jsx";
import { updateZeroKmFinancingLeadStatus } from "../services/zeroKm.service.js";

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
    return "Sin entrega declarada";
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
    prequalified: "Precalificado",
    documents_requested: "Documentación solicitada",
    approved: "Aprobado",
    rejected: "Rechazado",
    lost: "Perdido",
    closed: "Cerrado",
  };

  return labels[status] || status || "Sin estado";
}

function getPriorityLabel(priority) {
  const labels = {
    low: "Baja",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  return labels[priority] || priority || "Sin prioridad";
}

export default function ZeroKmLeadDetailModal({ lead, onClose, onUpdated }) {
  const [internalNotes, setInternalNotes] = useState(lead?.internal_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    setInternalNotes(lead?.internal_notes || "");
  }, [lead?.internal_notes]);

  if (!lead) return null;

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setNotesError("");

    const { error } = await updateZeroKmFinancingLeadStatus({
      leadId: lead.lead_id,
      status: lead.status || "new",
      internalNotes,
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

  return createPortal(
    <div className="modal-backdrop">
      <section className="ticket-detail-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Detalle financiación 0km</p>
            <h2>Consulta 0km #{lead.lead_id}</h2>
            <p>
              Lead interno generado desde la pestaña pública Financiación 0km.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ticket-detail-grid">
          <article className="ticket-detail-card ticket-detail-main">
            <span>Contacto</span>
            <strong>{lead.full_name}</strong>
            <p>{lead.email}</p>
            <p>{lead.phone}</p>
            <p>
              {lead.city || "Sin ciudad"}, {lead.province || "Sin provincia"}
            </p>
          </article>

          <article className="ticket-detail-card">
            <span>Marca de interés</span>
            <strong>{lead.brand_interest || "Marca abierta"}</strong>
            <p>{lead.model_interest || "Modelo no especificado"}</p>
          </article>

          <article className="ticket-detail-card">
            <span>Rango de presupuesto</span>
            <strong>{lead.budget_range || "Sin rango declarado"}</strong>
            <p>Dato orientativo cargado por el comprador.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Entrega estimada</span>
            <strong>{formatARS(lead.down_payment)}</strong>
            <p>Entrega aproximada declarada.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Plazo preferido</span>
            <strong>
              {lead.preferred_term_months
                ? `${lead.preferred_term_months} meses`
                : "Sin plazo preferido"}
            </strong>
            <p>Plazo orientativo para simulación.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Situación laboral</span>
            <strong>{lead.employment_type || "No declarada"}</strong>
            <p>{lead.monthly_income_range || "Ingresos no declarados"}</p>
          </article>

          <article className="ticket-detail-card">
            <span>Prioridad</span>
            <strong>{getPriorityLabel(lead.priority)}</strong>
            <p>Prioridad calculada o asignada al lead.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Estado actual</span>
            <strong>{getStatusLabel(lead.status)}</strong>
            <p>Estado operativo interno.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Asignado a</span>
            <strong>{lead.assigned_to_email || "Sin asignar"}</strong>
            <p>
              Al gestionar el lead, puede quedar tomado por admin u operador
              interno.
            </p>
          </article>

          <article className="ticket-detail-card">
            <span>Fecha de creación</span>
            <strong>{formatDateTime(lead.created_at)}</strong>
            <p>Momento en que se generó la consulta.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Última actualización</span>
            <strong>{formatDateTime(lead.updated_at)}</strong>
            <p>Último movimiento registrado.</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Mensaje del comprador</span>
            <p>{lead.message || "Sin mensaje adicional."}</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Notas internas</span>

            <textarea
              className="lead-notes-textarea"
              value={internalNotes}
              onChange={(event) => {
                setInternalNotes(event.target.value);
                setNotesSaved(false);
                setNotesError("");
              }}
              rows={6}
              placeholder="Ej: Se contactó por WhatsApp. Tiene entrega disponible. Solicitar recibo de sueldo. Evaluar crédito prendario."
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
            <ZeroKmLeadStatusSelect lead={lead} onUpdated={onUpdated} />
          </article>
        </div>
      </section>
    </div>,
    document.body
  );
}