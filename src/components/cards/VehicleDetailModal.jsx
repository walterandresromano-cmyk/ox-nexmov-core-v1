import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import "../../styles/vehicle-detail-modal.css";
import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import { getVehicleImages, isVehicleReserved } from "../../lib/vehicle.js";
import ContactGate from "../../modules/public/ContactGate.jsx";
import VehicleImage from "../VehicleImage.jsx";


const MAINTENANCE_SOURCE_KEYS = [
  "maintenance",
  "maintenance_info",
  "maintenanceInfo",
];

function getMaintenanceValue(vehicle, ...keys) {
  const sources = [
    vehicle,
    vehicle?.raw,
    ...MAINTENANCE_SOURCE_KEYS.map((key) => vehicle?.[key]),
    ...MAINTENANCE_SOURCE_KEYS.map((key) => vehicle?.raw?.[key]),
  ].filter(Boolean);

  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];

      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
  }

  return null;
}

function getPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseFinancingNumber(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function calculateUsedVehicleFinancing({ price, downPayment, termMonths, monthlyIncome }) {
  const vehiclePrice = parseFinancingNumber(price);
  const down = parseFinancingNumber(downPayment);
  const term = Number(termMonths) || 36;
  const income = parseFinancingNumber(monthlyIncome);

  if (!vehiclePrice || down >= vehiclePrice) return null;

  const financed = vehiclePrice - down;
  const monthlyRate = 0.035;
  const monthlyPayment =
    financed *
    ((monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1));
  const totalPaid = monthlyPayment * term;
  const incomePercent = income > 0 ? Math.round((monthlyPayment / income) * 100) : null;

  return { financed, monthlyPayment, totalPaid, incomePercent };
}

function formatMaintenanceDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getVehicleMaintenanceInfo(vehicle) {
  const showMaintenanceInfo = getMaintenanceValue(
    vehicle,
    "show_maintenance_info",
    "showMaintenanceInfo"
  );
  const rows = [];

  function addText(label, ...keys) {
    const value = getMaintenanceValue(vehicle, ...keys);
    if (!value) return;
    rows.push({ label, value: String(value) });
  }

  function addMoney(label, ...keys) {
    const value = getPositiveNumber(getMaintenanceValue(vehicle, ...keys));
    if (!value) return;
    rows.push({ label, value: formatARS(value) });
  }

  function addNumber(label, suffix, ...keys) {
    const value = getPositiveNumber(getMaintenanceValue(vehicle, ...keys));
    if (!value) return;
    rows.push({ label, value: `${value.toLocaleString("es-AR")} ${suffix}` });
  }

  addMoney("Seguro informado", "insurance_monthly_amount", "insuranceMonthlyAmount");
  addText("Proveedor", "insurance_provider", "insuranceProvider");
  addText("Cobertura", "insurance_coverage_type", "insuranceCoverageType");
  addNumber("Tanque", "litros", "fuel_tank_liters", "fuelTankLiters");
  addMoney("Costo tanque lleno informado", "fuel_full_tank_cost", "fuelFullTankCost");
  addMoney("Service aproximado", "estimated_service_cost", "estimatedServiceCost");
  addMoney(
    "Mantenimiento mensual orientativo",
    "estimated_monthly_maintenance",
    "estimatedMonthlyMaintenance"
  );
  addText("Detalle", "maintenance_notes", "maintenanceNotes");

  const updatedAt = formatMaintenanceDate(
    getMaintenanceValue(vehicle, "maintenance_updated_at", "maintenanceUpdatedAt")
  );

  if (updatedAt) rows.push({ label: "Dato actualizado", value: updatedAt });

  return {
    rows,
    shouldShow: Boolean(showMaintenanceInfo) && rows.length > 0,
  };
}

export default function VehicleDetailModal({
  vehicle,
  dealer,
  onClose,
  onContact,
  onCompare,
  onFavorite,
  favoriteActive,
  vehicles,
  getDealer,
  appActions,
  onNavigate,
  shareUrl,
}) {
  const [currentVehicle, setCurrentVehicle] = useState(vehicle);
  const [showContactGate, setShowContactGate] = useState(false);
  const [shareState, setShareState] = useState("idle");
  const [financingDownPayment, setFinancingDownPayment] = useState("");
  const [financingTermMonths, setFinancingTermMonths] = useState("36");
  const [financingIncome, setFinancingIncome] = useState("");

  const currentDealer = useMemo(() => {
    if (vehicles && getDealer) return getDealer(currentVehicle) || dealer;
    return dealer;
  }, [currentVehicle, vehicles, getDealer, dealer]);

  const currentIndex = vehicles
    ? vehicles.findIndex((v) => v.id === currentVehicle.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (vehicles?.length ?? 0) - 1;

  const permissions = getEffectiveDealerPermissions(currentDealer);
  const isPlatinumDealer = permissions.rankTheme === "platinum";
  const delta = getMarketDelta(currentVehicle);
  const images = useMemo(() => getVehicleImages(currentVehicle), [currentVehicle]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const mainImageRef = useRef(null);
  const dragOriginRef = useRef({ x: 0, y: 0, position: { x: 0, y: 0 } });
  const imageWasDraggedRef = useRef(false);
  const selectedImage = images[selectedImageIndex];
  const reserved = isVehicleReserved(currentVehicle);
  const currentFavoriteActive = appActions
    ? appActions.isFavorite?.(currentVehicle.id)
    : favoriteActive;
  const maintenanceInfo = useMemo(
    () => getVehicleMaintenanceInfo(currentVehicle),
    [currentVehicle]
  );
  const usedFinancingResult = useMemo(
    () =>
      calculateUsedVehicleFinancing({
        price: currentVehicle.price,
        downPayment: financingDownPayment || currentVehicle.delivery || "",
        termMonths: financingTermMonths || currentVehicle.months || "36",
        monthlyIncome: financingIncome,
      }),
    [
      currentVehicle.price,
      currentVehicle.delivery,
      currentVehicle.months,
      financingDownPayment,
      financingTermMonths,
      financingIncome,
    ]
  );

  function goTo(index) {
    if (!vehicles || index < 0 || index >= vehicles.length) return;
    setCurrentVehicle(vehicles[index]);
    setSelectedImageIndex(0);
    resetImageZoom();
    setShowContactGate(false);
  }

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
    setFinancingDownPayment(currentVehicle?.delivery ? String(currentVehicle.delivery) : "");
    setFinancingTermMonths(currentVehicle?.months ? String(currentVehicle.months) : "36");
    setFinancingIncome("");
  }, [currentVehicle?.id, currentVehicle?.vehicle_id, images[0]?.url]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "ArrowLeft") goTo(currentIndex - 1);
      if (event.key === "ArrowRight") goTo(currentIndex + 1);
      if (event.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, hasPrev, hasNext]);

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

  function getVehicleShareUrl() {
    return currentVehicle?.id
      ? `${window.location.origin}/vehiculo/${encodeURIComponent(currentVehicle.id)}`
      : window.location.href;
  }

  function getVehicleShareTitle() {
    const brand = currentVehicle.brand || "";
    const model = currentVehicle.model || "";
    const year = currentVehicle.year ? ` ${currentVehicle.year}` : "";
    const title = `${brand} ${model}${year}`.trim();
    const price = formatARS(currentVehicle.price);

    return [title, price && price !== "Consultar" ? price : ""]
      .filter(Boolean)
      .join(" — ");
  }

  function handleShareWhatsApp() {
    const vehicleShareUrl = shareUrl || getVehicleShareUrl();
    const vehicleShareTitle = getVehicleShareTitle();
    const whatsappMessage = [
      "Mirá esta unidad en oX NEXMOV.",
      "",
      vehicleShareTitle,
      vehicleShareUrl,
    ]
      .filter(Boolean)
      .join("\n");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopyShareLink() {
    const vehicleShareUrl = shareUrl || getVehicleShareUrl();

    try {
      await navigator.clipboard.writeText(vehicleShareUrl);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2200);
    } catch {
      // clipboard unavailable
    }
  }

  const modal = (
    <div className="modal-backdrop vehicle-detail-backdrop">
      <section className={`vehicle-detail-modal vehicle-detail-modal--${permissions.rankTheme}`}>
        <button
          type="button"
          className="modal-close-btn vehicle-detail-close"
          onClick={handleClose}
          aria-label="Cerrar detalle"
        >
          ×
        </button>

        {vehicles && vehicles.length > 1 && (
          <div className="vehicle-detail-nav">
            <button
              type="button"
              className="vehicle-detail-nav-btn"
              disabled={!hasPrev}
              onClick={() => goTo(currentIndex - 1)}
              aria-label="Vehículo anterior"
            >
              ←
            </button>
            <span className="vehicle-detail-nav-counter">
              {currentIndex + 1} / {vehicles.length}
            </span>
            <button
              type="button"
              className="vehicle-detail-nav-btn"
              disabled={!hasNext}
              onClick={() => goTo(currentIndex + 1)}
              aria-label="Siguiente vehículo"
            >
              →
            </button>
          </div>
        )}

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
                  <VehicleImage
                    src={selectedImage.url}
                    alt={`${currentVehicle.brand} ${currentVehicle.model}`}
                    draggable={false}
                    style={{
                      transform: `translate3d(${zoomPosition.x}px, ${zoomPosition.y}px, 0) scale(${zoomScale})`,
                    }}
                  />
                ) : (
                  <span>
                    {currentVehicle.brand} {currentVehicle.model}
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

            <div className="vehicle-detail-quick-specs">
              <div>
                <span>Año</span>
                <strong>{currentVehicle.year}</strong>
              </div>
              <div>
                <span>Kilómetros</span>
                <strong>{formatKm(currentVehicle.kilometers)}</strong>
              </div>
              {currentVehicle.fuelType && (
                <div>
                  <span>Combustible</span>
                  <strong>{currentVehicle.fuelType}</strong>
                </div>
              )}
              {currentVehicle.transmission && (
                <div>
                  <span>Transmisión</span>
                  <strong>{currentVehicle.transmission}</strong>
                </div>
              )}
              {currentVehicle.bodyType && (
                <div>
                  <span>Carrocería</span>
                  <strong>{currentVehicle.bodyType}</strong>
                </div>
              )}
              <div>
                <span>Ubicación</span>
                <strong>{currentVehicle.city}, {currentVehicle.province}</strong>
              </div>
            </div>

            {maintenanceInfo.shouldShow && (
              <div className="vehicle-detail-maintenance-block">
                <div className="vehicle-detail-maintenance-head">
                  <span>Mantenimiento orientativo</span>
                  <strong>Datos declarados por el vendedor</strong>
                </div>

                <div className="vehicle-detail-maintenance-grid">
                  {maintenanceInfo.rows.map((row) => (
                    <div key={`${row.label}-${row.value}`}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>

                <p className="vehicle-detail-maintenance-note">
                  Información orientativa declarada por el vendedor. Los valores
                  pueden variar según uso, ubicación, proveedor, cobertura,
                  precios vigentes y condiciones particulares. oX NEXMOV no
                  calcula, verifica ni garantiza estos importes.
                </p>
              </div>
            )}

            <div className="detail-published-by">
              <div className="detail-published-by-header">
                <span className="detail-published-by-label">Publicado por</span>
                <span className={`admin-chip rank-${permissions.rankTheme}`}>
                  {permissions.rankLabel}
                </span>
              </div>
              <strong className="detail-published-by-name">
                {currentDealer.commercialName}
              </strong>
              <p className="detail-published-by-location">
                {currentDealer.city}, {currentDealer.province}
              </p>
              <p className="detail-published-by-trust">
                Concesionaria verificada dentro de oX NEXMOV.
              </p>
              {onNavigate &&
                currentDealer.id &&
                currentDealer.id !== "dealer-fallback" &&
                currentDealer.id !== "dealer-snapshot" && (
                  <button
                    type="button"
                    className="dealer-profile-link-btn"
                    onClick={() =>
                      onNavigate("dealerProfile", {
                        dealerId: currentDealer.id,
                      })
                    }
                  >
                    Ver más de este dealer →
                  </button>
                )}
            </div>

            {currentVehicle.details && (
              <div className="detail-vehicle-description">
                <span>Descripción del vehículo</span>
                <p>{currentVehicle.details}</p>
              </div>
            )}
          </div>

          <div className="vehicle-detail-info">
            <div className="vehicle-detail-title-card">
              <p className="eyebrow">Detalle del vehículo</p>
              <h2>
                {currentVehicle.brand} {currentVehicle.model}
              </h2>
              <p>
                {currentVehicle.version} · {currentVehicle.year} ·{" "}
                {formatKm(currentVehicle.kilometers)}
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

            <strong className="detail-price">{formatARS(currentVehicle.price)}</strong>

            {delta && (
              <div className="detail-market-box">
                <span>Referencia de mercado</span>
                <strong>{formatARS(currentVehicle.marketReferencePrice)}</strong>
                <p>
                  {delta.isBelowMarket
                    ? `${delta.percent.toFixed(1)}% debajo de la referencia cargada`
                    : `${Math.abs(delta.percent).toFixed(1)}% por encima de la referencia cargada`}
                </p>
              </div>
            )}

            <div className="vehicle-detail-used-financing">
              <div className="vehicle-detail-used-financing-head">
                <div>
                  <span>Simulación orientativa</span>
                  <strong>Cuota estimada para este usado</strong>
                </div>
                <p>{formatARS(currentVehicle.price)}</p>
              </div>

              <div className="vehicle-detail-used-financing-inputs">
                <label>
                  Entrega
                  <input
                    type="number"
                    min="0"
                    value={financingDownPayment}
                    onChange={(event) => setFinancingDownPayment(event.target.value)}
                    placeholder="Ej: 5000000"
                  />
                </label>

                <label>
                  Plazo
                  <select
                    value={financingTermMonths}
                    onChange={(event) => setFinancingTermMonths(event.target.value)}
                  >
                    <option value="12">12 meses</option>
                    <option value="24">24 meses</option>
                    <option value="36">36 meses</option>
                    <option value="48">48 meses</option>
                    <option value="60">60 meses</option>
                    <option value="72">72 meses</option>
                  </select>
                </label>

                <label>
                  Ingreso mensual
                  <input
                    type="number"
                    min="0"
                    value={financingIncome}
                    onChange={(event) => setFinancingIncome(event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <div className="vehicle-detail-used-financing-results" aria-live="polite">
                <div>
                  <span>Cuota estimada</span>
                  <strong>
                    {usedFinancingResult
                      ? formatARS(usedFinancingResult.monthlyPayment)
                      : "$ —"}
                  </strong>
                </div>
                <div>
                  <span>Monto financiado</span>
                  <strong>
                    {usedFinancingResult
                      ? formatARS(usedFinancingResult.financed)
                      : "$ —"}
                  </strong>
                </div>
                <div>
                  <span>% ingreso</span>
                  <strong>
                    {usedFinancingResult?.incomePercent != null
                      ? `${usedFinancingResult.incomePercent}%`
                      : "—"}
                  </strong>
                </div>
              </div>

              <p>
                Referencia no vinculante. La aprobación, tasa, gastos y condiciones
                finales dependen del proveedor, dealer y análisis crediticio.
              </p>
            </div>

            <div className="detail-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => {
                  if (reserved) return;
                  if (appActions) {
                    setShowContactGate(true);
                  } else {
                    onContact?.();
                  }
                }}
                disabled={reserved}
                title={
                  reserved
                    ? "Esta unidad está reservada por el dealer."
                    : "Contactar dealer"
                }
              >
                {reserved ? "Unidad reservada" : "Contactar dealer"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (appActions) appActions.addToCompare?.(currentVehicle);
                  else onCompare?.();
                }}
              >
                Agregar a comparar
              </button>

              <button
                type="button"
                className={currentFavoriteActive ? "favorite-active" : ""}
                onClick={() => {
                  if (appActions) appActions.toggleFavorite?.(currentVehicle);
                  else onFavorite?.();
                }}
              >
                {currentFavoriteActive ? "Guardado" : "Guardar favorito"}
              </button>

              <button
                type="button"
                className={`vehicle-share-btn${shareState === "copied" ? " vehicle-share-btn--copied" : ""}`}
                onClick={handleShareWhatsApp}
                aria-label="Compartir este vehiculo por WhatsApp"
              >
                Compartir por WhatsApp
              </button>

              <button
                type="button"
                className={`vehicle-share-btn${shareState === "copied" ? " vehicle-share-btn--copied" : ""}`}
                onClick={handleCopyShareLink}
                aria-label="Copiar enlace de este vehiculo"
              >
                {shareState === "copied" ? "¡Copiado!" : "Copiar enlace"}
              </button>
            </div>

            {currentVehicle.hasFinancing && (currentVehicle.delivery > 0 || currentVehicle.months > 0 || currentVehicle.rate > 0) && (
              <div className="vehicle-detail-financing-details">
                <p className="vehicle-detail-financing-label">Condiciones de financiación</p>
                {currentVehicle.delivery > 0 && (
                  <div>
                    <span>Entrega</span>
                    <strong>{formatARS(currentVehicle.delivery)}</strong>
                  </div>
                )}
                {currentVehicle.months > 0 && (
                  <div>
                    <span>Cuotas</span>
                    <strong>{currentVehicle.months} meses</strong>
                  </div>
                )}
                {currentVehicle.rate > 0 && (
                  <div>
                    <span>Tasa</span>
                    <strong>{currentVehicle.rate}%</strong>
                  </div>
                )}
              </div>
            )}

            {currentVehicle.hasFinancing && (
              <p className="finance-legal-note">
                Los valores de financiación son informativos y pueden variar
                según aprobación crediticia, entidad financiera, condiciones del
                dealer y fecha de operación.
              </p>
            )}

          </div>

          <div className="vehicle-detail-footer">
            <p className="detail-footer-insurance">
              Seguro del vehículo: próximamente.
            </p>

            <p className="vehicle-detail-legal-note">
              La información de esta publicación fue declarada por el dealer
              anunciante. Verificá disponibilidad, precio final, documentación
              y condiciones antes de avanzar. oX NEXMOV no certifica el estado
              mecánico ni garantiza la operación comercial.
            </p>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <>
      {createPortal(modal, document.body)}
      {showContactGate && appActions && !reserved && createPortal(
        <ContactGate
          vehicle={currentVehicle}
          dealer={currentDealer}
          authUser={appActions.authUser}
          authProfile={appActions.authProfile}
          onClose={() => setShowContactGate(false)}
          onRequireLogin={() => {
            setShowContactGate(false);
            handleClose();
            onNavigate?.("login");
          }}
          onNavigate={onNavigate}
          onLeadCreated={() => setShowContactGate(false)}
        />,
        document.body
      )}
    </>
  );
}
