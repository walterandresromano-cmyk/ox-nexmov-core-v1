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

const CONFIRM_REQUIRED = {
  approved: "Vas a marcar este lead como Aprobado. Confirmá antes de continuar.",
  rejected: "Vas a marcar este lead como Rechazado. Esta acción notifica el cierre del proceso.",
};

export default function ZeroKmLeadStatusSelect({ lead, onUpdated }) {
  const [value, setValue] = useState(lead.status || "new");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(lead.status || "new");
  }, [lead.status]);

  async function executeUpdate(nextStatus) {
    const previousStatus = value;

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

    window.setTimeout(() => setSaved(false), 1600);
  }

  function handleChange(event) {
    const nextStatus = event.target.value;

    if (CONFIRM_REQUIRED[nextStatus]) {
      setPendingStatus(nextStatus);
      return;
    }

    executeUpdate(nextStatus);
  }

  async function handleConfirm() {
    const next = pendingStatus;
    setPendingStatus(null);
    await executeUpdate(next);
  }

  function handleCancel() {
    setPendingStatus(null);
  }

  return (
    <div className="lead-status-control">
      <select value={value} onChange={handleChange} disabled={loading || pendingStatus !== null}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {pendingStatus && (
        <div className="admin-confirm-inline">
          <p>{CONFIRM_REQUIRED[pendingStatus]}</p>
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
      )}

      {loading && <span>Guardando...</span>}
      {saved && <span>Guardado</span>}
      {error && <small>{error}</small>}
    </div>
  );
}