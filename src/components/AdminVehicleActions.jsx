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

const CONFIRM_MESSAGES = {
  approve_review:
    "Revisaste la información comercial. Esta publicación quedará aprobada y visible.",
  pause: "Esta publicación dejará de estar visible para compradores.",
  reactivate:
    "Esta publicación volverá a estar disponible según las reglas del dealer.",
  reserve: "La publicación quedará marcada como reservada.",
  mark_sold: "La publicación quedará marcada como vendida. Esta acción es definitiva.",
  send_to_review:
    "La publicación volverá a revisión para que el dealer corrija la información.",
};

export default function AdminVehicleActions({ vehicle, onUpdated, onAction }) {
  const [action, setAction] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleApply() {
    if (!action) {
      setError("Elegí una acción.");
      return;
    }
    setError("");
    setPendingConfirm(true);
  }

  function handleCancel() {
    setPendingConfirm(false);
  }

  async function handleConfirm() {
    setPendingConfirm(false);
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

    if (onAction) {
      onAction({
        action,
        target: `${vehicle.brand} ${vehicle.model} ${vehicle.year ?? ""}`.trim(),
        result: "success",
      });
    }

    setAction("");

    if (onUpdated) {
      await onUpdated();
    }

    window.setTimeout(() => setSaved(false), 1600);
  }

  if (pendingConfirm) {
    return (
      <div className="admin-confirm-inline">
        <p>{CONFIRM_MESSAGES[action]}</p>
        <div className="admin-confirm-inline-actions">
          <button
            type="button"
            className="admin-confirm-inline-btn admin-confirm-inline-btn--confirm"
            onClick={handleConfirm}
          >
            Confirmar
          </button>
          <button
            type="button"
            className="admin-confirm-inline-btn admin-confirm-inline-btn--cancel"
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
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
