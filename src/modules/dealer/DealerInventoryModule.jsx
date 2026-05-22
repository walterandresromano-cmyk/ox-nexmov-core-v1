import { useState, useMemo } from "react";

import DealerVehicleActions from "../../components/DealerVehicleActions.jsx";
import DealerVehicleDetailModal from "../../components/DealerVehicleDetailModal.jsx";
import EditVehicleModal from "../../components/EditVehicleModal.jsx";
import EditVehicleImagesModal from "../../components/EditVehicleImagesModal.jsx";
import { formatARS, formatKm } from "../../lib/formatters.js";
import {
  getPublicationScore,
  getScoreLabel,
  getScoreChipClass,
} from "../../lib/publicationScore.js";
import { updateCurrentDealerVehicleStatus } from "../../services/dealerVehicles.service.js";

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

export default function DealerInventoryModule({ dealerVehicles, onRefresh, onBack }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingVehicleImages, setEditingVehicleImages] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterReview, setFilterReview] = useState("");
  const [filterScore, setFilterScore] = useState("");
  const [sortBy, setSortBy] = useState("default");

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

    if (sortBy === "views_desc") list.sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0));
    if (sortBy === "views_asc") list.sort((a, b) => Number(a.views ?? 0) - Number(b.views ?? 0));
    if (sortBy === "score_desc") list.sort((a, b) => getPublicationScore(b).score - getPublicationScore(a).score);

    return list;
  }, [dealerVehicles, search, filterStatus, filterReview, filterScore, sortBy]);

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
  }

  const hasFilters = search || filterStatus || filterReview || filterScore || sortBy !== "default";

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
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Seleccionar todos"
                  />
                </th>
                <th>Vehículo</th>
                <th>Precio</th>
                <th>Ubicación</th>
                <th>Financiación</th>
                <th>Publicación</th>
                <th>Revisión</th>
                <th>Calidad</th>
                <th>Vistas</th>
                <th>Acciones</th>
                <th>Detalle</th>
                <th>Editar</th>
                <th>Imágenes</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((vehicle) => {
                const { score, missing } = getPublicationScore(vehicle);
                const isSelected = selected.has(vehicle.vehicle_id);

                return (
                  <tr
                    key={vehicle.vehicle_id}
                    className={isSelected ? "table-row--selected" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(vehicle.vehicle_id)}
                      />
                    </td>

                    <td>
                      <strong>
                        {vehicle.brand} {vehicle.model}
                      </strong>
                      <span>{vehicle.version || "Sin versión"}</span>
                      <span>
                        {vehicle.year} · {formatKm(vehicle.km)}
                      </span>
                    </td>

                    <td>
                      <strong>{formatARS(vehicle.price)}</strong>
                      <span>Ref. {formatARS(vehicle.market_reference_price)}</span>
                    </td>

                    <td>
                      <strong>{vehicle.city || "Sin ciudad"}</strong>
                      <span>{vehicle.province || "Sin provincia"}</span>
                    </td>

                    <td>
                      <span>
                        {vehicle.financing ? "Disponible" : "No informada"}
                      </span>
                      {vehicle.financing && (
                        <span>Entrega {formatARS(vehicle.delivery)}</span>
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          vehicle.is_active
                            ? "admin-chip success"
                            : "admin-chip warning"
                        }
                      >
                        {vehicle.is_active ? "Activa" : "No visible"}
                      </span>
                      <span>{vehicle.publication_status}</span>
                    </td>

                    <td>
                      <span
                        className={
                          vehicle.review_status === "needs_review"
                            ? "admin-chip danger"
                            : "admin-chip success"
                        }
                      >
                        {vehicle.review_status === "needs_review"
                          ? "Revisión"
                          : "Aprobada"}
                      </span>
                      {vehicle.reserved && <span>Reservada</span>}
                    </td>

                    <td>
                      <span
                        className={`admin-chip ${getScoreChipClass(score)}`}
                        title={
                          missing.length > 0
                            ? `Falta: ${missing.join(", ")}`
                            : "Publicación completa"
                        }
                      >
                        {score}% · {getScoreLabel(score)}
                      </span>
                    </td>

                    <td>
                      <strong>{Number(vehicle.views ?? 0)}</strong>
                    </td>

                    <td>
                      <DealerVehicleActions
                        vehicle={vehicle}
                        onUpdated={onRefresh}
                      />
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        Ver detalle
                      </button>
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setEditingVehicle(vehicle)}
                      >
                        Editar
                      </button>
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setEditingVehicleImages(vehicle)}
                      >
                        Imágenes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
}
