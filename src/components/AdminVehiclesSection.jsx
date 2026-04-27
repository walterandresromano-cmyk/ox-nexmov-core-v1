import { useEffect, useMemo, useState } from "react";
import EditVehicleModal from "./EditVehicleModal.jsx";

import EditVehicleImagesModal from "./EditVehicleImagesModal.jsx";
import AdminVehicleActions from "./AdminVehicleActions.jsx";
import DealerVehicleDetailModal from "./DealerVehicleDetailModal.jsx";
import { listVehiclesForAdmin } from "../services/adminVehicles.service.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatARS(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatKm(value) {
  return `${Number(value || 0).toLocaleString("es-AR")} km`;
}

export default function AdminVehiclesSection() {
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingVehicleImages, setEditingVehicleImages] = useState(null);

  async function loadVehicles() {
    setLoadingVehicles(true);
    setVehiclesError("");

    const { vehicles: supabaseVehicles, error } = await listVehiclesForAdmin();

    if (error) {
      setVehicles([]);
      setVehiclesError(error.message || "No se pudieron cargar publicaciones.");
      setLoadingVehicles(false);
      return;
    }

    setVehicles(supabaseVehicles);
    setLoadingVehicles(false);
  }

  async function handleVehicleUpdated() {
    await loadVehicles();
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesStatus =
        statusFilter === "all" ||
        vehicle.publication_status === statusFilter ||
        (statusFilter === "active" && vehicle.is_active);

      const matchesReview =
        reviewFilter === "all" || vehicle.review_status === reviewFilter;

      const haystack = [
        vehicle.vehicle_id,
        vehicle.dealer_name,
        vehicle.dealer_plan,
        vehicle.brand,
        vehicle.model,
        vehicle.version,
        vehicle.year,
        vehicle.city,
        vehicle.province,
        vehicle.publication_status,
        vehicle.review_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesText = !text || haystack.includes(text);

      return matchesStatus && matchesReview && matchesText;
    });
  }, [vehicles, searchText, statusFilter, reviewFilter]);

  const total = vehicles.length;
  const active = vehicles.filter((vehicle) => vehicle.is_active).length;
  const review = vehicles.filter(
    (vehicle) => vehicle.review_status === "needs_review"
  ).length;
  const reserved = vehicles.filter((vehicle) => vehicle.reserved).length;

  return (
    <div className="admin-section-block">
      <div className="buyer-section-head">
        <div>
          <h2>Publicaciones</h2>
          <p>
            Vista global de publicaciones cargadas por dealers. Permite revisar,
            aprobar, pausar, reservar o marcar vendidas.
          </p>
        </div>

        <button className="admin-refresh-btn" onClick={loadVehicles}>
          Actualizar publicaciones
        </button>
      </div>

      {vehiclesError && <div className="auth-warning">{vehiclesError}</div>}

      {loadingVehicles && (
        <div className="auth-message">
          Cargando publicaciones desde Supabase...
        </div>
      )}

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <span>Total publicaciones</span>
          <strong>{total}</strong>
          <p>Inventario total cargado.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Activas</span>
          <strong>{active}</strong>
          <p>Visibles o disponibles públicamente.</p>
        </article>

        <article className="admin-kpi-card">
          <span>En revisión</span>
          <strong>{review}</strong>
          <p>Requieren intervención del admin.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Reservadas</span>
          <strong>{reserved}</strong>
          <p>Unidades apartadas por dealers.</p>
        </article>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <label>Buscar publicación</label>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Dealer, marca, modelo, ciudad..."
          />
        </div>

        <div className="admin-filter">
          <label>Estado</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Activas</option>
            <option value="paused">Pausadas</option>
            <option value="reserved">Reservadas</option>
            <option value="sold">Vendidas</option>
            <option value="review">En revisión</option>
          </select>
        </div>

        <div className="admin-filter">
          <label>Revisión</label>
          <select
            value={reviewFilter}
            onChange={(event) => setReviewFilter(event.target.value)}
          >
            <option value="all">Todas</option>
            <option value="auto_approved">Aprobadas</option>
            <option value="needs_review">Necesitan revisión</option>
          </select>
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="empty-state">
          No hay publicaciones que coincidan con los filtros.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Publicación</th>
                <th>Dealer</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Revisión</th>
                <th>Acciones</th>
                <th>Detalle</th>
                <th>Editar</th>
                <th>Imágenes</th>
              </tr>
            </thead>

            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.vehicle_id}>
                  <td>
                    <strong>
                      {vehicle.brand} {vehicle.model}
                    </strong>
                    <span>{vehicle.version || "Sin versión"}</span>
                    <span>
                      {vehicle.year} · {formatKm(vehicle.km)}
                    </span>
                    <span>{formatDateTime(vehicle.created_at)}</span>
                  </td>

                  <td>
                    <strong>{vehicle.dealer_name || "Sin dealer"}</strong>
                    <span>{vehicle.dealer_plan || "Sin plan"}</span>
                    <span>
                      {vehicle.city}, {vehicle.province}
                    </span>
                  </td>

                  <td>
                    <strong>{formatARS(vehicle.price)}</strong>
                    <span>Ref. {formatARS(vehicle.market_reference_price)}</span>
                  </td>

                  <td>
                    <span
                      className={
                        vehicle.is_active
                          ? "admin-chip success"
                          : "admin-chip warning"
                      }
                    >
                      {vehicle.is_active ? "Visible" : "No visible"}
                    </span>
                    <span>{vehicle.publication_status}</span>
                    {vehicle.reserved && <span>Reservada</span>}
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
                        ? "Necesita revisión"
                        : "Aprobada"}
                    </span>
                  </td>

                  <td>
                    <AdminVehicleActions
                      vehicle={vehicle}
                      onUpdated={loadVehicles}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedVehicle && (
        <DealerVehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onUpdated={handleVehicleUpdated}
        />
      )}
      {editingVehicle && (
  <EditVehicleModal
    vehicle={editingVehicle}
    mode="admin"
    onClose={() => setEditingVehicle(null)}
    onUpdated={loadVehicles}
        />
      )}

      {editingVehicleImages && (
  <EditVehicleImagesModal
    vehicle={editingVehicleImages}
    mode="admin"
    onClose={() => setEditingVehicleImages(null)}
    onUpdated={loadVehicles}
  />
)}
      








    </div>
  );
}