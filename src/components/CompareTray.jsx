import { useEffect, useState } from "react";
import VehicleDetailModal from "./cards/VehicleDetailModal.jsx";
import ContactGate from "../modules/public/ContactGate.jsx";
import { getEffectiveDealerPermissions } from "../lib/permissions.js";
import { registerVehicleDetailView } from "../services/vehicleViews.service.js";
import {
  getVehicleImages,
  getVehicleTitle,
  getLocationLabel,
  getVehicleStatus,
  getVehicleKey,
} from "../lib/vehicle.js";
import { getDealerName, getDealerForVehicle } from "../lib/dealer.js";
import { formatARS, formatKm, getMarketDelta } from "../lib/formatters.js";

function getDealerRank(vehicle) {
  const permissions = getEffectiveDealerPermissions(getDealerForVehicle(vehicle));

  return {
    label: permissions.rankLabel,
    className: permissions.rankTheme,
  };
}

function getFinancingLabel(vehicle) {
  return vehicle?.hasFinancing || vehicle?.financing || vehicle?.raw?.financing
    ? "Disponible"
    : "No informada";
}

function getCompareTrayMessage(compareItems, appNotice) {
  if (appNotice?.scope === "compare") {
    if (appNotice.message?.includes("Sumá otro")) {
      return "Vehículo agregado. Sumá otro para comparar.";
    }

    if (appNotice.message?.includes("agregado al comparador")) {
      return "Ya podés comparar tus opciones.";
    }

    if (appNotice.message?.includes("hasta 4")) {
      return "Podés comparar hasta 4 vehículos. Quitá uno para sumar otro.";
    }

    if (appNotice.message?.includes("ya está")) {
      return "Ese vehículo ya está en el comparador.";
    }

    if (appNotice.message?.includes("al menos 2")) {
      return "Seleccioná al menos 2 vehículos para comparar.";
    }

    return appNotice.message;
  }

  if (compareItems.length === 1) {
    return "Vehículo agregado. Sumá otro para comparar.";
  }

  return "";
}

function SpecRow({ label, children, highlight = false }) {
  if (!children) return null;

  return (
    <div className={highlight ? "compare-spec-row is-highlight" : "compare-spec-row"}>
      <span className="compare-spec-label">{label}</span>
      <strong className="compare-spec-value">{children}</strong>
    </div>
  );
}

function CompareVehicleCard({
  vehicle,
  index,
  galleryIndex = 0,
  onGalleryMove,
  onRemove,
  onOpenDetail,
}) {
  const images = getVehicleImages(vehicle);
  const safeGalleryIndex =
    images.length > 0 ? Math.min(galleryIndex, images.length - 1) : 0;
  const imageUrl = images[safeGalleryIndex]?.url || "";
  const title = getVehicleTitle(vehicle);
  const market = getMarketDelta(vehicle);
  const dealerRank = getDealerRank(vehicle);
  const vehicleKey = getVehicleKey(vehicle, index);
  const kilometers =
    vehicle.kilometers || vehicle.km || vehicle.mileage || vehicle.raw?.km;
  const delivery = vehicle.delivery || vehicle.raw?.delivery;
  const months = vehicle.months || vehicle.raw?.months;
  const rate = vehicle.rate || vehicle.raw?.rate;

  return (
    <article className={`compare-card dealer-rank-${dealerRank.className}`}>
      <button
        type="button"
        className="compare-card-remove"
        onClick={() => onRemove(vehicle.id)}
        title="Quitar vehículo de la comparación"
        aria-label="Quitar vehículo de la comparación"
      >
        ×
      </button>

      <div className="compare-card-media">
        {imageUrl ? (
          <img className="compare-card-image" src={imageUrl} alt={title} loading="lazy" />
        ) : (
          <div className="compare-card-placeholder">
            <span>Imagen no disponible</span>
            <strong>{title}</strong>
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              className="compare-card-gallery-btn prev"
              onClick={() => onGalleryMove(vehicleKey, -1, images.length)}
              aria-label="Imagen anterior"
            >
              ‹
            </button>

            <button
              type="button"
              className="compare-card-gallery-btn next"
              onClick={() => onGalleryMove(vehicleKey, 1, images.length)}
              aria-label="Imagen siguiente"
            >
              ›
            </button>

            <span className="compare-card-gallery-count">
              {safeGalleryIndex + 1} / {images.length}
            </span>

            <div className="compare-card-gallery-dots" aria-hidden="true">
              {images.slice(0, 6).map((image, imageIndex) => (
                <span
                  key={`${image.url}-${imageIndex}`}
                  className={
                    imageIndex === safeGalleryIndex
                      ? "compare-card-gallery-dot is-active"
                      : "compare-card-gallery-dot"
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="compare-card-body">
        <div className="compare-card-dealer">
          <span className={`admin-chip rank-${dealerRank.className}`}>
            {dealerRank.label}
          </span>
          <p>{getDealerName(vehicle)}</p>
        </div>

        <div>
          <h3 className="compare-card-title">{title}</h3>
          <p className="compare-card-version">
            {vehicle.version || vehicle.raw?.version || "Versión no informada"}
          </p>
        </div>

        <strong className="compare-card-price">{formatARS(vehicle.price)}</strong>

        {market && (
          <div
            className={
              market.isBelowMarket
                ? "compare-market is-below"
                : "compare-market is-above"
            }
          >
            <span>Referencia de mercado</span>
            <strong>
              {market.isBelowMarket
                ? `${Math.abs(market.percent).toFixed(1)}% debajo`
                : `${market.percent.toFixed(1)}% arriba`}
            </strong>
            <p>Ref. {formatARS(market.reference)}</p>
          </div>
        )}

        <div className="compare-spec-list">
          <SpecRow label="Año" highlight>
            {vehicle.year || vehicle.raw?.year || "No informado"}
          </SpecRow>
          <SpecRow label="Km" highlight>
            {formatKm(kilometers)}
          </SpecRow>
          <SpecRow label="Ubicación">{getLocationLabel(vehicle)}</SpecRow>
          <SpecRow label="Estado">{getVehicleStatus(vehicle)}</SpecRow>
          <SpecRow label="Financiación" highlight>
            {getFinancingLabel(vehicle)}
          </SpecRow>
          {delivery && <SpecRow label="Entrega">{formatARS(delivery)}</SpecRow>}
          {months && <SpecRow label="Cuotas">{months} meses</SpecRow>}
          {rate && <SpecRow label="Tasa">{rate}%</SpecRow>}
          <SpecRow label="Combustible">
            {vehicle.fuelType || vehicle.fuel_type || vehicle.raw?.fuel_type}
          </SpecRow>
          <SpecRow label="Transmisión">
            {vehicle.transmission || vehicle.raw?.transmission}
          </SpecRow>
          <SpecRow label="Carrocería">
            {vehicle.bodyType || vehicle.body_type || vehicle.raw?.body_type}
          </SpecRow>
        </div>

        <div className="compare-card-actions">
          <button
            type="button"
            className="compare-card-detail"
            onClick={() => onOpenDetail(vehicle)}
          >
            Ver detalle
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CompareTray({ appActions, onNavigate }) {
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState(null);
  const [contactVehicle, setContactVehicle] = useState(null);
  const [galleryIndexes, setGalleryIndexes] = useState({});
  const [restoreCompareAfterDetail, setRestoreCompareAfterDetail] =
    useState(false);

  const compareItems = appActions?.compareItems || [];
  const removeFromCompare = appActions?.removeFromCompare || (() => {});
  const clearCompare = appActions?.clearCompare || (() => {});
  const addToCompare = appActions?.addToCompare || (() => {});
  const toggleFavorite = appActions?.toggleFavorite || (() => {});
  const isFavorite = appActions?.isFavorite || (() => false);
  const compareOpenRequest = appActions?.compareOpenRequest || 0;

  useEffect(() => {
    if (!compareOpenRequest) return;
    if (compareItems.length < 2) return;

    setShowCompareModal(true);
  }, [compareOpenRequest, compareItems.length]);

  if (!compareItems.length) return null;

  const canOpenComparison = compareItems.length >= 2;
  const compareVehicles = compareItems.slice(0, 4);
  const countClass = `compare-count-${Math.max(1, Math.min(compareVehicles.length, 4))}`;
  const trayMessage = getCompareTrayMessage(compareItems, appActions?.appNotice);
  const selectedDealer = selectedDetailVehicle
    ? getDealerForVehicle(selectedDetailVehicle)
    : null;
  const contactDealer = contactVehicle ? getDealerForVehicle(contactVehicle) : null;

  function moveCompareImage(vehicleKey, direction, total) {
    setGalleryIndexes((current) => {
      const currentIndex = current[vehicleKey] || 0;
      const nextIndex = (currentIndex + direction + total) % total;

      return {
        ...current,
        [vehicleKey]: nextIndex,
      };
    });
  }

  function openDetailFromCompare(vehicle) {
    registerVehicleDetailView(vehicle.id || vehicle.vehicle_id);
    setRestoreCompareAfterDetail(showCompareModal);
    setShowCompareModal(false);
    setSelectedDetailVehicle(vehicle);
  }

  function closeDetailFromCompare() {
    setSelectedDetailVehicle(null);

    if (restoreCompareAfterDetail && compareItems.length > 0) {
      setShowCompareModal(true);
    }

    setRestoreCompareAfterDetail(false);
  }

  return (
    <>
      {!showCompareModal && (
        <aside className="compare-tray">
          <div className="compare-tray-header">
            <div className="compare-tray-titleblock">
              <strong className="compare-tray-title">Comparador</strong>
              <span className="compare-tray-count">
                {compareItems.length} / 4 vehículos
              </span>
            </div>

            <button
              type="button"
              className="compare-tray-clear"
              onClick={clearCompare}
            >
              Limpiar
            </button>
          </div>

          {trayMessage && (
            <p className="compare-tray-message">{trayMessage}</p>
          )}

          <div className="compare-tray-scroll" aria-label="Vehículos comparados">
            {compareItems.map((vehicle) => (
              <div className="compare-tray-chip" key={vehicle.id}>
                <span className="compare-tray-chip-name">
                  {getVehicleTitle(vehicle)}
                </span>

                <button
                  type="button"
                  className="compare-tray-chip-remove"
                  onClick={() => removeFromCompare(vehicle.id)}
                  aria-label={`Quitar ${getVehicleTitle(vehicle)}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {canOpenComparison ? (
            <>
              <button
                type="button"
                className="compare-tray-primary"
                onClick={() => setShowCompareModal(true)}
              >
                Comparar vehículos
              </button>
              <button
                type="button"
                className="compare-tray-secondary"
                onClick={() => {
                  const ids = compareItems.map((v) => v.id).join(",");
                  onNavigate?.("compare", { ids });
                }}
              >
                Abrir página completa ↗
              </button>
            </>
          ) : (
            <button
              type="button"
              className="compare-tray-primary"
              onClick={() => onNavigate?.("search")}
            >
              Agregá otro vehículo para comparar
            </button>
          )}
        </aside>
      )}

      {showCompareModal && (
        <div className="modal-backdrop">
          <section
            className={`compare-modal ${countClass}`}
            aria-label="Comparación inteligente"
          >
            <header className="compare-modal-header">
              <div className="compare-modal-titleblock">
                <p className="eyebrow">Comparación inteligente</p>
                <h2>Compará opciones con lectura real.</h2>
                <p>
                  Revisá precio, referencia de mercado, kilometraje,
                  financiación, ubicación y datos técnicos antes de contactar.
                </p>
              </div>

              <div className="compare-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompareModal(false);
                    onNavigate?.("search");
                  }}
                >
                  Seguir buscando
                </button>

                <button type="button" onClick={clearCompare}>
                  Limpiar comparación
                </button>

                <button type="button" onClick={() => setShowCompareModal(false)}>
                  Cerrar
                </button>
              </div>
            </header>

            {compareItems.length ? (
              <div className="compare-modal-scroll">
                <div className={`compare-grid ${countClass}`}>
                  {compareVehicles.map((vehicle, index) => {
                    const vehicleKey = getVehicleKey(vehicle, index);

                    return (
                    <CompareVehicleCard
                      key={vehicleKey}
                      vehicle={vehicle}
                      index={index}
                      galleryIndex={galleryIndexes[vehicleKey] || 0}
                      onGalleryMove={moveCompareImage}
                      onRemove={removeFromCompare}
                      onOpenDetail={openDetailFromCompare}
                    />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="compare-empty-state">
                <h3>Todavía no agregaste vehículos para comparar.</h3>
                <p>
                  Agregá hasta 4 publicaciones desde las cards para construir
                  una comparación real.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {selectedDetailVehicle && selectedDealer && (
        <VehicleDetailModal
          vehicle={selectedDetailVehicle}
          dealer={selectedDealer}
          onClose={closeDetailFromCompare}
          onCompare={() => addToCompare(selectedDetailVehicle)}
          onFavorite={() => toggleFavorite(selectedDetailVehicle)}
          favoriteActive={isFavorite(selectedDetailVehicle.id)}
          onContact={() => {
            setContactVehicle(selectedDetailVehicle);
            setSelectedDetailVehicle(null);
            setShowCompareModal(false);
            setRestoreCompareAfterDetail(false);
          }}
        />
      )}

      {contactVehicle && contactDealer && (
        <ContactGate
          vehicle={contactVehicle}
          dealer={contactDealer}
          authUser={appActions?.authUser}
          authProfile={appActions?.authProfile}
          onClose={() => setContactVehicle(null)}
          onRequireLogin={() => {
            setContactVehicle(null);
            onNavigate?.("login");
          }}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}
