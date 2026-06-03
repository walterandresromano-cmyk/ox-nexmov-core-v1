import { useState, useMemo } from "react";

import DealerVehicleActions from "../../components/DealerVehicleActions.jsx";
import DealerVehicleDetailModal from "../../components/DealerVehicleDetailModal.jsx";
import DealerMaintenanceModal from "../../components/DealerMaintenanceModal.jsx";
import DealerTransferGarageModal from "../../components/DealerTransferGarageModal.jsx";
import EditVehicleModal from "../../components/EditVehicleModal.jsx";
import EditVehicleImagesModal from "../../components/EditVehicleImagesModal.jsx";
import { formatARS, formatKm } from "../../lib/formatters.js";
import {
  getPublicationScore,
  getScoreLabel,
  getScoreChipClass,
  getScoreBand,
  getScoreHealthLabel,
} from "../../lib/publicationScore.js";
import { updateCurrentDealerVehicleStatus } from "../../services/dealerVehicles.service.js";

function getVehicleAgeDays(vehicle) {
  const raw = vehicle.created_at ?? vehicle.createdAt ?? vehicle.published_at ?? null;
  if (!raw) return null;
  const ms = Date.now() - new Date(raw).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getAgingBand(days) {
  if (days === null) return null;
  if (days >= 90) return "critical";
  if (days >= 60) return "warning";
  if (days >= 30) return "notice";
  return null;
}

function exportInventoryCSV(vehicles) {
  const headers = ["Marca", "Modelo", "Versión", "Año", "Km", "Precio", "Ciudad", "Provincia", "Estado", "Revisión", "Calidad", "Vistas"];
  const rows = vehicles.map((v) => {
    const { score } = getPublicationScore(v);
    return [
      v.brand, v.model, v.version || "", v.year || "", v.km ?? "",
      v.price || "", v.city || "", v.province || "",
      v.is_active ? "Activa" : "No visible",
      v.review_status === "needs_review" ? "Necesita revisión" : "Aprobada",
      `${score}%`, Number(v.views ?? 0),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SCORE_RANGES = [
  { value: "", label: "Todos" },
  { value: "excellent", label: "Excelente (90%+)" },
  { value: "good", label: "Buena (70–89%)" },
  { value: "regular", label: "Regular (50–69%)" },
  { value: "incomplete", label: "Incompleta (<50%)" },
];

function matchesScoreFilter(score, filter) {
  if (!filter) return true;
  if (filter === "excellent") return score >= 90;
  if (filter === "good") return score >= 70 && score < 90;
  if (filter === "regular") return score >= 50 && score < 70;
  if (filter === "incomplete") return score < 50;
  return true;
}

const SUGGESTION_MAP = {
  "Foto principal":                   { text: "Cargá la foto principal",             action: "fotos" },
  "3 o más fotos":                    { text: "Agregá al menos 3 fotos",             action: "fotos" },
  "Descripción (50+ caracteres)":     { text: "Completá la descripción",             action: "editar" },
  "Precio cargado":                   { text: "Revisá el precio",                    action: "editar" },
  "Precio de referencia de mercado":  { text: "Cargá el precio de referencia",       action: "editar" },
  "Año del vehículo":                 { text: "Completá el año",                     action: "editar" },
  "Kilómetros":                       { text: "Completá los kilómetros",             action: "editar" },
  "Tipo de carrocería":               { text: "Completá el tipo de carrocería",      action: "editar" },
  "Transmisión":                      { text: "Completá la transmisión",             action: "editar" },
  "Tipo de combustible":              { text: "Completá el tipo de combustible",     action: "editar" },
  "Versión del modelo":               { text: "Completá la versión del modelo",      action: "editar" },
  "Ubicación (ciudad/provincia)":     { text: "Completá la ubicación",               action: "editar" },
};


export default function DealerInventoryModule({
  dealerVehicles,
  dealerLeads = [],
  dealerName = "",
  onRefresh,
  onBack,
  initialFilterScore = "",
  initialFilterStatus = "",
  initialSortBy = "default",
  initialInventoryInsight = "",
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingVehicleImages, setEditingVehicleImages] = useState(null);
  const [maintenanceVehicle, setMaintenanceVehicle] = useState(null);
  const [transferVehicle, setTransferVehicle] = useState(null);
  const [healthExpanded, setHealthExpanded] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialFilterStatus);
  const [filterReview, setFilterReview] = useState("");
  const [filterScore, setFilterScore] = useState(initialFilterScore);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [filterInsight, setFilterInsight] = useState(initialInventoryInsight);

  // Bulk
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState("");

  const filtered = useMemo(() => {
    let list = [...dealerVehicles];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((v) =>
        `${v.brand} ${v.model} ${v.version || ""}`.toLowerCase().includes(q)
      );
    }

    if (filterStatus === "active") list = list.filter((v) => v.is_active);
    if (filterStatus === "inactive") list = list.filter((v) => !v.is_active);
    if (filterStatus === "reserved") list = list.filter((v) => v.reserved);

    if (filterReview === "needs") list = list.filter((v) => v.review_status === "needs_review");
    if (filterReview === "ok") list = list.filter((v) => v.review_status !== "needs_review");

    if (filterScore) {
      list = list.filter((v) => {
        const { score } = getPublicationScore(v);
        return matchesScoreFilter(score, filterScore);
      });
    }

    if (filterInsight === "viewsNoLeads") {
      const leadsByVehicleId = dealerLeads.reduce((acc, l) => {
        const vid = String(l.vehicle_id || "");
        if (vid) acc[vid] = (acc[vid] || 0) + 1;
        return acc;
      }, {});
      list = list.filter((v) => {
        const views = Number(v.views ?? 0);
        const vLeads = leadsByVehicleId[String(v.vehicle_id || "")] || 0;
        return v.is_active && views > 0 && vLeads === 0;
      });
    }

    if (sortBy === "views_desc") list.sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0));
    if (sortBy === "views_asc") list.sort((a, b) => Number(a.views ?? 0) - Number(b.views ?? 0));
    if (sortBy === "score_desc") list.sort((a, b) => getPublicationScore(b).score - getPublicationScore(a).score);

    return list;
  }, [dealerVehicles, dealerLeads, search, filterStatus, filterReview, filterScore, filterInsight, sortBy]);

  const allSelected = filtered.length > 0 && filtered.every((v) => selected.has(v.vehicle_id));

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((v) => v.vehicle_id)));
    }
  }

  async function handleBulkAction(action) {
    if (selected.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    setBulkResult("");

    const ids = [...selected];
    const results = await Promise.all(
      ids.map((id) => updateCurrentDealerVehicleStatus({ vehicleId: id, action }))
    );

    const errors = results.filter((r) => r.error).length;
    setBulkResult(
      errors === 0
        ? `${ids.length} publicación${ids.length !== 1 ? "es" : ""} actualizada${ids.length !== 1 ? "s" : ""}.`
        : `${ids.length - errors} aplicadas, ${errors} con error.`
    );
    setSelected(new Set());
    setBulkLoading(false);
    await onRefresh();
    setTimeout(() => setBulkResult(""), 2800);
  }

  function clearFilters() {
    setSearch("");
    setFilterStatus("");
    setFilterReview("");
    setFilterScore("");
    setSortBy("default");
    setFilterInsight("");
  }

  const hasFilters = search || filterStatus || filterReview || filterScore || sortBy !== "default" || filterInsight;

  const agingAlerts = useMemo(() => {
    return dealerVehicles
      .filter((v) => v.is_active)
      .map((v) => ({ vehicle: v, days: getVehicleAgeDays(v) }))
      .filter(({ days }) => days !== null && days >= 30)
      .sort((a, b) => b.days - a.days);
  }, [dealerVehicles]);

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Mis vehículos publicados</h2>
          <p>
            Inventario real asociado a este dealer. Incluye publicaciones
            activas, pausadas, reservadas o enviadas a revisión.
          </p>
        </div>
        <div className="dealer-module-head-actions">
          <button
            type="button"
            className="table-action-btn"
            onClick={() => exportInventoryCSV(filtered.length > 0 ? filtered : dealerVehicles)}
            disabled={dealerVehicles.length === 0}
          >
            Exportar CSV
          </button>
          <button className="admin-refresh-btn" onClick={onRefresh}>
            Actualizar
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {dealerVehicles.length > 0 && (
        <div className="inventory-filter-bar">
          <input
            className="inventory-filter-search"
            type="text"
            placeholder="Buscar por marca, modelo o versión…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filterInsight === "viewsNoLeads" && (
            <span className="dealer-inv-context-chip">
              Filtro: vistas sin consulta
            </span>
          )}

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Estado: todos</option>
            <option value="active">Activas</option>
            <option value="inactive">No visibles</option>
            <option value="reserved">Reservadas</option>
          </select>

          <select value={filterReview} onChange={(e) => setFilterReview(e.target.value)}>
            <option value="">Revisión: todas</option>
            <option value="needs">Necesita revisión</option>
            <option value="ok">Aprobadas</option>
          </select>

          <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)}>
            {SCORE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label === "Todos" ? "Calidad: todas" : r.label}</option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="default">Orden: por defecto</option>
            <option value="views_desc">Más vistas primero</option>
            <option value="views_asc">Menos vistas primero</option>
            <option value="score_desc">Mayor calidad primero</option>
          </select>

          {hasFilters && (
            <button type="button" className="inventory-filter-clear" onClick={clearFilters}>
              Limpiar
            </button>
          )}

          <span className="inventory-filter-count">
            {filtered.length} de {dealerVehicles.length}
          </span>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="inventory-bulk-bar">
          <span>{selected.size} seleccionada{selected.size !== 1 ? "s" : ""}</span>
          <button
            type="button"
            className="table-action-btn"
            onClick={() => handleBulkAction("reactivate")}
            disabled={bulkLoading}
          >
            Activar
          </button>
          <button
            type="button"
            className="table-action-btn"
            onClick={() => handleBulkAction("pause")}
            disabled={bulkLoading}
          >
            Pausar
          </button>
          <button
            type="button"
            className="inventory-filter-clear"
            onClick={() => setSelected(new Set())}
            disabled={bulkLoading}
          >
            Cancelar selección
          </button>
          {bulkResult && <span className="inventory-bulk-result">{bulkResult}</span>}
        </div>
      )}

      {/* Stock aging banner */}
      {agingAlerts.length > 0 && (
        <div className="inventory-aging-banner">
          <div className="inventory-aging-banner__icon">⏱</div>
          <div className="inventory-aging-banner__text">
            <strong>
              {agingAlerts.filter(({ days }) => days >= 60).length > 0
                ? `${agingAlerts.filter(({ days }) => days >= 60).length} vehículo${agingAlerts.filter(({ days }) => days >= 60).length !== 1 ? "s" : ""} sin movimiento hace más de 60 días`
                : `${agingAlerts.length} vehículo${agingAlerts.length !== 1 ? "s" : ""} publicado${agingAlerts.length !== 1 ? "s" : ""} hace más de 30 días`}
            </strong>
            <span>Revisá precio, fotos o calidad de publicación para mejorar la visibilidad.</span>
          </div>
        </div>
      )}

      {dealerVehicles.length === 0 ? (
        <div className="empty-state">
          Todavía no hay vehículos reales para mostrar.
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          Ninguna publicación coincide con los filtros actuales.{" "}
          <button type="button" className="table-action-btn" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="dealer-inventory-grid">
          {filtered.map((vehicle) => {
            const { score, missing } = getPublicationScore(vehicle);
            const isSelected = selected.has(vehicle.vehicle_id);
            const imageUrl =
              vehicle.main_image_url ||
              vehicle.mainImageUrl ||
              (Array.isArray(vehicle.images) && vehicle.images[0]?.url) ||
              (Array.isArray(vehicle.images) && vehicle.images[0]?.publicUrl) ||
              null;
            const ageDays = getVehicleAgeDays(vehicle);
            const ageBand = getAgingBand(ageDays);

            return (
              <article
                key={vehicle.vehicle_id}
                className={`vehicle-card dealer-inventory-card${isSelected ? " is-selected" : ""}`}
              >
                {/* Image */}
                <div className="vehicle-card__media">
                  <div className="vehicle-card__topbar">
                    <span className="vehicle-card__rank">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(vehicle.vehicle_id)}
                        onClick={(e) => e.stopPropagation()}
                        title="Seleccionar"
                      />
                    </span>
                    <span className="vehicle-card__year">{vehicle.year || "—"}</span>
                  </div>

                  {vehicle.reserved && (
                    <div className="vehicle-card__reserved">Reservada</div>
                  )}

                  {imageUrl ? (
                    <img className="vehicle-card__image" src={imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="vehicle-card__placeholder">
                      <span>Sin imagen</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="vehicle-card__body">
                  <div className="vehicle-card__identity">
                    <h3 className="vehicle-card__title">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="vehicle-card__version">
                      {vehicle.version || "Sin versión"} · {formatKm(vehicle.km)}
                    </p>
                  </div>

                  {/* Stats row */}
                  <div className="dealer-inv-card__chips">
                    <span className={vehicle.is_active ? "admin-chip success" : "admin-chip warning"} style={{ fontSize: "0.58rem" }}>
                      {vehicle.is_active ? "Activa" : "No visible"}
                    </span>
                    <span className={`admin-chip ${getScoreChipClass(score)}`} style={{ fontSize: "0.58rem" }} title={missing.length > 0 ? `Falta: ${missing.join(", ")}` : "Publicación completa"}>
                      {score}% · {getScoreLabel(score)}
                    </span>
                    {vehicle.review_status === "needs_review" && (
                      <span className="admin-chip danger" style={{ fontSize: "0.58rem" }}>Revisión</span>
                    )}
                    {ageBand && (
                      <span className={`inventory-age-badge inventory-age-badge--${ageBand}`}>
                        {ageDays}d
                      </span>
                    )}
                    <span className="dealer-inv-card__views">{Number(vehicle.views ?? 0)} vistas</span>
                  </div>

                  {/* Publication health */}
                  <div className="dealer-inv-card__health">
                    <div className="dealer-inv-card__health-bar">
                      <div
                        className={`dealer-inv-card__health-fill dealer-inv-card__health-fill--${getScoreBand(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <div className="dealer-inv-card__health-row">
                      <span className={`dealer-inv-card__health-label dealer-inv-card__health-label--${getScoreBand(score)}`}>
                        {getScoreHealthLabel(score)}
                      </span>
                      {missing.length > 0 && (
                        <button
                          type="button"
                          className="dealer-inv-card__health-toggle"
                          onClick={() => setHealthExpanded(
                            healthExpanded === vehicle.vehicle_id ? null : vehicle.vehicle_id
                          )}
                        >
                          {healthExpanded === vehicle.vehicle_id ? "Cerrar" : "Mejorar"}
                        </button>
                      )}
                    </div>
                    {healthExpanded === vehicle.vehicle_id && (
                      <ul className="dealer-inv-card__suggestions">
                        {missing.length === 0 ? (
                          <li className="dealer-inv-card__suggestions-complete">
                            Publicación completa y lista para competir mejor.
                          </li>
                        ) : (
                          missing.slice(0, 3).map((label) => {
                            const hint = SUGGESTION_MAP[label] ?? { text: label, action: "editar" };
                            return (
                              <li key={label} className="dealer-inv-card__suggestion-item">
                                <span>{hint.text}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    hint.action === "fotos"
                                      ? setEditingVehicleImages(vehicle)
                                      : setEditingVehicle(vehicle)
                                  }
                                >
                                  Corregir
                                </button>
                              </li>
                            );
                          })
                        )}
                        {missing.length > 3 && (
                          <li className="dealer-inv-card__suggestions-more">
                            +{missing.length - 3} mejora{missing.length - 3 !== 1 ? "s" : ""} adicional{missing.length - 3 !== 1 ? "es" : ""}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Price */}
                  <div className="dealer-inv-card__price-row">
                    <span className="dealer-inv-card__price-label">Precio</span>
                    <strong className="dealer-inv-card__price">{formatARS(vehicle.price)}</strong>
                  </div>

                  {/* Actions */}
                  <div className="dealer-inv-card__actions">
                    <button
                      type="button"
                      className="vehicle-card__btn vehicle-card__btn--primary"
                      onClick={() => setEditingVehicle(vehicle)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="vehicle-card__btn"
                      onClick={() => setEditingVehicleImages(vehicle)}
                    >
                      Fotos
                    </button>
                    <button
                      type="button"
                      className="vehicle-card__btn"
                      onClick={() => setMaintenanceVehicle(vehicle)}
                    >
                      Mant.
                    </button>
                    <button
                      type="button"
                      className="vehicle-card__btn"
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      Detalle
                    </button>
                  </div>

                  {/* Status action */}
                  <DealerVehicleActions
                    vehicle={vehicle}
                    onUpdated={onRefresh}
                    onMarkSold={(v) => setTransferVehicle(v)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedVehicle && (
        <DealerVehicleDetailModal
          vehicle={selectedVehicle}
          dealerName={dealerName}
          onClose={() => setSelectedVehicle(null)}
          onUpdated={onRefresh}
        />
      )}

      {editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          mode="dealer"
          onClose={() => setEditingVehicle(null)}
          onUpdated={onRefresh}
        />
      )}

      {editingVehicleImages && (
        <EditVehicleImagesModal
          vehicle={editingVehicleImages}
          mode="dealer"
          onClose={() => setEditingVehicleImages(null)}
          onUpdated={onRefresh}
        />
      )}

      {maintenanceVehicle && (
        <DealerMaintenanceModal
          vehicle={maintenanceVehicle}
          onClose={() => setMaintenanceVehicle(null)}
          onUpdated={async () => { await onRefresh(); }}
        />
      )}

      {transferVehicle && (
        <DealerTransferGarageModal
          vehicle={transferVehicle}
          vehicleLeads={dealerLeads.filter(
            (l) => String(l.vehicle_id) === String(transferVehicle.vehicle_id)
          )}
          dealerName={dealerName}
          onClose={() => setTransferVehicle(null)}
          onTransferred={async () => { await onRefresh(); setTransferVehicle(null); }}
        />
      )}
    </div>
  );
}
