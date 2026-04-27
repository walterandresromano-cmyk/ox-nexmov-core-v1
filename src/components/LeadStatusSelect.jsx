import { useEffect, useState } from "react";
import { updateVehicleLeadStatus } from "../services/leads.service.js";

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "Nuevo" },
  { value: "seen", label: "Visto" },
  { value: "contacted", label: "Contactado" },
  { value: "negotiation", label: "Negociación" },
  { value: "reserved", label: "Reservado" },
  { value: "sold", label: "Vendido" },
  { value: "lost", label: "Perdido" },
  { value: "no_response", label: "Sin respuesta" },
  { value: "closed", label: "Cerrado" },
];

export default function LeadStatusSelect({ lead, onUpdated }) {
  const [value, setValue] = useState(lead.crm_status || "new");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(lead.crm_status || "new");
  }, [lead.crm_status]);

  async function handleChange(event) {
    const previousStatus = value;
    const nextStatus = event.target.value;

    setValue(nextStatus);
    setLoading(true);
    setError("");
    setSaved(false);

    const { error: updateError } = await updateVehicleLeadStatus({
      leadId: lead.lead_id,
      crmStatus: nextStatus,
    });

    if (updateError) {
      setError(updateError.message || "No se pudo actualizar el lead.");
      setValue(previousStatus);
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
    }, 1800);
  }

  return (
    <div className="lead-status-control">
      <select value={value} onChange={handleChange} disabled={loading}>
        {LEAD_STATUS_OPTIONS.map((option) => (
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