import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import "../../styles/vehicle-detail-modal.css";
import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";

function getVehicleImages(vehicle) {
  const images = [];
  const seen = new Set();

  function addImage(image, name) {
    const url =
      typeof image === "string"
        ? image
        : image?.url ||
          image?.publicUrl ||
          image?.src ||
          image?.imageUrl ||
          image?.image_url ||
          image?.thumbnail ||
          image?.thumbnailUrl ||
          "";

    const cleanUrl = String(url || "").trim();

    if (!cleanUrl || seen.has(cleanUrl)) return;

    seen.add(cleanUrl);
    images.push({
      url: cleanUrl,
      name: image?.name || image?.alt || name || `Imagen ${images.length + 1}`,
    });
  }

  function addImages(value, namePrefix = "Imagen") {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((image, index) => {
        addImage(image, `${namePrefix} ${index + 1}`);
      });
      return;
    }

    addImage(value, namePrefix);
  }

  addImage(vehicle?.mainImageUrl, "Portada");
  addImage(vehicle?.main_image_url, "Portada");
  addImage(vehicle?.coverImage, "Portada");
  addImage(vehicle?.cover_image, "Portada");
  addImage(vehicle?.imageUrl, "Imagen principal");
  addImage(vehicle?.image_url, "Imagen principal");
  addImage(vehicle?.image, "Imagen principal");
  addImage(vehicle?.thumbnail, "Miniatura");

  addImages(vehicle?.images, "Imagen");
  addImages(vehicle?.images_json, "Imagen");
  addImages(vehicle?.imageUrls, "Imagen");
  addImages(vehicle?.image_urls, "Imagen");
  addImages(vehicle?.photos, "Foto");

  addImage(vehicle?.raw?.main_image_url, "Portada");
  addImage(vehicle?.raw?.cover_image, "Portada");
  addImage(vehicle?.raw?.image_url, "Imagen principal");
  addImage(vehicle?.raw?.image, "Imagen principal");
  addImage(vehicle?.raw?.thumbnail, "Miniatura");
  addImages(vehicle?.raw?.images_json, "Imagen");
  addImages(vehicle?.raw?.images, "Imagen");
  addImages(vehicle?.raw?.image_urls, "Imagen");
  addImages(vehicle?.raw?.photos, "Foto");

  return images.slice(0, 12);
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
  const isPlatinumDealer = permissions.rankTheme === "platinum";
  const delta = getMarketDelta(vehicle);
  const images = useMemo(() => getVehicleImages(vehicle), [vehicle]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const mainImageRef = useRef(null);
  const dragOriginRef = useRef({ x: 0, y: 0, position: { x: 0, y: 0 } });
  const imageWasDraggedRef = useRef(false);
  const selectedImage = images[selectedImageIndex];
  const reserved = isVehicleReserved(vehicle);

  function clampZoomPosition(position, scale = zoomScale) {
    const frame = mainImageRef.current;
    const fallbackOffset = 160;

    if (!frame) {
      return {
        x: Math.max(-fallbackOffset, Math.min(fallbackOffset, position.x)),
        y: Math.max(-fallbackOffset, Math.min(fallbackOffset, position.y)),
      };
    }

    const { width, height } = frame.getBoundingClientRect();
    const maxX = Math.max(0, (width * scale - width) / 2);
    const maxY = Math.max(0, (height * scale - height) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, position.x)),
      y: Math.max(-maxY, Math.min(maxY, position.y)),
    };
  }

  function resetImageZoom() {
    setIsZoomed(false);
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsDraggingImage(false);
    imageWasDraggedRef.current = false;
  }

  useEffect(() => {
    setSelectedImageIndex(0);
    resetImageZoom();
  }, [vehicle?.id, vehicle?.vehicle_id, images[0]?.url]);

  function toggleImageZoom() {
    if (!selectedImage?.url) return;

    setIsZoomed(true);
    setZoomScale(2.2);
    setZoomPosition({ x: 0, y: 0 });
    setIsDraggingImage(false);
  }

  function handleZoomStageClick() {
    if (!selectedImage?.url) return;

    if (imageWasDraggedRef.current) {
      imageWasDraggedRef.current = false;
      return;
    }

    toggleImageZoom();
  }

  function handleZoomPointerDown(event) {
    if (!isZoomed || !selectedImage?.url) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    imageWasDraggedRef.current = false;

    const nextDragStart = {
      x: event.clientX,
      y: event.clientY,
    };

    dragOriginRef.current = {
      ...nextDragStart,
      position: zoomPosition,
    };
    setIsDraggingImage(true);
  }

  function handleZoomPointerMove(event) {
    if (!isZoomed || !isDraggingImage) return;

    event.preventDefault();

    const deltaX = event.clientX - dragOriginRef.current.x;
    const deltaY = event.clientY - dragOriginRef.current.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      imageWasDraggedRef.current = true;
    }

    setZoomPosition(
      clampZoomPosition(
        {
          x: dragOriginRef.current.position.x + deltaX,
          y: dragOriginRef.current.position.y + deltaY,
        },
        zoomScale
      )
    );
  }

  function stopZoomDrag(event) {
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    setIsDraggingImage(false);
  }

  function handleClose() {
    resetImageZoom();
    onClose();
  }

  const modal = (
    <div className="modal-backdrop vehicle-detail-backdrop">
      <section className="vehicle-detail-modal">
        <button
          type="button"
          className="modal-close-btn vehicle-detail-close"
          onClick={handleClose}
          aria-label="Cerrar detalle"
        >
          ×
        </button>

        <div className="vehicle-detail-layout">
          <div className="vehicle-detail-gallery">
            <div className="detail-gallery-frame">
              <div
                ref={mainImageRef}
                className={`vehicle-detail-main-image detail-main-image dealer-rank-${permissions.rankTheme} ${
                  isZoomed ? "is-zoomed" : ""
                } ${isDraggingImage ? "is-dragging" : ""}`}
                onClick={handleZoomStageClick}
                onPointerDown={handleZoomPointerDown}
                onPointerMove={handleZoomPointerMove}
                onPointerUp={stopZoomDrag}
                onPointerCancel={stopZoomDrag}
                onPointerLeave={stopZoomDrag}
              >
                {selectedImage?.url ? (
                  <img
                    src={selectedImage.url}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    loading="lazy"
                    draggable="false"
                    style={{
                      transform: `translate3d(${zoomPosition.x}px, ${zoomPosition.y}px, 0) scale(${zoomScale})`,
                    }}
                  />
                ) : (
                  <span>
                    {vehicle.brand} {vehicle.model}
                  </span>
                )}

                {reserved && (
                  <div className="vehicle-reserved-ribbon">
                    Unidad reservada
                  </div>
                )}

                {selectedImage?.url && (
                  <div className="vehicle-detail-zoom-controls">
                    <button
                      className={`vehicle-detail-zoom-button ${
                        isZoomed ? "is-active" : ""
                      }`}
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleImageZoom();
                      }}
                      aria-label="Ampliar imagen"
                    >
                      +
                    </button>

                    <button
                      className="vehicle-detail-zoom-button"
                      type="button"
                      disabled={!isZoomed}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        resetImageZoom();
                      }}
                      aria-label="Reducir imagen"
                    >
                      −
                    </button>
                  </div>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="vehicle-detail-thumbs detail-thumbs">
                {images.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    className={
                      index === selectedImageIndex
                        ? "vehicle-detail-thumb is-active active"
                        : "vehicle-detail-thumb"
                    }
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      resetImageZoom();
                    }}
                    aria-label={`Ver imagen ${index + 1}`}
                  >
                    <img
                      src={image.url}
                      alt={image.name || `Imagen ${index + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="vehicle-detail-info">
            <div className="vehicle-detail-title-card">
              <p className="eyebrow">Detalle del vehículo</p>
              <h2>
                {vehicle.brand} {vehicle.model}
              </h2>
              <p>
                {vehicle.version} · {vehicle.year} ·{" "}
                {formatKm(vehicle.kilometers)}
              </p>
            </div>

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
                <strong>
                  {vehicle.hasFinancing ? "Disponible" : "No informada"}
                </strong>
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

            {isPlatinumDealer && (
              <div className="vehicle-detail-platinum-block">
                <span className="vehicle-detail-platinum-kicker">
                  Dealer Platinum
                </span>
                <strong className="vehicle-detail-platinum-title">
                  Máxima presencia dentro de oX NEXMOV.
                </strong>
                <p>
                  Dealer con máxima presencia dentro de la red oX NEXMOV.
                </p>
                <div className="vehicle-detail-platinum-chips">
                  <span className="vehicle-detail-platinum-chip">
                    Publicaciones de alto volumen
                  </span>
                  <span className="vehicle-detail-platinum-chip">
                    Señales comerciales completas
                  </span>
                  <span className="vehicle-detail-platinum-chip">
                    Herramientas avanzadas
                  </span>
                </div>
              </div>
            )}

            <div className="detail-notes-box">
              <span>Detalles del dealer</span>
              <p>
                {vehicle.details ||
                  "La unidad se encuentra disponible para consultar. Las condiciones comerciales y de financiación deben confirmarse con el dealer."}
              </p>
            </div>

            {vehicle.hasFinancing && (
              <p className="finance-legal-note">
                Los valores de financiación son informativos y pueden variar
                según aprobación crediticia, entidad financiera, condiciones del
                dealer y fecha de operación.
              </p>
            )}

            <p className="vehicle-detail-legal-note">
              La información de esta publicación fue declarada por el dealer
              anunciante. Verificá disponibilidad, precio final, documentación y
              condiciones antes de avanzar.
            </p>

            <div className="detail-actions">
              <button type="button" onClick={onCompare}>
                Agregar a comparar
              </button>

              <button
                type="button"
                className={favoriteActive ? "favorite-active" : ""}
                onClick={onFavorite}
              >
                {favoriteActive ? "Guardado" : "Guardar favorito"}
              </button>

              <button
                type="button"
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

  return createPortal(modal, document.body);
}
