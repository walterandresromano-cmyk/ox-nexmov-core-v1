import { useState } from "react";
import { createRadarRequest, buildRadarCriteriaSummary } from "../services/radarRequests.service.js";

export default function RadarActivationModal({
  searchText,
  filters,
  parsedIntent,
  resultsCount,
  triggerReason,
  onClose,
  onActivated,
}) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const criteriaParts = buildRadarCriteriaSummary(searchText, filters, parsedIntent);

  async function handleActivate() {
    if (saving) return;
    setSaving(true);
    setError("");

    const { request, error: saveError } = await createRadarRequest({
      searchText,
      filters,
      parsedIntent,
      notes: notes.trim(),
      triggerReason,
      resultsCount,
    });

    setSaving(false);

    if (saveError) {
      setError("No pudimos activar Radar oX en este momento. Probá nuevamente.");
      return;
    }

    onActivated?.(request);
    onClose?.();
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div
      className="radar-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="radar-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="radar-modal">
        <div className="radar-modal-head">
          <div className="radar-modal-eyebrow">
            <span className="radar-modal-badge">Radar oX</span>
          </div>
          <h2 id="radar-modal-title">Activar búsqueda activa</h2>
          <p>
            Registramos tus criterios para alertarte cuando aparezca un vehículo
            que coincida. No enviamos tus datos a ningún dealer ahora.
          </p>
          <button
            type="button"
            className="radar-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="radar-modal-body">
          {criteriaParts.length > 0 && (
            <div className="radar-modal-criteria">
              <p className="radar-modal-criteria-label">Tus criterios de búsqueda</p>
              <ul className="radar-modal-criteria-list">
                {criteriaParts.map((part, i) => (
                  <li key={i} className="radar-modal-criteria-item">
                    {part}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultsCount === 0 && (
            <div className="radar-modal-context">
              Ningún vehículo disponible hoy coincide con tu búsqueda.
            </div>
          )}

          {resultsCount > 0 && resultsCount <= 2 && (
            <div className="radar-modal-context">
              Solo {resultsCount} resultado{resultsCount !== 1 ? "s" : ""} con estos filtros — puede haber más próximamente.
            </div>
          )}

          <label className="radar-modal-notes-label">
            Comentario opcional
            <textarea
              className="radar-modal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: automático, color claro, entrega en mano…"
              maxLength={300}
              rows={3}
            />
          </label>

          {error && <p className="radar-modal-error">{error}</p>}
        </div>

        <div className="radar-modal-actions">
          <button
            type="button"
            className="radar-modal-btn-primary"
            onClick={handleActivate}
            disabled={saving}
          >
            {saving ? "Activando…" : "Activar Radar oX"}
          </button>
          <button
            type="button"
            className="radar-modal-btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>

        <p className="radar-modal-disclaimer">
          Tu búsqueda queda registrada en tu Garage oX. Los dealers no te
          contactan hasta que vos iniciés la consulta.
        </p>
      </div>
    </div>
  );
}
