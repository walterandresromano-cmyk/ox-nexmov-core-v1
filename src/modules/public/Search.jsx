import { useEffect, useMemo, useState } from "react";

import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import { mockDealers, mockVehicles } from "../../data/mockData.js";
import { listPublicVehicles } from "../../services/vehicles.service.js";

function getMockDealer(vehicle) {
  return mockDealers.find((dealer) => dealer.id === vehicle.dealerId);
}

export default function Search({ appActions, onNavigate }) {
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [searchText, setSearchText] = useState("");

  async function loadVehicles() {
    setLoadingVehicles(true);
    setVehiclesError("");

    const { vehicles: supabaseVehicles, error } = await listPublicVehicles();

    if (error) {
      setVehicles(mockVehicles);
      setVehiclesError(
        `${error.message}. Usando vehículos mock como respaldo temporal.`
      );
      setLoadingVehicles(false);
      return;
    }

    if (!supabaseVehicles.length) {
      setVehicles(mockVehicles);
      setVehiclesError(
        "Supabase devolvió 0 vehículos públicos. Usando vehículos mock como respaldo temporal."
      );
      setLoadingVehicles(false);
      return;
    }

    setVehicles(supabaseVehicles);
    setLoadingVehicles(false);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    if (!text) return vehicles;

    return vehicles.filter((vehicle) => {
      const haystack = [
        vehicle.brand,
        vehicle.model,
        vehicle.version,
        vehicle.year,
        vehicle.city,
        vehicle.province,
        vehicle.dealer?.commercialName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });
  }, [vehicles, searchText]);

  function getDealer(vehicle) {
    if (vehicle.dealer) return vehicle.dealer;
    return getMockDealer(vehicle);
  }

  return (
    <section className="page-section">
      <div className="container panel">
        <p className="eyebrow">Motor avanzado</p>
        <h1>Buscar vehículos</h1>
        <p>Vista pública conectada a Supabase con fallback mock temporal.</p>

        <div className="admin-toolbar">
          <div className="admin-search">
            <label>Buscar</label>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Marca, modelo, versión, ciudad, dealer..."
            />
          </div>

          <button className="admin-refresh-btn" onClick={loadVehicles}>
            Actualizar vehículos
          </button>
        </div>

        {vehiclesError && <div className="auth-warning">{vehiclesError}</div>}

        {loadingVehicles && (
          <div className="auth-message">Cargando vehículos desde Supabase...</div>
        )}

        <div className="vehicle-grid">
          {filteredVehicles.map((vehicle) => (
            <VehicleCardPublic
              key={vehicle.id}
              vehicle={vehicle}
              dealer={getDealer(vehicle)}
              appActions={appActions}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {filteredVehicles.length === 0 && (
          <div className="empty-state">
            No hay vehículos que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </section>
  );
}