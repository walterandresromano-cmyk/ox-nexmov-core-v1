import { useState, useMemo } from "react";

import DealerVehicleDetailModal from "../../components/DealerVehicleDetailModal.jsx";
import EditVehicleModal from "../../components/EditVehicleModal.jsx";
import EditVehicleImagesModal from "../../components/EditVehicleImagesModal.jsx";
import { getPublicationScore } from "../../lib/publicationScore.js";
import { formatKm } from "../../lib/formatters.js";

const CRITICAL_MISSING = new Set([
  "Foto principal",
  "Precio cargado",
  "Año del vehículo",
  "Kilómetros",
  "Ubicación (ciudad/provincia)",
]);

function getUrgencyForVehicle(vehicle) {
  const id = vehicle.vehicle_id;
  const title = [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ");
  const meta = [vehicle.year, vehicle.km != null ? formatKm(vehicle.km) : null].filter(Boolean).join(" · ");

  // A — In review (highest priority)
  if (vehicle.review_status === "needs_review") {
    return {
      id, vehicle, title, meta,
      type: "review",
      level: "urgent",
      badge: "En revisión",
      reason: "Esta publicación fue enviada a revisión. Corregí los datos observados para que vuelva a estar visible.",
      suggestions: [],
      primaryAction: "edit",
    };
  }

  // D — Paused by system
  if (vehicle.publication_status === "paused_by_system") {
    return {
      id, vehicle, title, meta,
      type: "paused",
      level: "urgent",
      badge: "Pausada por sistema",
      reason: "La publicación fue pausada automáticamente. Revisá el estado del plan o contactá a administración.",
      suggestions: [],
      primaryAction: "detail",
    };
  }

  const { score, missing } = getPublicationScore(vehicle);

  // B — Critical score
  if (score < 50) {
    const topMissing = missing.slice(0, 3);
    const hasPhotoMissing = missing.includes("Foto principal");
    return {
      id, vehicle, title, meta,
      type: "low_score",
      level: "attention",
      badge: `${score}% · Publicación débil`,
      reason: "El score bajo reduce la visibilidad y convierte menos consultas.",
      suggestions: topMissing,
      primaryAction: hasPhotoMissing ? "fotos" : "edit",
    };
  }

  // C — Critical fields missing (score ok but has critical gaps)
  const criticalGaps = missing.filter((m) => CRITICAL_MISSING.has(m));
  if (criticalGaps.length > 0) {
    const hasPhotoGap = criticalGaps.includes("Foto principal");
    return {
      id, vehicle, title, meta,
      type: "critical_missing",
      level: "attention",
      badge: "Faltan datos clave",
      reason: null,
      suggestions: criticalGaps.slice(0, 3),
      primaryAction: hasPhotoGap ? "fotos" : "edit",
    };
  }

  return null;
}

const LEVEL_CONFIG = {
  urgent:    { dotColor: "rgba(239,68,68,0.9)",   chipClass: "danger",  border: "rgba(239,68,68,0.22)"  },
  attention: { dotColor: "rgba(251,191,36,0.9)",  chipClass: "warning", border: "rgba(251,191,36,0.2)"  },
  info:      { dotColor: "rgba(56,189,248,0.8)",  chipClass: "info",    border: "rgba(56,189,248,0.15)" },
};

export default function DealerUrgentModule({ dealerVehicles, onRefresh, onBack }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingVehicleImages, setEditingVehicleImages] = useState(null);

  const urgencies = useMemo(() => {
    return dealerVehicles
      .map(getUrgencyForVehicle)
      .filter(Boolean)
      .sort((a, b) => {
        const order = { urgent: 0, attention: 1, info: 2 };
        return order[a.level] - order[b.level];
      });
  }, [dealerVehicles]);

  const urgentCount   = urgencies.filter((u) => u.level === "urgent").length;
  const attentionCount = urgencies.filter((u) => u.level === "attention").length;

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Urgencias</h2>
          <p>
            Publicaciones que requieren atención para volver a rendir.
          </p>
        </div>
        <div className="dealer-module-head-actions">
          {urgencies.length > 0 && (
            <span className="dealer-urgent-summary">
              {urgentCount > 0 && <span className="dealer-urgent-summary__dot dealer-urgent-summary__dot--urgent" />}
              {urgentCount > 0 && <span>{urgentCount} urgente{urgentCount !== 1 ? "s" : ""}</span>}
              {attentionCount > 0 && <span className="dealer-urgent-summary__dot dealer-urgent-summary__dot--attention" />}
              {attentionCount > 0 && <span>{attentionCount} atención</span>}
            </span>
          )}
          <button className="admin-refresh-btn" onClick={onRefresh}>
            Actualizar
          </button>
        </div>
      </div>

      {urgencies.length === 0 ? (
        <div className="dealer-urgent-empty">
          <span className="dealer-urgent-empty__icon">✓</span>
          <div>
            <strong>Sin urgencias pendientes</strong>
            <p>Tus publicaciones no requieren revisión inmediata.</p>
          </div>
        </div>
      ) : (
        <div className="dealer-urgent-list">
          {urgencies.map((item) => {
            const cfg = LEVEL_CONFIG[item.level] ?? LEVEL_CONFIG.info;
            return (
              <div
                key={item.id}
                className="dealer-urgent-card"
                style={{ borderColor: cfg.border }}
              >
                {/* Header */}
                <div className="dealer-urgent-card__head">
                  <div className="dealer-urgent-card__identity">
                    <span
                      className="dealer-urgent-card__dot"
                      style={{ background: cfg.dotColor }}
                    />
                    <div>
                      <strong className="dealer-urgent-card__title">{item.title}</strong>
                      {item.meta && <span className="dealer-urgent-card__meta">{item.meta}</span>}
                    </div>
                  </div>
                  <span className={`admin-chip ${cfg.chipClass}`} style={{ fontSize: "0.58rem", flexShrink: 0 }}>
                    {item.badge}
                  </span>
                </div>

                {/* Reason */}
                {item.reason && (
                  <p className="dealer-urgent-card__reason">{item.reason}</p>
                )}

                {/* Suggestions */}
                {item.suggestions.length > 0 && (
                  <ul className="dealer-urgent-card__suggestions">
                    {item.suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}

                {/* Actions */}
                <div className="dealer-urgent-card__actions">
                  {(item.primaryAction === "edit" || item.type === "review" || item.type === "low_score" || item.type === "critical_missing") && (
                    <button
                      type="button"
                      className="vehicle-card__btn vehicle-card__btn--primary"
                      onClick={() => setEditingVehicle(item.vehicle)}
                    >
                      Editar
                    </button>
                  )}
                  {(item.primaryAction === "fotos" || item.suggestions.includes("Foto principal") || item.suggestions.includes("3 o más fotos")) && (
                    <button
                      type="button"
                      className="vehicle-card__btn"
                      onClick={() => setEditingVehicleImages(item.vehicle)}
                    >
                      Fotos
                    </button>
                  )}
                  <button
                    type="button"
                    className="vehicle-card__btn"
                    onClick={() => setSelectedVehicle(item.vehicle)}
                  >
                    Detalle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedVehicle && (
        <DealerVehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onUpdated={onRefresh}
        />
      )}

      {editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          mode="dealer"
          onClose={() => setEditingVehicle(null)}
          onUpdated={async () => { await onRefresh(); setEditingVehicle(null); }}
        />
      )}

      {editingVehicleImages && (
        <EditVehicleImagesModal
          vehicle={editingVehicleImages}
          mode="dealer"
          onClose={() => setEditingVehicleImages(null)}
          onUpdated={async () => { await onRefresh(); setEditingVehicleImages(null); }}
        />
      )}
    </div>
  );
}
