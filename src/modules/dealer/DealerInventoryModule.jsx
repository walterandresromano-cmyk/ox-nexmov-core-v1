import { useState } from "react";

import DealerVehicleActions from "../../components/DealerVehicleActions.jsx";
import DealerVehicleDetailModal from "../../components/DealerVehicleDetailModal.jsx";
import EditVehicleModal from "../../components/EditVehicleModal.jsx";
import EditVehicleImagesModal from "../../components/EditVehicleImagesModal.jsx";
import { formatARS, formatKm } from "../../lib/formatters.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default function DealerInventoryModule({ dealerVehicles, onRefresh, onBack }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingVehicleImages, setEditingVehicleImages] = useState(null);

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
        <button className="admin-refresh-btn" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      {dealerVehicles.length === 0 ? (
        <div className="empty-state">
          Todavía no hay vehículos reales para mostrar.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vehículo</th>
                <th>Precio</th>
                <th>Ubicación</th>
                <th>Financiación</th>
                <th>Publicación</th>
                <th>Revisión</th>
                <th>Vistas</th>
                <th>Acciones</th>
                <th>Detalle</th>
                <th>Editar</th>
                <th>Imágenes</th>
              </tr>
            </thead>

            <tbody>
              {dealerVehicles.map((vehicle) => (
                <tr key={vehicle.vehicle_id}>
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
              ))}
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
