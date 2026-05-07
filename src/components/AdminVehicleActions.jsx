import { useState } from "react";
import { updateAdminVehicleStatus } from "../services/adminVehicles.service.js";

const ACTIONS = [
  { value: "approve_review", label: "Aprobar revisión" },
  { value: "pause", label: "Pausar" },
  { value: "reactivate", label: "Reactivar" },
  { value: "reserve", label: "Reservar" },
  { value: "mark_sold", label: "Vendido" },
  { value: "send_to_review", label: "Enviar a revisión" },
];

function confirmAdminVehicleAction(action) {
  const messages = {
    approve_review:
      "Confirmá que revisaste la información comercial antes de aprobar esta publicación.",
    pause:
      "Esta publicación dejará de estar visible para compradores. ¿Querés pausarla?",
    reactivate:
      "Esta publicación volverá a estar disponible según las reglas comerciales del dealer. ¿Querés reactivarla?",
    reserve: "Confirmá que esta publicación debe marcarse como reservada.",
    mark_sold: "Confirmá que esta publicación debe marcarse como vendida.",
    send_to_review:
      "Esta publicación volverá a revisión para que el dealer corrija la información. ¿Querés continuar?",
  };

  const message = messages[action];

  if (!message) return true;

  return window.confirm(message);
}

export default function AdminVehicleActions({ vehicle, onUpdated }) {
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    if (!action) {
      setError("Elegí una acción.");
      return;
    }

    if (!confirmAdminVehicleAction(action)) {
      return;
    }

    setLoading(true);
    setSaved(false);
    setError("");

    const { error: updateError } = await updateAdminVehicleStatus({
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
        <option value="">Acción admin</option>
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
