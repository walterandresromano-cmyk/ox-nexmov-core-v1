import { useState } from "react";
import VehicleDetailModal from "./cards/VehicleDetailModal.jsx";

function formatARS(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Consultar";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatKm(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("es-AR")} km`;
}

function getVehicleImage(vehicle) {
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

function getDealerName(vehicle) {
  return (
    vehicle?.dealer?.commercialName ||
    vehicle?.dealer_name ||
    vehicle?.raw?.dealer_name ||
    "Dealer no informado"
  );
}

function getDealerForVehicle(vehicle) {
  return (
    vehicle?.dealer || {
      id: vehicle?.dealerId || vehicle?.dealer_id || "dealer-fallback",
      commercialName: getDealerName(vehicle),
      plan: "inicio",
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

function getMarketDelta(vehicle) {
  const price = Number(vehicle?.price || 0);
  const reference = Number(
    vehicle?.marketReferencePrice ||
      vehicle?.market_reference_price ||
      vehicle?.raw?.market_reference_price ||
      vehicle?.raw?.avg ||
      0
  );

  if (!price || !reference) return null;

  const delta = ((price - reference) / reference) * 100;

  return {
    reference,
    percent: delta,
    isBelowMarket: delta < 0,
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

function SpecRow({ label, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: "10px",
        padding: "10px 0",
        borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
      }}
    >
      <span
        style={{
          color: "var(--ox-muted)",
          fontSize: "0.76rem",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "var(--ox-text)",
          textAlign: "right",
          fontSize: "0.9rem",
          lineHeight: 1.35,
        }}
      >
        {children || "—"}
      </strong>
    </div>
  );
}

function CompareVehicleCard({ vehicle, onRemove, onOpenDetail }) {
  const imageUrl = getVehicleImage(vehicle);
  const market = getMarketDelta(vehicle);

  return (
    <article
      style={{
        minWidth: 0,
        border: "1px solid rgba(148, 163, 184, 0.16)",
        borderRadius: "24px",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(2, 6, 23, 0.94))",
        boxShadow:
          "0 18px 60px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,.035)",
      }}
    >
      <div
        style={{
          height: "190px",
          background:
            "radial-gradient(circle at 30% 10%, rgba(56, 189, 248, 0.16), transparent 36%), linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98))",
          borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${vehicle.brand} ${vehicle.model}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <strong style={{ color: "var(--ox-muted)" }}>
            {vehicle.brand} {vehicle.model}
          </strong>
        )}
      </div>

      <div style={{ padding: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              {getDealerName(vehicle)}
            </p>

            <h3
              style={{
                margin: "8px 0 4px",
                fontSize: "1.25rem",
                lineHeight: 1.05,
              }}
            >
              {vehicle.brand} {vehicle.model}
            </h3>

            <p
              style={{
                margin: 0,
                color: "var(--ox-muted)",
                lineHeight: 1.4,
              }}
            >
              {vehicle.version || "Sin versión"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRemove(vehicle.id)}
            title="Quitar de comparación"
            style={{
              width: "34px",
              height: "34px",
              flexShrink: 0,
              border: "1px solid var(--ox-border)",
              borderRadius: "999px",
              background: "var(--ox-card-2)",
              color: "var(--ox-text)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <strong
          style={{
            display: "block",
            color: "var(--ox-cyan)",
            fontSize: "1.65rem",
            lineHeight: 1,
            marginBottom: "14px",
          }}
        >
          {formatARS(vehicle.price)}
        </strong>

        {market && (
          <div
            style={{
              border: "1px solid rgba(56, 189, 248, 0.18)",
              background: "rgba(56, 189, 248, 0.07)",
              borderRadius: "16px",
              padding: "12px",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                display: "block",
                color: "var(--ox-muted)",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "5px",
              }}
            >
              Lectura de mercado
            </span>

            <strong
              style={{
                color: market.isBelowMarket ? "#86efac" : "#fdba74",
              }}
            >
              {market.isBelowMarket
                ? `${Math.abs(market.percent).toFixed(1)}% debajo de referencia`
                : `${market.percent.toFixed(1)}% arriba de referencia`}
            </strong>

            <p style={{ margin: "6px 0 0", color: "var(--ox-muted)" }}>
              Ref. {formatARS(market.reference)}
            </p>
          </div>
        )}

        <SpecRow label="Año">{vehicle.year || "—"}</SpecRow>
        <SpecRow label="Km">{formatKm(vehicle.kilometers || vehicle.km)}</SpecRow>
        <SpecRow label="Ubicación">
          {vehicle.city || "Sin ciudad"}
          {vehicle.province ? `, ${vehicle.province}` : ""}
        </SpecRow>
        <SpecRow label="Estado">{getVehicleStatus(vehicle)}</SpecRow>
        <SpecRow label="Combustible">
          {vehicle.fuelType || vehicle.fuel_type || vehicle.raw?.fuel_type || "—"}
        </SpecRow>
        <SpecRow label="Transmisión">
          {vehicle.transmission || vehicle.raw?.transmission || "—"}
        </SpecRow>
        <SpecRow label="Carrocería">
          {vehicle.bodyType || vehicle.body_type || vehicle.raw?.body_type || "—"}
        </SpecRow>
        <SpecRow label="Financia">
          {vehicle.hasFinancing || vehicle.financing || vehicle.raw?.financing
            ? "Sí"
            : "No informada"}
        </SpecRow>
        <SpecRow label="Entrega">
          {vehicle.delivery || vehicle.raw?.delivery
            ? formatARS(vehicle.delivery || vehicle.raw?.delivery)
            : "—"}
        </SpecRow>
        <SpecRow label="Cuotas">
          {vehicle.months || vehicle.raw?.months
            ? `${vehicle.months || vehicle.raw?.months} meses`
            : "—"}
        </SpecRow>
        <SpecRow label="Tasa">
          {vehicle.rate || vehicle.raw?.rate
            ? `${vehicle.rate || vehicle.raw?.rate}%`
            : "—"}
        </SpecRow>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          <button
            type="button"
            className="primary-action"
            onClick={() => onOpenDetail(vehicle)}
            style={{ width: "100%" }}
          >
            Ver detalle
          </button>

          <button
            type="button"
            onClick={() => onRemove(vehicle.id)}
            style={{
              border: "1px solid var(--ox-border)",
              background: "var(--ox-card-2)",
              color: "var(--ox-text)",
              borderRadius: "14px",
              padding: "12px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Quitar
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CompareTray({ appActions, onNavigate }) {
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState(null);

  const compareItems = appActions?.compareItems || [];
  const removeFromCompare = appActions?.removeFromCompare || (() => {});
  const clearCompare = appActions?.clearCompare || (() => {});
  const addToCompare = appActions?.addToCompare || (() => {});
  const toggleFavorite = appActions?.toggleFavorite || (() => {});
  const isFavorite = appActions?.isFavorite || (() => false);

  if (!compareItems.length) return null;

  const canOpenComparison = compareItems.length >= 2;
  const selectedDealer = selectedDetailVehicle
    ? getDealerForVehicle(selectedDetailVehicle)
    : null;

  return (
    <>
      <aside className="compare-tray">
        <div className="compare-tray-head">
          <div>
            <strong>Comparador</strong>
            <span>{compareItems.length} / 4 vehículos</span>
          </div>

          <button type="button" onClick={clearCompare}>
            Limpiar
          </button>
        </div>

        <div className="compare-tray-list">
          {compareItems.map((vehicle) => (
            <div className="compare-tray-item" key={vehicle.id}>
              <span>
                {vehicle.brand} {vehicle.model}
              </span>

              <button
                type="button"
                onClick={() => removeFromCompare(vehicle.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {canOpenComparison ? (
          <button
            type="button"
            className="compare-open-btn"
            onClick={() => setShowCompareModal(true)}
          >
            Abrir comparación completa
          </button>
        ) : (
          <button
            type="button"
            className="compare-open-btn"
            onClick={() => onNavigate?.("search")}
          >
            Agregá otro vehículo para comparar
          </button>
        )}
      </aside>

      {showCompareModal && (
        <div className="modal-backdrop">
          <section
            style={{
              width: "min(1240px, calc(100vw - 32px))",
              maxHeight: "min(860px, calc(100vh - 32px))",
              overflow: "auto",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: "28px",
              background:
                "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))",
              boxShadow:
                "0 30px 90px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255,255,255,.04)",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "18px",
                marginBottom: "22px",
              }}
            >
              <div>
                <p className="eyebrow">Comparación inteligente</p>
                <h2
                  style={{
                    margin: "8px 0 6px",
                    fontSize: "clamp(1.7rem, 4vw, 2.7rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.055em",
                  }}
                >
                  Compará opciones con lectura real.
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--ox-muted)",
                    maxWidth: "760px",
                    lineHeight: 1.55,
                  }}
                >
                  Revisá precio, referencia de mercado, kilometraje,
                  financiación, ubicación y datos técnicos antes de contactar.
                </p>
              </div>

              <div className="admin-action-row">
                <button
                  type="button"
                  className="admin-refresh-btn"
                  onClick={() => {
                    setShowCompareModal(false);
                    onNavigate?.("search");
                  }}
                >
                  Seguir buscando
                </button>

                <button
                  type="button"
                  className="admin-refresh-btn"
                  onClick={clearCompare}
                >
                  Limpiar comparación
                </button>

                <button
                  type="button"
                  className="admin-refresh-btn"
                  onClick={() => setShowCompareModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(
                  compareItems.length,
                  4
                )}, minmax(260px, 1fr))`,
                gap: "16px",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
              {compareItems.slice(0, 4).map((vehicle) => (
                <CompareVehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onRemove={removeFromCompare}
                  onOpenDetail={setSelectedDetailVehicle}
                />
              ))}
            </div>
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