import { useState } from "react";
import { updateCurrentDealerVehicleStatus } from "../services/dealerVehicles.service.js";

const ACTIONS = [
  {
    value: "pause",
    label: "Pausar",
    confirmText:
      "Esta publicación dejará de estar visible para compradores. ¿Querés pausarla?",
  },
  {
    value: "reactivate",
    label: "Reactivar",
    confirmText:
      "La publicación volverá a estar disponible si cumple las reglas comerciales del dealer. ¿Querés continuar?",
  },
  {
    value: "reserve",
    label: "Reservar",
    confirmText: "Confirmá que esta publicación debe marcarse como reservada.",
  },
  {
    value: "mark_sold",
    label: "Vendido",
    confirmText: "Confirmá que esta publicación debe marcarse como vendida.",
  },
  {
    value: "send_to_review",
    label: "Enviar a revisión",
    confirmText:
      "La publicación volverá a revisión para corregir información. ¿Querés continuar?",
  },
];

export default function DealerVehicleActions({ vehicle, onUpdated, onMarkSold }) {
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const selectedAction = ACTIONS.find((item) => item.value === action);

  async function handleApply() {
    if (!action) {
      setError("Elegí una acción.");
      return;
    }

    if (selectedAction?.confirmText && !awaitingConfirm) {
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
      setError(updateError.message || "No se pudo modificar la publicación.");
      setLoading(false);
      return;
    }

    setSaved(true);
    setLoading(false);

    const wasMarkSold = action === "mark_sold";
    setAction("");

    if (onUpdated) {
      await onUpdated();
    }

    if (wasMarkSold && onMarkSold) {
      onMarkSold(vehicle);
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
        <option value="">Acción</option>
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

      {awaitingConfirm && (
        <small>
          {selectedAction?.confirmText || "Confirmá para aplicar esta acción."}
        </small>
      )}
      {saved && <span>Actualizado</span>}
      {error && <small>{error}</small>}
    </div>
  );
}
