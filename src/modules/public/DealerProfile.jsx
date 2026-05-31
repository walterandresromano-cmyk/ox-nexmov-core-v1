import { useEffect, useState } from "react";
import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import {
  getDealerPublicProfile,
  getDealerPublicVehicles,
} from "../../services/publicDealer.service.js";

const PLAN_LABELS = {
  inicio: "Inicio",
  pro: "Pro",
  elite: "Elite",
  platinum: "Platinum",
};

export default function DealerProfile({ onNavigate, appActions, routeParams }) {
  const dealerId = routeParams?.dealerId;

  const [dealer, setDealer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dealerId) {
      setError("No se especificó el dealer.");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError("");

      const [
        { dealer: dealerData, error: dealerError },
        { vehicles: vehicleData },
      ] = await Promise.all([
        getDealerPublicProfile(dealerId),
        getDealerPublicVehicles(dealerId),
      ]);

      if (dealerError || !dealerData) {
        setError("No se pudo cargar el perfil del dealer.");
        setLoading(false);
        return;
      }

      setDealer(dealerData);
      setVehicles(vehicleData);
      setLoading(false);
    }

    load();
  }, [dealerId]);

  function getDealer(vehicle) {
    return vehicle.dealer || null;
  }

  const totalViews = vehicles.reduce(
    (sum, v) => sum + Number(v.views ?? 0),
    0
  );

  const waLink = dealer?.phone ? `https://wa.me/${dealer.phone}` : null;

  if (loading) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="auth-message">Cargando perfil del dealer...</div>
        </div>
      </section>
    );
  }

  if (error || !dealer) {
    return (
      <section className="page-section">
        <div className="container dealer-profile-page">
          <div className="auth-warning">{error || "Dealer no encontrado."}</div>
          <button
            type="button"
            className="table-action-btn"
            onClick={() => onNavigate("search")}
          >
            ← Volver a la búsqueda
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container dealer-profile-page">
        <button
          type="button"
          className="dealer-profile-back-btn"
          onClick={() => onNavigate("search")}
        >
          ← Volver a la búsqueda
        </button>

        <header className={`dealer-profile-header rank-${dealer.plan}`}>
          <div className="dealer-profile-identity">
            {dealer.logo ? (
              <img
                src={dealer.logo}
                alt={`Imagen institucional de ${dealer.name}`}
                className="dealer-profile-logo"
              />
            ) : (
              <div className="dealer-profile-logo-placeholder">
                {dealer.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="dealer-profile-info">
              <div className="dealer-profile-chips">
                <span className={`admin-chip rank-${dealer.plan}`}>
                  Dealer {PLAN_LABELS[dealer.plan] || dealer.plan}
                </span>
              </div>
              <h1>{dealer.name}</h1>
              <p className="dealer-profile-location">
                {[dealer.city, dealer.province].filter(Boolean).join(", ")}
              </p>
              <div className="dealer-profile-stats">
                <span className="dealer-profile-stat-chip">
                  {vehicles.length}{" "}
                  {vehicles.length === 1
                    ? "vehículo disponible"
                    : "vehículos disponibles"}
                </span>
                {totalViews > 0 && (
                  <span className="dealer-profile-stat-chip">
                    {totalViews.toLocaleString("es-AR")} vistas
                  </span>
                )}
              </div>
            </div>
          </div>

          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="dealer-profile-wa-btn"
            >
              Consultar por WhatsApp
            </a>
          )}
        </header>

        {vehicles.length === 0 ? (
          <div className="empty-state">
            Este dealer no tiene publicaciones activas en este momento.
          </div>
        ) : (
          <>
            <p className="dealer-profile-section-label">
              Publicaciones activas
            </p>
            <div className="dealer-profile-grid">
              {vehicles.map((vehicle) => (
                <VehicleCardPublic
                  key={vehicle.id}
                  vehicle={vehicle}
                  dealer={getDealer(vehicle)}
                  appActions={appActions}
                  onNavigate={onNavigate}
                  vehicles={vehicles}
                  getDealer={getDealer}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
