import { lazy, Suspense, useRef, useState } from "react";

import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import { quickEstimate } from "../../lib/financing.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import {
  getVehicleImageUrl,
  getVehicleTitle,
  getLocationLabel,
  isVehicleReserved,
} from "../../lib/vehicle.js";
const ContactGate       = lazy(() => import("../../modules/public/ContactGate.jsx"));
const VehicleDetailModal = lazy(() => import("./VehicleDetailModal.jsx"));
import { registerVehicleDetailView } from "../../services/vehicleViews.service.js";
import { SpeedometerIcon, PriceTagIcon, HeartIcon, CompareIcon, EyeIcon, ChatIcon } from "../icons/VehicleIcons.jsx";
import VehicleImage from "../VehicleImage.jsx";
import { useDominantColor } from "../../hooks/useDominantColor.js";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";

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

  // Only show when meaningfully below market (3%+ difference)
  if (absolutePercent < 3) return null;
  // Differences over 100% indicate stale reference data (common in AR inflation context)
  if (absolutePercent > 100) return null;
  // Don't show "above market" — it discourages buyers
  if (!delta.isBelowMarket) return null;

  return {
    tone: "below",
    text: `${Math.round(absolutePercent)}% bajo el mercado`,
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

  const cardRef = useRef(null);
  const rafRef = useRef(null);
  const revealRef = useScrollReveal();

  function handleCardMouseMove(e) {
    const card = cardRef.current;
    if (!card) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = (e.clientX - left) / width  - 0.5;  // -0.5 a 0.5
      const y = (e.clientY - top)  / height - 0.5;
      const rotX = -(y * 10).toFixed(2);
      const rotY =  (x * 10).toFixed(2);
      const glareX = (x * 100 + 50).toFixed(1);
      const glareY = (y * 100 + 50).toFixed(1);
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`;
      card.style.setProperty("--glare-x", `${glareX}%`);
      card.style.setProperty("--glare-y", `${glareY}%`);
      card.style.setProperty("--glare-opacity", "1");
    });
  }

  function handleCardMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    card.style.transform = "";
    card.style.setProperty("--glare-opacity", "0");
  }

  const safeDealer = dealer || fallbackDealer;
  const permissions = getEffectiveDealerPermissions(safeDealer);
  const rankClass = getRankClass(permissions.rankTheme);
  const delta = getMarketDelta(vehicle);
  const marketBadge = getMarketBadge(delta);
  const favoriteActive = appActions?.isFavorite?.(vehicle.id);
  const reserved = isVehicleReserved(vehicle);
  const imageUrl = getVehicleImageUrl(vehicle);
  const dominantColor = useDominantColor(imageUrl);
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
        ref={(el) => { cardRef.current = el; revealRef.current = el; }}
        className={`vehicle-card vehicle-card--${rankClass} dealer-rank-${permissions.rankTheme} ${
          reserved ? "vehicle-card-reserved" : ""
        } vehicle-card--tilt ox-reveal`}
        onMouseMove={handleCardMouseMove}
        onMouseLeave={handleCardMouseLeave}
        style={dominantColor ? {
          "--amb-r": dominantColor.r,
          "--amb-g": dominantColor.g,
          "--amb-b": dominantColor.b,
        } : undefined}
      >
        <div className="vehicle-card__glare" aria-hidden="true" />
        <div className="vehicle-card__media">
          <div className="vehicle-card__topbar">
            <span className="vehicle-card__rank">
              {permissions.rankLabel}
            </span>

            {safeDealer.isFounder && (
              <span className="founder-badge founder-badge--card">Fundadora</span>
            )}

            <span className="vehicle-card__year">
              {vehicle.year || "Año a confirmar"}
            </span>
          </div>

          {reserved && (
            <div className="vehicle-card__reserved">Unidad reservada</div>
          )}

          {imageUrl ? (
            <VehicleImage
              src={imageUrl}
              alt={vehicleTitle}
              size="card"
              className="vehicle-card__image"
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

          {(vehicle.views > 0 || vehicle.leads_count > 0) && (
            <div className="vehicle-card__counters" aria-label="Estadísticas de la publicación">
              {vehicle.views > 0 && (
                <span className="vehicle-card__counter">
                  <EyeIcon size={12} />
                  {vehicle.views.toLocaleString("es-AR")}
                </span>
              )}
              {vehicle.leads_count > 0 && (
                <span className="vehicle-card__counter">
                  <ChatIcon size={12} />
                  {vehicle.leads_count}
                </span>
              )}
            </div>
          )}

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

          {vehicle.contraoferta_habilitada && (
            <div className="vehicle-card__contraoferta-badge">
              Acepta contraoferta
            </div>
          )}

          <div className="vehicle-card__price-box">
            <div className="vehicle-card__price-copy">
              <span className="vehicle-card__price-label">Precio</span>
              <strong className="vehicle-card__price">
                {formatARS(vehicle.price)}
              </strong>
              {(() => {
                const est = quickEstimate(vehicle.price);
                return est ? (
                  <span className="vehicle-card__monthly-hint">
                    desde {formatARS(Math.round(est.monthly))}/mes
                  </span>
                ) : null;
              })()}
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
                  onNavigate("vehicleDetail", { vehicleId: vehicle.id });
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
                favoriteActive
                  ? "vehicle-card__btn vehicle-card__btn--icon vehicle-card__btn--favorite is-active"
                  : "vehicle-card__btn vehicle-card__btn--icon vehicle-card__btn--favorite"
              }
              onClick={() => appActions?.toggleFavorite?.(vehicle)}
              title={favoriteActive ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <HeartIcon size={15} filled={favoriteActive} />
            </button>

            <button
              type="button"
              className="vehicle-card__btn vehicle-card__btn--icon"
              onClick={() => appActions?.addToCompare?.(vehicle)}
              title="Comparar"
            >
              <CompareIcon size={15} />
            </button>
          </div>

          <button
            type="button"
            className={
              reserved
                ? "vehicle-card__btn vehicle-card__btn--contact vehicle-card__btn--disabled"
                : "vehicle-card__btn vehicle-card__btn--contact"
            }
            disabled={reserved}
            onClick={() => setShowContactGate(true)}
            title={reserved ? "Esta unidad está reservada por el dealer." : "Contactar dealer"}
          >
            {reserved ? "Reservado" : "Contactar dealer"}
          </button>
        </div>
      </article>

      <Suspense fallback={null}>
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
      </Suspense>
    </>
  );
}
