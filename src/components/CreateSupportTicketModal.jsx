import { useState } from "react";
import { createDealerSupportTicket } from "../services/tickets.service.js";

const initialForm = {
  subject: "",
  message: "",
  priority: "normal",
  category: "general",
};

export default function CreateSupportTicketModal({
  dealer,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [createdTicket, setCreatedTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    if (!form.subject.trim()) {
      setError("Ingresá un asunto para el ticket.");
      setSubmitting(false);
      return;
    }

    if (!form.message.trim()) {
      setError("Describí la consulta o el problema.");
      setSubmitting(false);
      return;
    }

    const { ticket, error: ticketError } = await createDealerSupportTicket({
      dealerId: dealer?.id,
      subject: form.subject.trim(),
      message: form.message.trim(),
      priority: form.priority,
      category: form.category,
    });

    if (ticketError) {
      setError(ticketError.message || "No se pudo crear el ticket.");
      setSubmitting(false);
      return;
    }

    setCreatedTicket(ticket);
    setSubmitting(false);

    if (onCreated) {
      await onCreated();
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="contact-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Soporte interno</p>
            <h2>Crear ticket</h2>
            <p>
              El ticket queda trazado para que administración o soporte puedan
              responder y dar seguimiento.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {createdTicket ? (
          <div className="lead-created-box">
            <h3>Ticket creado correctamente</h3>
            <p>
              El caso quedó registrado para {dealer?.commercialName}. Soporte o
              administración podrá tomarlo desde su bandeja.
            </p>

            <button className="primary-action" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-summary">
              <span>Dealer</span>
              <strong>{dealer?.commercialName || "Dealer no informado"}</strong>
              <span>
                {dealer?.city || "Sin ciudad"}, {dealer?.province || "Sin provincia"}
              </span>
            </div>

            <label>
              Asunto
              <input
                type="text"
                required
                maxLength={120}
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Ej: No puedo cargar una publicación"
              />
            </label>

            <label>
              Categoría
              <select
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
              >
                <option value="general">General</option>
                <option value="technical">Técnico</option>
                <option value="billing">Facturación</option>
                <option value="publication">Publicación</option>
                <option value="lead">Lead</option>
                <option value="account">Cuenta</option>
                <option value="urgent_review">Revisión urgente</option>
              </select>
            </label>

            <label>
              Prioridad
              <select
                value={form.priority}
                onChange={(event) => updateField("priority", event.target.value)}
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </label>

            <label>
              Mensaje
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Describí el problema o la consulta con la mayor claridad posible."
                rows={5}
                maxLength={2000}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button
              className="primary-action"
              type="submit"
              disabled={
                submitting || !form.subject.trim() || !form.message.trim()
              }
            >
              {submitting ? "Creando ticket..." : "Crear ticket"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
