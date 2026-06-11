import { useEffect, useState } from "react";

import TicketStatusSelect from "./TicketStatusSelect.jsx";
import TicketChat from "./TicketChat.jsx";
import { updateSupportTicketStatus } from "../services/tickets.service.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
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

function getCategoryLabel(category) {
  const labels = {
    general: "General",
    technical: "Técnico",
    billing: "Facturación",
    publication: "Publicación",
    lead: "Lead",
    account: "Cuenta",
    urgent_review: "Revisión urgente",
  };

  return labels[category] || category || "Sin categoría";
}

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "soporte") return "support";
  if (value === "internal_0km") return "internal0km";
  if (value === "comprador") return "buyer";

  return value;
}

function getTicketPlanValue(ticket) {
  return String(
    ticket?.dealer_plan ||
      ticket?.dealer_plan_code ||
      ticket?.dealerPlan ||
      ticket?.plan_code ||
      ticket?.plan ||
      ticket?.rank ||
      ""
  )
    .trim()
    .toLowerCase();
}

export default function TicketDetailModal({
  ticket,
  onClose,
  onUpdated,
  authProfile,
  appActions,
}) {
  const viewerRole = normalizeRole(authProfile?.role || appActions?.authProfile?.role);
  const canEditSupportNotes = viewerRole === "admin" || viewerRole === "support";

  const [adminNotes, setAdminNotes] = useState(ticket?.admin_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    setAdminNotes(ticket?.admin_notes || "");
  }, [ticket?.admin_notes]);

  if (!ticket) return null;

  const isPlatinumTicket = getTicketPlanValue(ticket) === "platinum";

  async function handleSaveSupportNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setNotesError("");

    const { error } = await updateSupportTicketStatus({
      ticketId: ticket.ticket_id,
      status: ticket.status || "open",
      adminNotes,
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
            <p className="eyebrow">Detalle de ticket</p>
            <h2>Ticket #{ticket.ticket_id}</h2>
            <p>
              Caso interno entre dealer, administración y soporte de oX NEXMOV.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ticket-detail-grid">
          <article className="ticket-detail-card ticket-detail-main">
            <span>Asunto</span>
            <strong>{ticket.subject}</strong>
          </article>

          {/* Chat thread — full width */}
          <article className="ticket-detail-card ticket-detail-main ticket-detail-chat">
            <TicketChat
              ticketId={ticket.ticket_id}
              initialMessage={ticket.message}
              authProfile={authProfile || appActions?.authProfile}
            />
          </article>

          <article className="ticket-detail-card">
            <span>Dealer</span>
            <strong>{ticket.dealer_name || "Sin dealer asociado"}</strong>
            <p>ID dealer: {ticket.dealer_id || "No informado"}</p>
            {isPlatinumTicket && (
              <div className="ticket-platinum-priority-note">
                <span>Prioridad Platinum</span>
                <p>Dealer Platinum identificado para seguimiento interno.</p>
              </div>
            )}
          </article>

          <article className="ticket-detail-card">
            <span>Creado por</span>
            <strong>{ticket.created_by_email || "Sin usuario"}</strong>
            <p>{ticket.created_by_role || "Rol no informado"}</p>
          </article>

          <article className="ticket-detail-card">
            <span>Asignado a</span>
            <strong>{ticket.assigned_to_email || "Sin asignar"}</strong>
            <p>
              Al cambiar el estado desde soporte/admin, el ticket puede quedar
              tomado por ese usuario.
            </p>
          </article>

          <article className="ticket-detail-card">
            <span>Categoría</span>
            <strong>{getCategoryLabel(ticket.category)}</strong>
            <p>Tipo operativo del caso.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Prioridad</span>
            <strong>{getPriorityLabel(ticket.priority)}</strong>
            <p>Impacto declarado al momento de crear el ticket.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Fecha de creación</span>
            <strong>{formatDateTime(ticket.created_at)}</strong>
            <p>Inicio del caso.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Última actualización</span>
            <strong>{formatDateTime(ticket.updated_at)}</strong>
            <p>Último movimiento registrado.</p>
          </article>

          {canEditSupportNotes && (
            <article className="ticket-detail-card ticket-detail-main">
              <span>Notas internas de soporte</span>

              <textarea
                className="lead-notes-textarea"
                value={adminNotes}
                onChange={(event) => {
                  setAdminNotes(event.target.value);
                  setNotesSaved(false);
                  setNotesError("");
                }}
                rows={6}
                placeholder="Ej: Se revisó el caso. Falta respuesta del dealer. Derivar a administración si persiste."
              />

              <div className="lead-notes-actions">
                <button
                  className="table-action-btn"
                  type="button"
                  onClick={handleSaveSupportNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? "Guardando..." : "Guardar notas"}
                </button>

                {notesSaved && <span>Notas guardadas</span>}
                {notesError && <small>{notesError}</small>}
              </div>
            </article>
          )}

          {!canEditSupportNotes && (
            <article className="ticket-detail-card ticket-detail-main">
              <span>Seguimiento de soporte</span>
              <p>
                Soporte o administración revisará este caso. Las notas internas
                no son visibles para dealer.
              </p>
            </article>
          )}

          <article className="ticket-detail-card ticket-detail-main">
            <span>Estado del ticket</span>
            <TicketStatusSelect ticket={ticket} onUpdated={onUpdated} />
          </article>
        </div>
      </section>
    </div>
  );
}
