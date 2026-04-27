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
  const delta = getMarketDelta(vehicle);
  const favoriteActive = appActions?.isFavorite?.(vehicle.id);
  const reserved = isVehicleReserved(vehicle);
  const imageUrl = getVehicleImageUrl(vehicle);

  function requireLoginForContact() {
    setShowContactGate(false);

    if (onNavigate) {
      onNavigate("login");
    }
  }

  return (
    <>
      <article
        className={`vehicle-card dealer-rank-${permissions.rankTheme} ${
          reserved ? "vehicle-card-reserved" : ""
        }`}
      >
        <div className="vehicle-card-media">
          {imageUrl ? (
            <img
              className="vehicle-card-image"
              src={imageUrl}
              alt={`${vehicle.brand} ${vehicle.model}`}
              loading="lazy"
            />
          ) : (
            <div className="vehicle-card-placeholder">
              {vehicle.brand} {vehicle.model}
            </div>
          )}

          {reserved && (
            <div className="vehicle-reserved-ribbon">Unidad reservada</div>
          )}
        </div>

        <div className="vehicle-card-body">
          <div className="vehicle-card-head">
            <span className="dealer-rank">{permissions.rankLabel}</span>
            <span>{vehicle.year}</span>
          </div>

          {reserved && (
            <div className="vehicle-status-alert">
              <strong>Reservado</strong>
              <span>Esta unidad fue marcada como reservada por el dealer.</span>
            </div>
          )}

          <h3>
            {vehicle.brand} {vehicle.model}
          </h3>

          <p className="vehicle-version">{vehicle.version}</p>

          <p className="vehicle-meta">
            {formatKm(vehicle.kilometers)} · {vehicle.city}, {vehicle.province}
          </p>

          <strong className="vehicle-price">{formatARS(vehicle.price)}</strong>

          {delta && (
            <p className="vehicle-market">
              Ref. mercado {formatARS(vehicle.marketReferencePrice)} ·{" "}
              {delta.isBelowMarket
                ? `${delta.percent.toFixed(1)}% debajo`
                : `${Math.abs(delta.percent).toFixed(1)}% arriba`}
            </p>
          )}

          {lastLead && (
            <p className="lead-created-note">Lead generado · contacto trazado</p>
          )}

          <div className="vehicle-actions vehicle-actions-four">
            <button onClick={() => setShowDetailModal(true)}>Ver detalle</button>

            <button onClick={() => appActions.addToCompare(vehicle)}>
              Comparar
            </button>

            <button
              className={favoriteActive ? "favorite-active" : ""}
              onClick={() => appActions.toggleFavorite(vehicle)}
            >
              {favoriteActive ? "Guardado" : "Favorito"}
            </button>

            <button
              className={reserved ? "vehicle-contact-disabled" : ""}
              disabled={reserved}
              onClick={() => setShowContactGate(true)}
              title={
                reserved
                  ? "Esta unidad está reservada por el dealer."
                  : "Contactar dealer"
              }
            >
              {reserved ? "Reservado" : "Contactar"}
            </button>
          </div>
        </div>
      </article>

      {showDetailModal && (
        <VehicleDetailModal
          vehicle={vehicle}
          dealer={safeDealer}
          onClose={() => setShowDetailModal(false)}
          onCompare={() => appActions.addToCompare(vehicle)}
          onFavorite={() => appActions.toggleFavorite(vehicle)}
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