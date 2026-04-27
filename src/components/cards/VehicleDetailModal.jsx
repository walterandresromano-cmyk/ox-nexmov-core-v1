import { useMemo, useState } from "react";

import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";

function getVehicleImages(vehicle) {
  const images = [];

  if (vehicle?.mainImageUrl) {
    images.push({ url: vehicle.mainImageUrl, name: "Portada" });
  }

  if (vehicle?.imageUrl && vehicle.imageUrl !== vehicle?.mainImageUrl) {
    images.push({ url: vehicle.imageUrl, name: "Imagen principal" });
  }

  if (Array.isArray(vehicle?.images)) {
    vehicle.images.forEach((image, index) => {
      const url =
        typeof image === "string"
          ? image
          : image?.url || image?.publicUrl || image?.src || "";

      if (url && !images.some((item) => item.url === url)) {
        images.push({
          url,
          name: image?.name || `Imagen ${index + 1}`,
        });
      }
    });
  }

  const rawImages = vehicle?.raw?.images_json;

  if (Array.isArray(rawImages)) {
    rawImages.forEach((image, index) => {
      const url =
        typeof image === "string"
          ? image
          : image?.url || image?.publicUrl || image?.src || "";

      if (url && !images.some((item) => item.url === url)) {
        images.push({
          url,
          name: image?.name || `Imagen ${index + 1}`,
        });
      }
    });
  }

  if (vehicle?.raw?.main_image_url && !images.some((item) => item.url === vehicle.raw.main_image_url)) {
    images.unshift({ url: vehicle.raw.main_image_url, name: "Portada" });
  }

  return images;
}

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

export default function VehicleDetailModal({
  vehicle,
  dealer,
  onClose,
  onContact,
  onCompare,
  onFavorite,
  favoriteActive,
}) {
  const permissions = getEffectiveDealerPermissions(dealer);
  const delta = getMarketDelta(vehicle);
  const images = useMemo(() => getVehicleImages(vehicle), [vehicle]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = images[selectedImageIndex];
  const reserved = isVehicleReserved(vehicle);

  return (
    <div className="modal-backdrop">
      <section className="vehicle-detail-modal">
        <div className="vehicle-detail-head">
          <div>
            <p className="eyebrow">Detalle del vehículo</p>
            <h2>
              {vehicle.brand} {vehicle.model}
            </h2>
            <p>
              {vehicle.version} · {vehicle.year} · {formatKm(vehicle.kilometers)}
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="vehicle-detail-layout">
          <div className="vehicle-detail-gallery">
            <div className={`detail-main-image dealer-rank-${permissions.rankTheme}`}>
              {selectedImage?.url ? (
                <img
                  src={selectedImage.url}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  loading="lazy"
                />
              ) : (
                <span>
                  {vehicle.brand} {vehicle.model}
                </span>
              )}

              {reserved && (
                <div className="vehicle-reserved-ribbon">Unidad reservada</div>
              )}
            </div>

            {images.length > 1 && (
              <div className="detail-thumbs">
                {images.slice(0, 12).map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    className={index === selectedImageIndex ? "active" : ""}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                  >
                    <img src={image.url} alt={image.name || `Imagen ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="vehicle-detail-info">
            <div className="detail-rank-row">
              <span className={`admin-chip rank-${permissions.rankTheme}`}>
                {permissions.rankLabel}
              </span>

              <span className="detail-status">
                {reserved ? "Reservado" : "Activo"}
              </span>
            </div>

            {reserved && (
              <div className="vehicle-status-alert">
                <strong>Reservado</strong>
                <span>Esta unidad fue marcada como reservada por el dealer.</span>
              </div>
            )}

            <strong className="detail-price">{formatARS(vehicle.price)}</strong>

            {delta && (
              <div className="detail-market-box">
                <span>Referencia de mercado</span>
                <strong>{formatARS(vehicle.marketReferencePrice)}</strong>
                <p>
                  {delta.isBelowMarket
                    ? `${delta.percent.toFixed(1)}% debajo de la referencia cargada`
                    : `${Math.abs(delta.percent).toFixed(1)}% por encima de la referencia cargada`}
                </p>
              </div>
            )}

            <div className="detail-spec-grid">
              <div>
                <span>Año</span>
                <strong>{vehicle.year}</strong>
              </div>

              <div>
                <span>Kilómetros</span>
                <strong>{formatKm(vehicle.kilometers)}</strong>
              </div>

              <div>
                <span>Ubicación</span>
                <strong>
                  {vehicle.city}, {vehicle.province}
                </strong>
              </div>

              <div>
                <span>Financiación</span>
                <strong>{vehicle.hasFinancing ? "Disponible" : "No informada"}</strong>
              </div>

              {vehicle.bodyType && (
                <div>
                  <span>Carrocería</span>
                  <strong>{vehicle.bodyType}</strong>
                </div>
              )}

              {vehicle.transmission && (
                <div>
                  <span>Transmisión</span>
                  <strong>{vehicle.transmission}</strong>
                </div>
              )}

              {vehicle.fuelType && (
                <div>
                  <span>Combustible</span>
                  <strong>{vehicle.fuelType}</strong>
                </div>
              )}

              {vehicle.hasFinancing && (
                <div>
                  <span>Entrega</span>
                  <strong>{formatARS(vehicle.delivery)}</strong>
                </div>
              )}
            </div>

            <div className="detail-dealer-box">
              <span>Dealer</span>
              <strong>{dealer.commercialName}</strong>
              <p>
                {dealer.city}, {dealer.province}
              </p>
            </div>

            <div className="detail-notes-box">
              <span>Detalles del dealer</span>
              <p>
                {vehicle.details ||
                  "La unidad se encuentra disponible para consultar. Las condiciones comerciales y de financiación deben confirmarse con el dealer."}
              </p>
            </div>

            <div className="detail-actions">
              <button onClick={onCompare}>Agregar a comparar</button>

              <button
                className={favoriteActive ? "favorite-active" : ""}
                onClick={onFavorite}
              >
                {favoriteActive ? "Guardado" : "Guardar favorito"}
              </button>

              <button
                className="primary-action"
                onClick={onContact}
                disabled={reserved}
                title={
                  reserved
                    ? "Esta unidad está reservada por el dealer."
                    : "Contactar dealer"
                }
              >
                {reserved ? "Unidad reservada" : "Contactar dealer"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}