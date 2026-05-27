import { useEffect, useState } from "react";

import { assignVehicleToBuyerGarage } from "../services/buyerGarage.service.js";
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

const CLOSING_STATUSES = new Set(["sold", "lost", "closed", "no_response"]);

const CLOSE_REASON_OPTIONS = {
  sold: [
    "Vendido a este comprador",
    "Vendido por otro canal",
    "Operación declarada por el dealer",
  ],
  lost: [
    "Precio fuera de expectativa",
    "Sin respuesta del comprador",
    "Comprador eligió otra unidad",
    "Financiación no avanzó",
    "Fuera de zona",
    "Otro motivo",
  ],
  closed: [
    "Gestión finalizada",
    "Consulta resuelta",
    "Operación no concretada",
    "Otro motivo",
  ],
  no_response: [
    "No respondió WhatsApp",
    "No respondió llamada",
    "No respondió email",
    "Otro motivo",
  ],
};

function getStatusLabel(status) {
  return (
    LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label ||
    status ||
    "Sin estado"
  );
}

function buildCloseNote({ status, reason, detail }) {
  const lines = [
    `Estado comercial: ${getStatusLabel(status)}`,
    `Motivo de cierre: ${reason}`,
  ];

  if (detail?.trim()) {
    lines.push(`Detalle: ${detail.trim()}`);
  }

  return lines.join("\n");
}

export default function LeadStatusSelect({ lead, onUpdated }) {
  const [value, setValue] = useState(lead.crm_status || "new");
  const [pendingStatus, setPendingStatus] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [closeDetail, setCloseDetail] = useState("");
  const [assignGarage, setAssignGarage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [garageSaved, setGarageSaved] = useState(false);

  useEffect(() => {
    setValue(lead.crm_status || "new");
  }, [lead.crm_status]);

  async function persistStatus({
    nextStatus,
    reason = "",
    detail = "",
    shouldAssignGarage = false,
  }) {
    setLoading(true);
    setError("");
    setSaved(false);
    setGarageSaved(false);

    const currentNotes = String(lead.notes || "").trim();
    const closeNote = CLOSING_STATUSES.has(nextStatus)
      ? buildCloseNote({ status: nextStatus, reason, detail })
      : "";
    const nextNotes = closeNote
      ? [currentNotes, closeNote].filter(Boolean).join("\n\n")
      : null;

    const { error: updateError } = await updateVehicleLeadStatus({
      leadId: lead.lead_id,
      crmStatus: nextStatus,
      notes: nextNotes,
    });

    if (updateError) {
      setError(updateError.message || "No se pudo actualizar el lead.");
      setLoading(false);
      return;
    }

    if (nextStatus === "sold" && shouldAssignGarage && lead.vehicle_id) {
      const { error: garageError } = await assignVehicleToBuyerGarage({
        leadId: lead.lead_id,
        vehicleId: lead.vehicle_id,
        note: reason || "Vendido declarado desde estado del lead.",
      });

      if (!garageError) {
        setGarageSaved(true);
      } else if (import.meta.env.DEV) {
        console.warn("No se pudo asignar Garage oX desde cierre vendido.", garageError);
      }
    }

    setValue(nextStatus);
    setPendingStatus("");
    setCloseReason("");
    setCloseDetail("");
    setSaved(true);
    setLoading(false);

    if (onUpdated) {
      await onUpdated();
    }

    window.setTimeout(() => {
      setSaved(false);
      setGarageSaved(false);
    }, 1800);
  }

  async function handleChange(event) {
    const nextStatus = event.target.value;

    if (CLOSING_STATUSES.has(nextStatus)) {
      const firstReason =
        CLOSE_REASON_OPTIONS[nextStatus]?.[0] || "Gestión finalizada";
      setPendingStatus(nextStatus);
      setCloseReason(firstReason);
      setCloseDetail("");
      setAssignGarage(nextStatus === "sold");
      setError("");
      setSaved(false);
      return;
    }

    await persistStatus({ nextStatus });
  }

  async function handleConfirmClose() {
    if (!pendingStatus || !closeReason.trim()) {
      setError("Seleccioná un motivo para cerrar el seguimiento.");
      return;
    }

    await persistStatus({
      nextStatus: pendingStatus,
      reason: closeReason,
      detail: closeDetail,
      shouldAssignGarage: assignGarage,
    });
  }

  function handleCancelClose() {
    setPendingStatus("");
    setCloseReason("");
    setCloseDetail("");
    setAssignGarage(true);
    setError("");
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
      {garageSaved && <span>Garage oX asignado</span>}
      {error && <small>{error}</small>}

      {pendingStatus && (
        <div className="lead-close-panel">
          <strong>{getStatusLabel(pendingStatus)}</strong>
          <label>
            Motivo
            <select
              value={closeReason}
              onChange={(event) => setCloseReason(event.target.value)}
              disabled={loading}
            >
              {(CLOSE_REASON_OPTIONS[pendingStatus] || []).map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
          <label>
            Detalle interno
            <textarea
              value={closeDetail}
              onChange={(event) => setCloseDetail(event.target.value)}
              rows={2}
              placeholder="Agregá contexto comercial si hace falta."
              disabled={loading}
            />
          </label>
          {pendingStatus === "sold" && (
            <label className="lead-close-checkbox">
              <input
                type="checkbox"
                checked={assignGarage}
                onChange={(event) => setAssignGarage(event.target.checked)}
                disabled={loading}
              />
              Asignar esta unidad al Garage oX del comprador
            </label>
          )}
          <div className="lead-close-actions">
            <button
              type="button"
              className="table-action-btn"
              onClick={handleConfirmClose}
              disabled={loading}
            >
              Confirmar cierre
            </button>
            <button
              type="button"
              className="inventory-filter-clear"
              onClick={handleCancelClose}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
