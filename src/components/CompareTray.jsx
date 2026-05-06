import { useEffect, useState } from "react";
import VehicleDetailModal from "./cards/VehicleDetailModal.jsx";
import { getEffectiveDealerPermissions } from "../lib/permissions.js";

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatPrice(value) {
  const number = getNumber(value);

  if (!number) return "Consultar";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatKilometers(value) {
  const number = getNumber(value);

  if (!number) return "No informado";

  return `${number.toLocaleString("es-AR")} km`;
}

function getImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return image;

  return (
    image.url ||
    image.publicUrl ||
    image.src ||
    image.imageUrl ||
    image.image_url ||
    image.thumbnail ||
    image.thumbnailUrl ||
    ""
  );
}

function getVehicleImages(vehicle) {
  if (!vehicle) return [];

  const images = [];
  const seen = new Set();

  function addImage(image) {
    const url = getImageUrl(image);
    const cleanUrl = String(url || "").trim();

    if (!cleanUrl || seen.has(cleanUrl)) return;

    seen.add(cleanUrl);
    images.push(cleanUrl);
  }

  function addImages(value) {
    if (!value) return;

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          addImages(JSON.parse(trimmed));
          return;
        } catch {
          addImage(trimmed);
          return;
        }
      }

      addImage(trimmed);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(addImage);
      return;
    }

    addImage(value);
  }

  const candidates = [
    vehicle.mainImageUrl,
    vehicle.main_image_url,
    vehicle.coverImage,
    vehicle.imageUrl,
    vehicle.image_url,
    vehicle.image,
    vehicle.thumbnail,
    vehicle.raw?.main_image_url,
    vehicle.raw?.image_url,
    vehicle.raw?.image,
    vehicle.raw?.thumbnail,
  ];

  candidates.forEach(addImage);

  const imageCollections = [
    vehicle.images,
    vehicle.images_json,
    vehicle.imageUrls,
    vehicle.image_urls,
    vehicle.photos,
    vehicle.raw?.images_json,
    vehicle.raw?.images,
    vehicle.raw?.image_urls,
    vehicle.raw?.photos,
  ];

  imageCollections.forEach(addImages);

  return images.slice(0, 12);
}

function getVehicleTitle(vehicle) {
  return (
    [vehicle?.brand || vehicle?.make, vehicle?.model].filter(Boolean).join(" ") ||
    "Vehículo publicado"
  );
}

function getLocation(vehicle) {
  if (vehicle?.location) return vehicle.location;

  const city = vehicle?.city || vehicle?.raw?.city;
  const province = vehicle?.province || vehicle?.raw?.province;

  if (city && province) return `${city}, ${province}`;
  if (city) return city;
  if (province) return province;

  return "No informado";
}

function getDealerName(vehicle) {
  return (
    vehicle?.dealer?.commercialName ||
    vehicle?.dealer?.commercial_name ||
    vehicle?.dealerName ||
    vehicle?.dealer_name ||
    vehicle?.raw?.dealer_name ||
    "Dealer no informado"
  );
}

function getDealerForVehicle(vehicle) {
  const plan =
    vehicle?.dealer?.plan ||
    vehicle?.dealerPlan ||
    vehicle?.dealer_plan ||
    vehicle?.subscription_plan ||
    vehicle?.raw?.dealer_plan ||
    vehicle?.raw?.subscription_plan ||
    "inicio";

  return (
    vehicle?.dealer || {
      id: vehicle?.dealerId || vehicle?.dealer_id || "dealer-fallback",
      commercialName: getDealerName(vehicle),
      plan,
      planStatus: "active",
      province: vehicle?.province || "",
      city: vehicle?.city || "",
      logo: null,
      phone: "",
      benefits: {},
      currentPeriod: {
        publicationsUsed: 0,
        expiresInDays: 30,
      },
    }
  );
}

function getDealerRank(vehicle) {
  const permissions = getEffectiveDealerPermissions(getDealerForVehicle(vehicle));

  return {
    label: permissions.rankLabel,
    className: permissions.rankTheme,
  };
}

function getMarketDelta(vehicle) {
  const price = getNumber(vehicle?.price);
  const reference = getNumber(
    vehicle?.marketReferencePrice ||
      vehicle?.market_reference_price ||
      vehicle?.referencePrice ||
      vehicle?.reference_price ||
      vehicle?.raw?.market_reference_price ||
      vehicle?.raw?.reference_price ||
      vehicle?.raw?.avg
  );

  if (!price || !reference) return null;

  const percent = ((price - reference) / reference) * 100;

  return {
    reference,
    percent,
    isBelowMarket: percent < 0,
  };
}

function getVehicleStatus(vehicle) {
  if (
    vehicle?.reserved ||
    vehicle?.status === "reserved" ||
    vehicle?.publicationStatus === "reserved" ||
    vehicle?.raw?.reserved
  ) {
    return "Reservado";
  }

  if (vehicle?.status === "paused") return "Pausado";
  if (vehicle?.publicationStatus === "paused_by_system") {
    return "Pausado por sistema";
  }

  return "Activo";
}

function getFinancingLabel(vehicle) {
  return vehicle?.hasFinancing || vehicle?.financing || vehicle?.raw?.financing
    ? "Disponible"
    : "No informada";
}

function getVehicleKey(vehicle, index = 0) {
  return (
    vehicle?.id ||
    vehicle?.vehicle_id ||
    vehicle?.slug ||
    `${vehicle?.brand || vehicle?.make || "vehicle"}-${vehicle?.model || index}`
  );
}

function getCompareTrayMessage(compareItems, appNotice) {
  if (appNotice?.scope === "compare") {
    if (appNotice.message?.includes("Suma otro")) {
      return "Vehículo agregado. Sumá otro para comparar.";
    }

    if (appNotice.message?.includes("agregado al comparador")) {
      return "Ya podés comparar tus opciones.";
    }

    if (appNotice.message?.includes("hasta 4")) {
      return "Podés comparar hasta 4 vehículos. Quitá uno para sumar otro.";
    }

    if (appNotice.message?.includes("ya esta")) {
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
  const imageUrl = images[safeGalleryIndex] || "";
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
        title="Quitar de comparación"
        aria-label={`Quitar ${title} de la comparación`}
      >
        ×
      </button>

      <div className="compare-card-media">
        {imageUrl ? (
          <img className="compare-card-image" src={imageUrl} alt={title} loading="lazy" />
        ) : (
          <strong>{title}</strong>
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
                  key={`${image}-${imageIndex}`}
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

        <strong className="compare-card-price">{formatPrice(vehicle.price)}</strong>

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
            <p>Ref. {formatPrice(market.reference)}</p>
          </div>
        )}

        <div className="compare-spec-list">
          <SpecRow label="Año" highlight>
            {vehicle.year || vehicle.raw?.year || "No informado"}
          </SpecRow>
          <SpecRow label="Km" highlight>
            {formatKilometers(kilometers)}
          </SpecRow>
          <SpecRow label="Ubicación">{getLocation(vehicle)}</SpecRow>
          <SpecRow label="Estado">{getVehicleStatus(vehicle)}</SpecRow>
          <SpecRow label="Financiación" highlight>
            {getFinancingLabel(vehicle)}
          </SpecRow>
          {delivery && <SpecRow label="Entrega">{formatPrice(delivery)}</SpecRow>}
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
  const [galleryIndexes, setGalleryIndexes] = useState({});

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

  return (
    <>
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
          <button
            type="button"
            className="compare-tray-primary"
            onClick={() => setShowCompareModal(true)}
          >
            Comparar vehículos
          </button>
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
                      onOpenDetail={setSelectedDetailVehicle}
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
          onClose={() => setSelectedDetailVehicle(null)}
          onCompare={() => addToCompare(selectedDetailVehicle)}
          onFavorite={() => toggleFavorite(selectedDetailVehicle)}
          favoriteActive={isFavorite(selectedDetailVehicle.id)}
          onContact={() => {
            setSelectedDetailVehicle(null);
            setShowCompareModal(false);
            onNavigate?.("login");
          }}
        />
      )}
    </>
  );
}
