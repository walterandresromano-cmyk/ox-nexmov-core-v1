import { useState } from "react";

import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import {
  getVehicleImageUrl,
  getVehicleTitle,
  getLocationLabel,
  isVehicleReserved,
} from "../../lib/vehicle.js";
import ContactGate from "../../modules/public/ContactGate.jsx";
import VehicleDetailModal from "./VehicleDetailModal.jsx";
import { registerVehicleDetailView } from "../../services/vehicleViews.service.js";
import { SpeedometerIcon, PriceTagIcon } from "../icons/VehicleIcons.jsx";

const fallbackDealer = {
  id: "dealer-fallback",
  commercialName: "Dealer no informado",
  plan: "inicio",
  planStatus: "active",
  province: "",
  city: "",
  phone: "",
  currentPeriod: {
    publicationsUsed: 0,
    expiresInDays: 30,
  },
  benefits: {},
};


function getRankClass(rankTheme) {
  const normalizedRank = String(rankTheme || "inicio").trim().toLowerCase();

  if (normalizedRank === "pro") return "pro";
  if (normalizedRank === "elite") return "elite";
  if (normalizedRank === "platinum") return "platinum";

  return "inicio";
}

function getMarketBadge(delta) {
  if (!delta) return null;

  const percent = Number(delta.percent || 0);
  const absolutePercent = Math.abs(percent);

  if (absolutePercent < 0.1) return null;
  // Differences over 100% indicate stale reference data (common in AR inflation context)
  if (absolutePercent > 100) return null;

  if (delta.isBelowMarket) {
    return {
      tone: "below",
      text: `${absolutePercent.toFixed(1)}% debajo`,
    };
  }

  return {
    tone: "above",
    text: `${absolutePercent.toFixed(1)}% arriba`,
  };
}

function getVehicleStats(vehicle, locationLabel) {
  const stats = [
    {
      key: "km",
      value: formatKm(vehicle.kilometers),
      icon: <SpeedometerIcon size={14} />,
      featured: true,
    },
    {
      key: "location",
      value: locationLabel,
      prefix: "ARG",
      featured: true,
    },
  ];

  const fuel = vehicle.fuelType || vehicle.fuel_type || vehicle.raw?.fuel_type;
  const transmission = vehicle.transmission || vehicle.raw?.transmission;
  const financing =
    vehicle.hasFinancing || vehicle.financing || vehicle.raw?.financing;

  if (financing) {
    stats.push({
      key: "financing",
      value: "Financiación",
      label: "Señal",
      featured: true,
    });
  }

  if (fuel) {
    stats.push({
      key: "fuel",
      value: fuel,
      label: "Combustible",
    });
  }

  if (transmission) {
    stats.push({
      key: "transmission",
      value: transmission,
      label: "Caja",
    });
  }

  return stats.slice(0, 4);
}

export default function VehicleCardPublic({
  vehicle,
  dealer,
  appActions,
  onNavigate,
  vehicles,
  getDealer,
}) {
  const [showContactGate, setShowContactGate] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [lastLead, setLastLead] = useState(null);

  const safeDealer = dealer || fallbackDealer;
  const permissions = getEffectiveDealerPermissions(safeDealer);
  const rankClass = getRankClass(permissions.rankTheme);
  const delta = getMarketDelta(vehicle);
  const marketBadge = getMarketBadge(delta);
  const favoriteActive = appActions?.isFavorite?.(vehicle.id);
  const reserved = isVehicleReserved(vehicle);
  const imageUrl = getVehicleImageUrl(vehicle);
  const vehicleTitle = getVehicleTitle(vehicle);
  const locationLabel = getLocationLabel(vehicle);
  const vehicleStats = getVehicleStats(vehicle, locationLabel);

  function requireLoginForContact() {
    setShowContactGate(false);

    if (onNavigate) {
      onNavigate("login");
    }
  }

  return (
    <>
      <article
        className={`vehicle-card vehicle-card--${rankClass} dealer-rank-${permissions.rankTheme} ${
          reserved ? "vehicle-card-reserved" : ""
        }`}
      >
        <div className="vehicle-card__media">
          <div className="vehicle-card__topbar">
            <span className="vehicle-card__rank">
              {permissions.rankLabel}
            </span>

            <span className="vehicle-card__year">
              {vehicle.year || "Año a confirmar"}
            </span>
          </div>

          {reserved && (
            <div className="vehicle-card__reserved">Unidad reservada</div>
          )}

          {imageUrl ? (
            <img
              className="vehicle-card__image"
              src={imageUrl}
              alt={vehicleTitle}
              loading="lazy"
            />
          ) : (
            <div className="vehicle-card__placeholder">
              <span>Imagen no disponible</span>
            </div>
          )}
        </div>

        <div className="vehicle-card__body">
          <div className="vehicle-card__identity">
            <h3 className="vehicle-card__title">{vehicleTitle}</h3>

            {vehicle.version && (
              <p className="vehicle-card__version">{vehicle.version}</p>
            )}
          </div>

          <div className="vehicle-card__stats" aria-label="Datos destacados">
            {vehicleStats.map((stat) => (
              <div
                className={
                  stat.featured
                    ? `vehicle-card__stat vehicle-card__stat--${stat.key} is-featured`
                    : `vehicle-card__stat vehicle-card__stat--${stat.key}`
                }
                key={stat.key}
              >
                <span className="vehicle-card__stat-label">
                  {stat.icon || stat.prefix || stat.label}
                </span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>

          <div className="vehicle-card__price-box">
            <div className="vehicle-card__price-copy">
              <span className="vehicle-card__price-label">Precio</span>
              <strong className="vehicle-card__price">
                {formatARS(vehicle.price)}
              </strong>
            </div>

            <div className="vehicle-card__price-side">
              {marketBadge && (
                <span
                  className={`vehicle-card__market vehicle-card__market--${marketBadge.tone}`}
                >
                  {marketBadge.text}
                </span>
              )}

              <span className="vehicle-card__price-icon">
                <PriceTagIcon size={14} />
              </span>
            </div>
          </div>

          {lastLead && (
            <p className="lead-created-note">
              Consulta enviada. Te contactarán a la brevedad.
            </p>
          )}

          <div className="vehicle-card__actions">
            <button
              type="button"
              className="vehicle-card__btn vehicle-card__btn--primary"
              onClick={() => {
                if (onNavigate) {
                  onNavigate("vehicleDetail", {
                    vehicleId: vehicle.id,
                  });
                  return;
                }

                registerVehicleDetailView(vehicle.id);
                setShowDetailModal(true);
              }}
            >
              Ver detalle
            </button>

            <button
              type="button"
              className={
                reserved
                  ? "vehicle-card__btn vehicle-card__btn--disabled"
                  : "vehicle-card__btn"
              }
              disabled={reserved}
              onClick={() => setShowContactGate(true)}
              title={
                reserved
                  ? "Esta unidad está reservada por el dealer."
                  : "Contactar dealer"
              }
            >
              Contactar
            </button>

            <button
              type="button"
              className="vehicle-card__btn"
              onClick={() => appActions?.addToCompare?.(vehicle)}
            >
              Comparar
            </button>

            <button
              type="button"
              className={
                favoriteActive
                  ? "vehicle-card__btn vehicle-card__btn--favorite is-active"
                  : "vehicle-card__btn vehicle-card__btn--favorite"
              }
              onClick={() => appActions?.toggleFavorite?.(vehicle)}
            >
              {favoriteActive ? "Guardado" : "Favorito"}
            </button>
          </div>
        </div>
      </article>

      {showDetailModal && (
        <VehicleDetailModal
          vehicle={vehicle}
          dealer={safeDealer}
          onClose={() => setShowDetailModal(false)}
          onCompare={() => appActions?.addToCompare?.(vehicle)}
          onFavorite={() => appActions?.toggleFavorite?.(vehicle)}
          favoriteActive={favoriteActive}
          onContact={() => {
            if (reserved) return;
            setShowDetailModal(false);
            setShowContactGate(true);
          }}
          vehicles={vehicles}
          getDealer={getDealer}
          appActions={appActions}
          onNavigate={onNavigate}
        />
      )}

      {showContactGate && !reserved && (
        <ContactGate
          vehicle={vehicle}
          dealer={safeDealer}
          authUser={appActions?.authUser}
          authProfile={appActions?.authProfile}
          onClose={() => setShowContactGate(false)}
          onRequireLogin={requireLoginForContact}
          onNavigate={onNavigate}
          onLeadCreated={(lead) => setLastLead(lead)}
        />
      )}
    </>
  );
}
