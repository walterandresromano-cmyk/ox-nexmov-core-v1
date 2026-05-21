import { useState } from "react";

import DealerVehicleDetailModal from "../../components/DealerVehicleDetailModal.jsx";
import { formatKm } from "../../lib/formatters.js";

export default function DealerUrgentModule({
  dealerVehicles,
  reviewVehiclesCount,
  onRefresh,
  onBack,
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Urgencias / Observaciones</h2>
          <p>
            Publicaciones observadas, revisión urgente y correcciones
            necesarias.
          </p>
        </div>
        <button className="admin-refresh-btn" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      {reviewVehiclesCount === 0 ? (
        <div className="empty-state">
          No hay publicaciones pendientes de revisión urgente.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vehículo</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>

            <tbody>
              {dealerVehicles
                .filter((vehicle) => vehicle.review_status === "needs_review")
                .map((vehicle) => (
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
                      <span className="admin-chip danger">Revisión</span>
                      <span>{vehicle.publication_status}</span>
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setSelectedVehicle(vehicle)}
                      >
                        Ver detalle
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
    </div>
  );
}
