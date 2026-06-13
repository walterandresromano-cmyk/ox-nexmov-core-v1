import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import DealerVehicleActions from "./DealerVehicleActions.jsx";
import OxAssistantPanel from "./OxAssistantPanel.jsx";
import { getVehicleAssistantInsights } from "../services/oxAssistant.service.js";
import { buildVehicleSocialCopy, buildVehicleShortSocialCopy } from "../lib/vehicleMarketingCopy.js";
import { generateVehiclePromoCard } from "../lib/vehicleCard.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatARS(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatKm(value) {
  return `${Number(value || 0).toLocaleString("es-AR")} km`;
}

function getPublicationLabel(vehicle) {
  if (vehicle.publication_status === "reserved" || vehicle.reserved) {
    return "Reservada";
  }

  if (vehicle.publication_status === "sold") {
    return "Vendida";
  }

  if (vehicle.publication_status === "paused") {
    return "Pausada";
  }

  if (vehicle.publication_status === "review") {
    return "En revisión";
  }

  if (vehicle.is_active) {
    return "Activa";
  }

  return vehicle.publication_status || "No visible";
}

function getReviewLabel(vehicle) {
  if (vehicle.review_status === "needs_review") {
    return "Necesita revisión";
  }

  return "Aprobada";
}

function getVehicleImages(vehicle) {
  const images = [];

  if (vehicle?.main_image_url) {
    images.push({ url: vehicle.main_image_url, name: "Portada" });
  }

  if (vehicle?.mainImageUrl) {
    images.push({ url: vehicle.mainImageUrl, name: "Portada" });
  }

  if (vehicle?.main_image_url === undefined && vehicle?.mainImageUrl === undefined && vehicle?.imageUrl) {
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

  const rawImages = vehicle?.raw?.images_json || vehicle?.images_json;

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

  if (
    vehicle?.raw?.main_image_url &&
    !images.some((item) => item.url === vehicle.raw.main_image_url)
  ) {
    images.unshift({ url: vehicle.raw.main_image_url, name: "Portada" });
  }

  return images;
}

export default function DealerVehicleDetailModal({
  vehicle,
  dealerName = "",
  permissions,
  onClose,
  onUpdated,
}) {
  const hasKitRedes =
    permissions?.metricsLevel === "advanced" ||
    permissions?.metricsLevel === "full";
  const images = useMemo(() => getVehicleImages(vehicle), [vehicle]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copyKitState, setCopyKitState] = useState("idle");
  const [shareKitState, setShareKitState] = useState("idle");
  const [cardState, setCardState] = useState("idle");
  const [copyVariant, setCopyVariant] = useState("full");
  const selectedImage = images[selectedImageIndex];
  const assistantInsights = getVehicleAssistantInsights(vehicle);

  if (!vehicle) return null;

  const publicUrl =
    typeof window !== "undefined" && vehicle?.vehicle_id
      ? `${window.location.origin}/vehiculo/${encodeURIComponent(vehicle.vehicle_id)}`
      : "";

  const socialCopy = copyVariant === "short"
    ? buildVehicleShortSocialCopy(vehicle, { dealerName, publicUrl })
    : buildVehicleSocialCopy(vehicle, { dealerName, publicUrl });

  async function handleCopyKit() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(socialCopy);
      } else {
        const ta = document.createElement("textarea");
        ta.value = socialCopy;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyKitState("copied");
    } catch {
      setCopyKitState("error");
    }
    setTimeout(() => setCopyKitState("idle"), 2500);
  }

  async function handleShareKit() {
    if (!publicUrl) return;

    const shareTitle = [vehicle.brand, vehicle.model, vehicle.year]
      .filter(Boolean)
      .join(" ");
    const shareText = `${shareTitle}${dealerName ? ` disponible en ${dealerName}` : " disponible"}. Consultá esta unidad en oX NEXMOV.`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: publicUrl });
        // Share completed — the system handled it, no state change needed
      } catch (err) {
        if (err?.name !== "AbortError") {
          setShareKitState("error");
          setTimeout(() => setShareKitState("idle"), 2500);
        }
      }
      return;
    }

    // Fallback: copy public link to clipboard
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = publicUrl;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setShareKitState("linked");
    } catch {
      setShareKitState("error");
    }
    setTimeout(() => setShareKitState("idle"), 2500);
  }

  async function handleDownloadCard() {
    if (cardState === "generating") return;
    setCardState("generating");

    const imageUrl =
      images[0]?.url ||
      vehicle.main_image_url ||
      vehicle.image_url ||
      "";

    try {
      const { dataUrl, filename } = await generateVehiclePromoCard(vehicle, {
        dealerName,
        imageUrl,
        publicUrl,
      });

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.open(dataUrl, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href     = dataUrl;
        a.download = filename;
        a.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setCardState("done");
    } catch {
      setCardState("error");
    }
    setTimeout(() => setCardState("idle"), 2500);
  }

  return createPortal(
    <div className="modal-backdrop">
      <section className="ticket-detail-modal dealer-vehicle-detail-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Detalle de publicación</p>
            <h2>
              {vehicle.brand} {vehicle.model}
            </h2>
            <p>
              Publicación #{vehicle.vehicle_id} · {vehicle.year} ·{" "}
              {vehicle.version || "Sin versión"}
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dealer-vehicle-detail-layout">
          <div className="dealer-vehicle-gallery">
            <div className="detail-main-image">
              {selectedImage?.url ? (
                <img
                  src={selectedImage.url}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              ) : (
                <span>
                  {vehicle.brand} {vehicle.model}
                </span>
              )}

              {vehicle.reserved && (
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
                    <img src={image.url} alt={image.name || `Imagen ${index + 1}`} loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}

            <div className="dealer-vehicle-assistant">
              <OxAssistantPanel
                compact
                showSuggestions={false}
                title="Calidad de publicación"
                subtitle="Diagnóstico automático para mejorar esta unidad."
                insights={assistantInsights}
              />
            </div>
          </div>

          <div className="ticket-detail-grid">
            <article className="ticket-detail-card ticket-detail-main">
              <span>Vehículo</span>
              <strong>
                {vehicle.brand} {vehicle.model}
              </strong>
              <p>{vehicle.version || "Sin versión informada"}</p>
              <p>
                {vehicle.year} · {formatKm(vehicle.km)} ·{" "}
                {vehicle.body_type || "Carrocería no informada"}
              </p>
            </article>

            <article className="ticket-detail-card">
              <span>Precio publicado</span>
              <strong>{formatARS(vehicle.price)}</strong>
              <p>Precio principal visible al comprador.</p>
            </article>

            <article className="ticket-detail-card">
              <span>Referencia de mercado</span>
              <strong>{formatARS(vehicle.market_reference_price)}</strong>
              <p>Dato usado para lectura comparativa.</p>
            </article>

            <article className="ticket-detail-card">
              <span>Ubicación</span>
              <strong>{vehicle.city || "Sin ciudad"}</strong>
              <p>{vehicle.province || "Sin provincia"}</p>
            </article>

            <article className="ticket-detail-card">
              <span>Transmisión</span>
              <strong>{vehicle.transmission || "No informada"}</strong>
              <p>{vehicle.fuel_type || "Combustible no informado"}</p>
            </article>

            <article className="ticket-detail-card">
              <span>Financiación</span>
              <strong>{vehicle.financing ? "Disponible" : "No informada"}</strong>
              <p>
                Entrega: {formatARS(vehicle.delivery)} ·{" "}
                {vehicle.months ? `${vehicle.months} meses` : "Sin plazo"} · Tasa{" "}
                {vehicle.rate || 0}
              </p>
            </article>

            <article className="ticket-detail-card">
              <span>Estado público</span>
              <strong>{getPublicationLabel(vehicle)}</strong>
              <p>
                {vehicle.is_active
                  ? "Visible en búsqueda pública si no está filtrada por estado."
                  : "No visible en búsqueda pública."}
              </p>
            </article>

            <article className="ticket-detail-card">
              <span>Revisión</span>
              <strong>{getReviewLabel(vehicle)}</strong>
              <p>
                {vehicle.review_status === "needs_review"
                  ? "Requiere intervención antes de volver a mostrarse."
                  : "Publicación aprobada para operación normal."}
              </p>
            </article>

            <article className="ticket-detail-card">
              <span>Reserva</span>
              <strong>{vehicle.reserved ? "Reservada" : "No reservada"}</strong>
              <p>
                {vehicle.reserved
                  ? "La card pública muestra aviso y bloquea contacto."
                  : "La unidad puede recibir contacto si está activa."}
              </p>
            </article>

            <article className="ticket-detail-card">
              <span>Fecha de alta</span>
              <strong>{formatDateTime(vehicle.created_at)}</strong>
              <p>Momento en que se creó la publicación.</p>
            </article>

            <article className="ticket-detail-card">
              <span>Última actualización</span>
              <strong>{formatDateTime(vehicle.updated_at)}</strong>
              <p>Último cambio operativo registrado.</p>
            </article>

            <article className="ticket-detail-card ticket-detail-main">
              <span>Detalles / aclaraciones</span>
              <p>
                {vehicle.details ||
                  "Todavía no hay detalles adicionales cargados para esta publicación."}
              </p>
            </article>

            <article className="ticket-detail-card ticket-detail-main">
              <span>Acciones operativas</span>
              <DealerVehicleActions vehicle={vehicle} onUpdated={onUpdated} />
            </article>
          </div>
        </div>

        {/* Social kit */}
        {!hasKitRedes ? (
          <div className="dealer-social-kit dealer-social-kit--locked">
            <div className="dealer-social-kit__head">
              <strong className="dealer-social-kit__title">Kit de redes</strong>
            </div>
            <div className="dealer-module-locked-screen">
              <p className="eyebrow">Kit de redes</p>
              <h2>Disponible desde plan Elite</h2>
              <p>
                Incluye textos comerciales listos para compartir, enlace de
                publicación y card promocional para redes sociales.
              </p>
            </div>
          </div>
        ) : (
        <div className="dealer-social-kit">
          <div className="dealer-social-kit__head">
            <strong className="dealer-social-kit__title">Kit de redes</strong>
            <span className="dealer-social-kit__subtitle">
              Copiá un texto listo para compartir esta unidad en WhatsApp, redes o grupos de venta.
            </span>
          </div>

          <div className="dealer-social-kit__variant-toggle" role="group" aria-label="Variante del texto">
            <button
              type="button"
              className={`dealer-social-kit__variant-btn${copyVariant === "full" ? " dealer-social-kit__variant-btn--active" : ""}`}
              onClick={() => setCopyVariant("full")}
              aria-pressed={copyVariant === "full"}
              aria-label="Ver texto completo"
            >
              Completo
            </button>
            <button
              type="button"
              className={`dealer-social-kit__variant-btn${copyVariant === "short" ? " dealer-social-kit__variant-btn--active" : ""}`}
              onClick={() => setCopyVariant("short")}
              aria-pressed={copyVariant === "short"}
              aria-label="Ver texto corto"
            >
              Corto
            </button>
          </div>

          <pre className="dealer-social-kit__preview">{socialCopy}</pre>

          <div className="dealer-social-kit__actions">
            <button
              type="button"
              className={`dealer-social-kit__copy-btn${
                copyKitState === "copied" ? " dealer-social-kit__copy-btn--copied"
                : copyKitState === "error"  ? " dealer-social-kit__copy-btn--error"
                : ""
              }`}
              onClick={handleCopyKit}
              aria-label={
                copyKitState === "copied" ? "Texto copiado al portapapeles"
                : copyKitState === "error"  ? "No se pudo copiar"
                : "Copiar texto para compartir"
              }
            >
              {copyKitState === "copied" ? "Copiado ✓"
               : copyKitState === "error"  ? "No se pudo copiar"
               : "Copiar texto"}
            </button>

            {publicUrl && (
              <button
                type="button"
                className={`dealer-social-kit__share-btn${
                  shareKitState === "linked" ? " dealer-social-kit__share-btn--linked"
                  : shareKitState === "error"  ? " dealer-social-kit__share-btn--error"
                  : ""
                }`}
                onClick={handleShareKit}
                aria-label={
                  shareKitState === "linked" ? "Enlace copiado al portapapeles"
                  : shareKitState === "error"  ? "No se pudo compartir la publicación"
                  : "Compartir publicación"
                }
              >
                {shareKitState === "linked" ? "Enlace copiado ✓"
                 : shareKitState === "error"  ? "No se pudo compartir"
                 : "Compartir publicación"}
              </button>
            )}

            <button
              type="button"
              className={`dealer-social-kit__card-btn${
                cardState === "done"  ? " dealer-social-kit__card-btn--done"
                : cardState === "error" ? " dealer-social-kit__card-btn--error"
                : cardState === "generating" ? " dealer-social-kit__card-btn--generating"
                : ""
              }`}
              onClick={handleDownloadCard}
              disabled={cardState === "generating"}
              aria-label={
                cardState === "done"       ? "Card generada y descargada"
                : cardState === "error"    ? "No se pudo generar la card"
                : cardState === "generating" ? "Generando card..."
                : "Descargar card para redes"
              }
            >
              {cardState === "done"        ? "Card lista ✓"
               : cardState === "error"     ? "No se pudo generar"
               : cardState === "generating" ? "Generando…"
               : "Descargar card"}
            </button>

            <p className="dealer-social-kit__note">
              El texto incluye los datos actuales de la publicación. Revisá antes de compartir.
            </p>
          </div>
        </div>
        )}
      </section>
    </div>,
    document.body
  );
}