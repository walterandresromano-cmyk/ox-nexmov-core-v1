import { useState } from "react";

import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import ContactGate from "../../modules/public/ContactGate.jsx";
import VehicleDetailModal from "./VehicleDetailModal.jsx";

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

function isVehicleReserved(vehicle) {
  return (
    vehicle?.reserved === true ||
    vehicle?.status === "reserved" ||
    vehicle?.publicationStatus === "reserved" ||
    vehicle?.raw?.reserved === true ||
    vehicle?.raw?.publication_status === "reserved" ||
    vehicle?.raw?.status === "reserved"
  );
}

function getVehicleImageUrl(vehicle) {
  if (!vehicle) return "";

  if (vehicle.mainImageUrl) return vehicle.mainImageUrl;
  if (vehicle.imageUrl) return vehicle.imageUrl;
  if (vehicle.main_image_url) return vehicle.main_image_url;
  if (vehicle.image_url) return vehicle.image_url;

  if (Array.isArray(vehicle.images) && vehicle.images.length > 0) {
    const firstImage = vehicle.images[0];

    if (typeof firstImage === "string") return firstImage;
    if (firstImage?.url) return firstImage.url;
    if (firstImage?.publicUrl) return firstImage.publicUrl;
  }

  if (vehicle.raw?.main_image_url) return vehicle.raw.main_image_url;
  if (vehicle.raw?.image_url) return vehicle.raw.image_url;

  const rawImages = vehicle.raw?.images_json;

  if (Array.isArray(rawImages) && rawImages.length > 0) {
    const firstRawImage = rawImages[0];

    if (typeof firstRawImage === "string") return firstRawImage;
    if (firstRawImage?.url) return firstRawImage.url;
    if (firstRawImage?.publicUrl) return firstRawImage.publicUrl;
  }

  return "";
}

function getVehicleTitle(vehicle) {
  return (
    [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ") ||
    "Vehículo publicado"
  );
}

function getLocationLabel(vehicle) {
  const city = String(vehicle?.city || "").trim();
  const province = String(vehicle?.province || "").trim();

  if (city && province) return `${city}, ${province}`;
  if (city) return city;
  if (province) return province;

  return "Ubicación a confirmar";
}

function getRankClass(rankTheme) {
  const normalizedRank = String(rankTheme || "inicio").trim().toLowerCase();

  if (normalizedRank === "pro") return "pro";
  if (normalizedRank === "elite") return "elite";
  if (normalizedRank === "platinum") return "platinum";

  return "inicio";
}

function getRankIcon(rankTheme) {
  const normalizedRank = String(rankTheme || "inicio").trim().toLowerCase();

  if (normalizedRank === "elite") return "✦";
  if (normalizedRank === "platinum") return "◆";
  if (normalizedRank === "pro") return "◇";

  return "•";
}

function getMarketBadge(delta) {
  if (!delta) return null;

  const percent = Number(delta.percent || 0);
  const absolutePercent = Math.abs(percent);

  if (absolutePercent < 0.1) return null;

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

export default function VehicleCardPublic({
  vehicle,
  dealer,
  appActions,
  onNavigate,
}) {
  const [showContactGate, setShowContactGate] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [lastLead, setLastLead] = useState(null);

  const safeDealer = dealer || fallbackDealer;
  const permissions = getEffectiveDealerPermissions(safeDealer);
  const rankClass = getRankClass(permissions.rankTheme);
  const rankIcon = getRankIcon(rankClass);
  const delta = getMarketDelta(vehicle);
  const marketBadge = getMarketBadge(delta);
  const favoriteActive = appActions?.isFavorite?.(vehicle.id);
  const reserved = isVehicleReserved(vehicle);
  const imageUrl = getVehicleImageUrl(vehicle);
  const vehicleTitle = getVehicleTitle(vehicle);
  const locationLabel = getLocationLabel(vehicle);

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
                <span aria-hidden="true">{rankIcon}</span>
                {permissions.rankLabel}
              </span>
            
              <span className="vehicle-card__year">
                {vehicle.year || "Año a confirmar"}
              </span>
            </div>
            
            <div className="vehicle-card__media-title">
              <h3 className="vehicle-card__title">{vehicleTitle}</h3>
            
              {vehicle.version && (
                <p className="vehicle-card__version">{vehicle.version}</p>
              )}
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
              <span>{vehicleTitle}</span>
            </div>
          )}
        </div>

        <div className="vehicle-card__body">

              <div className="vehicle-card__fact">
             <span className="vehicle-card__fact-icon" aria-hidden="true">
               <img src="/icons/speedometer.png" alt="" />
             </span>
             <strong>{formatKm(vehicle.kilometers)}</strong>

            <div className="vehicle-card__fact vehicle-card__fact--location">
              <span aria-hidden="true">⌖</span>
              <strong>{locationLabel}</strong>
            </div>
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

              <span className="vehicle-card__price-icon" aria-hidden="true">
                <img src="/icons/price.png" alt="" />
              </span>
            </div>
          </div>

          {lastLead && (
            <p className="lead-created-note">
              ✓ Consulta enviada. Te contactarán a la brevedad.
            </p>
          )}

          <div className="vehicle-card__actions">
            <button
              type="button"
              className="vehicle-card__btn vehicle-card__btn--primary"
              onClick={() => setShowDetailModal(true)}
            >
              Ver detalle <span aria-hidden="true">→</span>
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
          onLeadCreated={(lead) => setLastLead(lead)}
        />
      )}
    </>
  );
}