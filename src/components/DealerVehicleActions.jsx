import { useState } from "react";
import { updateCurrentDealerVehicleStatus } from "../services/dealerVehicles.service.js";

const ACTIONS = [
  { value: "pause", label: "Pausar" },
  { value: "reactivate", label: "Reactivar" },
  { value: "reserve", label: "Reservar" },
  { value: "mark_sold", label: "Vendido" },
  { value: "send_to_review", label: "Enviar a revisión" },
];

export default function DealerVehicleActions({ vehicle, onUpdated }) {
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    if (!action) {
      setError("Elegí una acción.");
      return;
    }

    setLoading(true);
    setSaved(false);
    setError("");

    const { error: updateError } = await updateCurrentDealerVehicleStatus({
      vehicleId: vehicle.vehicle_id,
      action,
    });

    if (updateError) {
      setError(updateError.message || "No se pudo modificar la publicación.");
      setLoading(false);
      return;
    }

    setSaved(true);
    setLoading(false);
    setAction("");

    if (onUpdated) {
      await onUpdated();
    }

    window.setTimeout(() => {
      setSaved(false);
    }, 1600);
  }

  return (
    <div className="vehicle-action-control">
      <select
        value={action}
        onChange={(event) => {
          setAction(event.target.value);
          setError("");
        }}
        disabled={loading}
      >
        <option value="">Acción</option>
        {ACTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <button onClick={handleApply} disabled={loading}>
        {loading ? "Aplicando..." : "Aplicar"}
      </button>

      {saved && <span>Actualizado</span>}
      {error && <small>{error}</small>}
    </div>
  );
}