import { useEffect, useState } from "react";

import { getPublicVehicleById } from "../../services/vehicles.service.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import { getDealerForVehicle, getDealerName } from "../../lib/dealer.js";
import {
  getVehicleTitle,
  getVehicleImages,
  getLocationLabel,
  getVehicleStatus,
  getVehicleKey,
} from "../../lib/vehicle.js";
import { formatARS, formatKm, getMarketDelta } from "../../lib/formatters.js";
import VehicleDetailModal from "../../components/cards/VehicleDetailModal.jsx";
import ContactGate from "./ContactGate.jsx";
import { registerVehicleDetailView } from "../../services/vehicleViews.service.js";

const COMPARE_STORAGE_KEY = "ox-nexmov-compare";

function getDealerRank(vehicle) {
  const perms = getEffectiveDealerPermissions(getDealerForVehicle(vehicle));
  return { label: perms.rankLabel, theme: perms.rankTheme };
}

function SpecRow({ label, value, highlight = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className={`compare-spec-row${highlight ? " is-highlight" : ""}`}>
      <span className="compare-spec-label">{label}</span>
      <strong className="compare-spec-value">{value}</strong>
    </div>
  );
}

function CompareCard({ vehicle, onOpenDetail, onRemove }) {
  const images = getVehicleImages(vehicle);
  const imageUrl = images[0]?.url || "";
  const title = getVehicleTitle(vehicle);
  const market = getMarketDelta(vehicle);
  const rank = getDealerRank(vehicle);
  const km = vehicle.kilometers || vehicle.km || vehicle.raw?.km;
  const hasFinancing = vehicle.hasFinancing || vehicle.financing || vehicle.raw?.financing;

  return (
    <article className={`compare-card dealer-rank-${rank.theme}`}>
      <button
        type="button"
        className="compare-card-remove"
        style={{ top: 12, right: 12, left: "auto" }}
        onClick={() => onRemove(vehicle.id)}
        aria-label={`Quitar ${title}`}
        title="Quitar vehículo de la comparación"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="compare-card-media">
        {imageUrl ? (
          <img
            className="compare-card-image"
            src={imageUrl}
            alt={title}
            loading="lazy"
          />
        ) : (
          <div className="compare-card-placeholder">
            <span>Imagen no disponible</span>
            <strong>{title}</strong>
          </div>
        )}
      </div>

      <div className="compare-card-body">
        <div className="compare-card-dealer">
          <span className={`admin-chip rank-${rank.theme}`}>{rank.label}</span>
          <p>{getDealerName(vehicle)}</p>
        </div>

        <div>
          <h2 className="compare-card-title">{title}</h2>
          <p className="compare-card-version">
            {vehicle.version || vehicle.raw?.version || "Versión no informada"}
          </p>
        </div>

        <strong className="compare-card-price">{formatARS(vehicle.price)}</strong>

        {market && market.isBelowMarket && (
          <div className="compare-market is-below">
            <span>Referencia de mercado</span>
            <strong>{Math.abs(market.percent).toFixed(1)}% bajo el mercado</strong>
            <p>Ref. {formatARS(market.reference)}</p>
          </div>
        )}

        <div className="compare-spec-list">
          <SpecRow label="Año" value={vehicle.year || vehicle.raw?.year} highlight />
          <SpecRow label="Km" value={km != null ? formatKm(km) : null} highlight />
          <SpecRow label="Ubicación" value={getLocationLabel(vehicle)} />
          <SpecRow label="Estado" value={getVehicleStatus(vehicle)} />
          <SpecRow label="Financiación" value={hasFinancing ? "Disponible" : "No informada"} highlight />
          {vehicle.delivery ? <SpecRow label="Entrega" value={formatARS(vehicle.delivery)} /> : null}
          {vehicle.months ? <SpecRow label="Cuotas" value={`${vehicle.months} meses`} /> : null}
          {vehicle.rate ? <SpecRow label="Tasa" value={`${vehicle.rate}%`} /> : null}
          <SpecRow label="Combustible" value={vehicle.fuelType || vehicle.raw?.fuel_type} />
          <SpecRow label="Transmisión" value={vehicle.transmission || vehicle.raw?.transmission} />
          <SpecRow label="Carrocería" value={vehicle.bodyType || vehicle.raw?.body_type} />
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

function readSessionItems() {
  try {
    const stored = window.sessionStorage.getItem(COMPARE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function ComparePage({ appActions, onNavigate }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareState, setShareState] = useState("idle");
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [contactVehicle, setContactVehicle] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const params = new URLSearchParams(window.location.search);
      const idsParam = params.get("ids");

      if (idsParam) {
        const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
        const results = await Promise.all(ids.map((id) => getPublicVehicleById(id)));
        setVehicles(results.map((r) => r.vehicle).filter(Boolean));
      } else {
        setVehicles(appActions?.compareItems?.length > 0
          ? appActions.compareItems
          : readSessionItems());
      }

      setLoading(false);
    }

    load();
  }, []);

  async function handleCopyLink() {
    const ids = vehicles.map((v) => v.id).join(",");
    const url = `${window.location.origin}/comparar?ids=${ids}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2200);
    } catch {
      // clipboard unavailable
    }
  }

  function handleRemove(vehicleId) {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    appActions?.removeFromCompare?.(vehicleId);
  }

  function handleOpenDetail(vehicle) {
    registerVehicleDetailView(vehicle.id);
    setDetailVehicle(vehicle);
  }

  const countClass = `compare-count-${Math.max(1, Math.min(vehicles.length, 4))}`;
  const shareUrl = vehicles.length
    ? `${window.location.origin}/comparar?ids=${vehicles.map((v) => v.id).join(",")}`
    : "";

  return (
    <>
      <section className="compare-page page-section">
        <div className="container">
          <header className="compare-page-header">
            <div className="compare-page-headerblock">
              <p className="eyebrow">Comparación inteligente</p>
              <h1>Compará opciones con lectura real.</h1>
              <p>
                Precio, referencia de mercado, kilómetros, financiación y datos
                técnicos antes de contactar.
              </p>
            </div>

            <div className="compare-page-header-actions">
              {vehicles.length >= 2 && (
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={handleCopyLink}
                >
                  {shareState === "copied" ? "¡Link copiado!" : "Copiar link"}
                </button>
              )}
              <button
                type="button"
                className="table-action-btn"
                onClick={() => onNavigate?.("search")}
              >
                Seguir buscando
              </button>
              {vehicles.length > 0 && (
                <button
                  type="button"
                  className="inventory-filter-clear"
                  onClick={() => {
                    appActions?.clearCompare?.();
                    onNavigate?.("search");
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </header>

          {loading && (
            <div className="empty-state">Cargando vehículos…</div>
          )}

          {!loading && vehicles.length === 0 && (
            <div className="empty-state">
              <h2>No hay vehículos para comparar.</h2>
              <p>Agregá vehículos desde el buscador y volvé acá.</p>
              <button
                type="button"
                className="primary-action"
                onClick={() => onNavigate?.("search")}
              >
                Ir al buscador
              </button>
            </div>
          )}

          {!loading && vehicles.length > 0 && (
            <div className={`compare-grid compare-page-grid ${countClass}`}>
              {vehicles.map((vehicle, index) => (
                <CompareCard
                  key={getVehicleKey(vehicle, index)}
                  vehicle={vehicle}
                  onOpenDetail={handleOpenDetail}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {!loading && vehicles.length === 1 && (
            <p className="compare-page-hint">
              Agregá otro vehículo desde el buscador para comparar lado a lado.
            </p>
          )}
        </div>
      </section>

      {detailVehicle && (
        <VehicleDetailModal
          vehicle={detailVehicle}
          dealer={getDealerForVehicle(detailVehicle)}
          onClose={() => setDetailVehicle(null)}
          onCompare={() => appActions?.addToCompare?.(detailVehicle)}
          onFavorite={() => appActions?.toggleFavorite?.(detailVehicle)}
          favoriteActive={appActions?.isFavorite?.(detailVehicle.id)}
          onContact={() => {
            setContactVehicle(detailVehicle);
            setDetailVehicle(null);
          }}
          appActions={appActions}
          onNavigate={onNavigate}
          shareUrl={shareUrl}
        />
      )}

      {contactVehicle && (
        <ContactGate
          vehicle={contactVehicle}
          dealer={getDealerForVehicle(contactVehicle)}
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
