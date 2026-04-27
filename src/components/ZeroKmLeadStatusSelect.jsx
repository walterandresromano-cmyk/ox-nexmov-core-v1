import { useEffect, useState } from "react";
import { updateZeroKmFinancingLeadStatus } from "../services/zeroKm.service.js";

const STATUS_OPTIONS = [
  { value: "new", label: "Nuevo" },
  { value: "seen", label: "Visto" },
  { value: "contacted", label: "Contactado" },
  { value: "prequalified", label: "Precalificado" },
  { value: "documents_requested", label: "Docs solicitados" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
  { value: "lost", label: "Perdido" },
  { value: "closed", label: "Cerrado" },
];

export default function ZeroKmLeadStatusSelect({ lead, onUpdated }) {
  const [value, setValue] = useState(lead.status || "new");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(lead.status || "new");
  }, [lead.status]);

  async function handleChange(event) {
    const previousStatus = value;
    const nextStatus = event.target.value;

    setValue(nextStatus);
    setLoading(true);
    setSaved(false);
    setError("");

    const { error: updateError } = await updateZeroKmFinancingLeadStatus({
      leadId: lead.lead_id,
      status: nextStatus,
    });

    if (updateError) {
      setValue(previousStatus);
      setError(updateError.message || "No se pudo actualizar el lead 0km.");
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
        {STATUS_OPTIONS.map((option) => (
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