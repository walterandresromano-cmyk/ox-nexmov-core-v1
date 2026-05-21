import { useEffect, useState } from "react";
import { updateSellVehicleLeadAdmin } from "../services/sellVehicle.service.js";

const STATUS_OPTIONS = [
  { value: "new", label: "Nueva" },
  { value: "seen", label: "Vista" },
  { value: "assigned", label: "Asignada" },
  { value: "contacted", label: "Contactado" },
  { value: "negotiation", label: "Negociación" },
  { value: "closed", label: "Cerrada" },
  { value: "lost", label: "Perdida" },
];

export default function SellVehicleLeadStatusSelect({ lead, onUpdated }) {
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

    const { error: updateError } = await updateSellVehicleLeadAdmin({
      leadId: lead.lead_id,
      status: nextStatus,
    });

    if (updateError) {
      setValue(previousStatus);
      setError(updateError.message || "No se pudo actualizar la solicitud.");
      setLoading(false);
      return;
    }

    setSaved(true);
    setLoading(false);

    if (onUpdated) {
      await onUpdated();
    }

    window.setTimeout(() => setSaved(false), 1600);
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