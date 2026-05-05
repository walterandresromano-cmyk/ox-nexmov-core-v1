import { useState } from "react";
import { updateCurrentDealerVehicleStatus } from "../services/dealerVehicles.service.js";

const ACTIONS = [
  { value: "pause", label: "Pausar", needsConfirm: true },
  { value: "reactivate", label: "Reactivar", needsConfirm: false },
  { value: "reserve", label: "Reservar", needsConfirm: true },
  { value: "mark_sold", label: "Vendido", needsConfirm: true },
  { value: "send_to_review", label: "Enviar a revision", needsConfirm: true },
];

export default function DealerVehicleActions({ vehicle, onUpdated }) {
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  async function handleApply() {
    const selectedAction = ACTIONS.find((item) => item.value === action);

    if (!action) {
      setError("Elegi una accion.");
      return;
    }

    if (selectedAction?.needsConfirm && !awaitingConfirm) {
      setAwaitingConfirm(true);
      setError("");
      return;
    }

    setLoading(true);
    setSaved(false);
    setError("");
    setAwaitingConfirm(false);

    const { error: updateError } = await updateCurrentDealerVehicleStatus({
      vehicleId: vehicle.vehicle_id,
      action,
    });

    if (updateError) {
      setError(updateError.message || "No se pudo modificar la publicacion.");
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
          setAwaitingConfirm(false);
        }}
        disabled={loading}
      >
        <option value="">Accion</option>
        {ACTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <button onClick={handleApply} disabled={loading}>
        {loading ? "Aplicando..." : awaitingConfirm ? "Confirmar" : "Aplicar"}
      </button>

      {awaitingConfirm && (
        <button
          type="button"
          className="vehicle-action-cancel"
          onClick={() => setAwaitingConfirm(false)}
          disabled={loading}
        >
          Cancelar
        </button>
      )}

      {awaitingConfirm && <small>Confirma para aplicar esta accion.</small>}
      {saved && <span>Actualizado</span>}
      {error && <small>{error}</small>}
    </div>
  );
}
