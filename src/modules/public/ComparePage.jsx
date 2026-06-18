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

function MarketScoreRow({ market }) {
  if (!market) {
    return (
      <div className="compare-spec-row compare-market-score compare-market-score--none">
        <span className="compare-spec-label">vs. mercado</span>
        <strong className="compare-spec-value">Sin referencia</strong>
      </div>
    );
  }
  const pct = Math.abs(market.percent).toFixed(1);
  const tone = market.isBelowMarket ? "below" : "above";
  const label = market.isBelowMarket ? `↓ ${pct}% bajo` : `↑ ${pct}% sobre`;
  return (
    <div className={`compare-spec-row compare-market-score compare-market-score--${tone}`}>
      <span className="compare-spec-label">vs. mercado</span>
      <strong className="compare-spec-value">{label}</strong>
    </div>
  );
}

function computeBarData(vehicles) {
  const getWidths = (values, lowerIsBetter) => {
    const valid = values.filter((v) => v > 0);
    if (valid.length === 0) return values.map(() => 0);
    const best = lowerIsBetter ? Math.min(...valid) : Math.max(...valid);
    return values.map((v) => {
      if (!v) return 0;
      return Math.round(Math.max(18, (lowerIsBetter ? best / v : v / best) * 100));
    });
  };
  const getWinner = (values, lowerIsBetter) => {
    const valid = values.filter((v) => v > 0);
    if (valid.length < 2) return -1;
    const best = lowerIsBetter ? Math.min(...valid) : Math.max(...valid);
    const idx = values.indexOf(best);
    return values.filter((v) => v === best).length === 1 ? idx : -1;
  };

  const prices = vehicles.map((v) => v.price || 0);
  const kms = vehicles.map((v) => v.kilometers || v.km || v.raw?.km || 0);
  const years = vehicles.map((v) => parseInt(v.year || v.raw?.year || 0, 10));

  const priceW = getWidths(prices, true);
  const kmW = getWidths(kms, true);
  const yearW = getWidths(years, false);
  const priceWin = getWinner(prices, true);
  const kmWin = getWinner(kms, true);
  const yearWin = getWinner(years, false);

  return vehicles.map((_, i) => ({
    priceBar: priceW[i],
    kmBar: kmW[i],
    yearBar: yearW[i],
    isPriceBest: i === priceWin,
    isKmBest: i === kmWin,
    isYearBest: i === yearWin,
  }));
}

function BarSpecRow({ label, value, barWidth, isWinner }) {
  if (!value && value !== 0) return null;
  return (
    <div className={`compare-spec-row compare-bar-row is-highlight${isWinner ? " is-winner" : ""}`}>
      <span className="compare-spec-label">{label}</span>
      <div className="compare-bar-track">
        <div className="compare-bar-fill" style={{ "--bar-w": `${barWidth ?? 50}%` }} />
      </div>
      <strong className="compare-spec-value">{value}</strong>
    </div>
  );
}

function CompareCard({ vehicle, onOpenDetail, onRemove, isBestDeal, bars }) {
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
        className="compare-card-quit"
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

        <div className="compare-card-price-block">
          <strong className="compare-card-price">{formatARS(vehicle.price)}</strong>
          {isBestDeal && (
            <span className="compare-best-deal-badge">Mejor precio</span>
          )}
        </div>

        {market && market.reference > 0 && (
          <div className="compare-market-ref">
            <span>Ref. mercado: {formatARS(market.reference)}</span>
          </div>
        )}

        <div className="compare-spec-list">
          <MarketScoreRow market={market} />
          <BarSpecRow label="Año" value={vehicle.year || vehicle.raw?.year} barWidth={bars?.yearBar} isWinner={bars?.isYearBest} />
          <BarSpecRow label="Km" value={km != null ? formatKm(km) : null} barWidth={bars?.kmBar} isWinner={bars?.isKmBest} />
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
  const barData = vehicles.length >= 2 ? computeBarData(vehicles) : null;

  // Vehículo con mejor posición relativa al mercado (mayor % por debajo)
  const bestDealId = vehicles.length >= 2
    ? vehicles.reduce((best, v) => {
        const delta = getMarketDelta(v);
        if (!delta?.isBelowMarket) return best;
        if (!best) return v;
        const bestDelta = getMarketDelta(best);
        return delta.percent > (bestDelta?.percent ?? -Infinity) ? v : best;
      }, null)?.id ?? null
    : null;

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
                  isBestDeal={bestDealId !== null && vehicle.id === bestDealId}
                  bars={barData?.[index] ?? null}
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
