import { useEffect, useState } from "react";
import { updateSupportTicketStatus } from "../services/tickets.service.js";

const TICKET_STATUS_OPTIONS = [
  { value: "new", label: "Nuevo" },
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En proceso" },
  { value: "waiting_dealer", label: "Espera dealer" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
];

export default function TicketStatusSelect({
  ticket,
  onUpdated,
  adminNotes = null,
}) {
  const [value, setValue] = useState(ticket.status || "new");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(ticket.status || "new");
  }, [ticket.status]);

  async function handleChange(event) {
    const previousStatus = value;
    const nextStatus = event.target.value;

    setValue(nextStatus);
    setLoading(true);
    setSaved(false);
    setError("");

    const { error: updateError } = await updateSupportTicketStatus({
      ticketId: ticket.ticket_id,
      status: nextStatus,
      adminNotes,
    });

    if (updateError) {
      setValue(previousStatus);
      setError(updateError.message || "No se pudo actualizar el ticket.");
      setLoading(false);
      return;
    }

    setSaved(true);
    setLoading(false);

    if (onUpdated) {
      await onUpdated();
    }

    window.setTimeout(() => {
      setSaved(false);
    }, 1600);
  }

  return (
    <div className="lead-status-control">
      <select value={value} onChange={handleChange} disabled={loading}>
        {TICKET_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {loading && <span>Guardando...</span>}
      {saved && <span>Guardado</span>}
      {error && <small>{error}</small>}
    </div>
  );
}