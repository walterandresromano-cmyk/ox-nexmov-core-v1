import { useEffect, useState } from "react";

import VehicleDetailModal from "../../components/cards/VehicleDetailModal.jsx";
import { getPublicVehicleById } from "../../services/vehicles.service.js";
import { registerVehicleDetailView } from "../../services/vehicleViews.service.js";
import { injectJsonLd, removeJsonLd, buildCarSchema } from "../../lib/schema.js";

function getVehicleTitle(vehicle) {
  return [vehicle?.brand, vehicle?.model, vehicle?.year]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getVehicleShareUrl(vehicleId) {
  if (typeof window === "undefined") return "";

  return `${window.location.origin}/vehiculo/${encodeURIComponent(vehicleId)}`;
}

function setMetaContent(attr, attrValue, content) {
  if (typeof document === "undefined") return;

  let element = document.querySelector(`meta[${attr}="${attrValue}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, attrValue);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setCanonical(url) {
  if (typeof document === "undefined") return;
  let link = document.querySelector("link[rel='canonical']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

export default function PublicVehicleDetailRoute({
  appActions,
  onNavigate,
  routeParams,
}) {
  const vehicleId = routeParams?.vehicleId;
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVehicle() {
      if (!vehicleId) {
        setVehicle(null);
        setErrorMessage("No encontramos el vehiculo solicitado.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { vehicle: loadedVehicle, error } = await getPublicVehicleById(vehicleId);

      if (cancelled) return;

      if (error || !loadedVehicle) {
        setVehicle(null);
        setErrorMessage("Esta publicacion no existe o ya no esta disponible.");
        setLoading(false);
        return;
      }

      setVehicle(loadedVehicle);
      setLoading(false);
      registerVehicleDetailView(loadedVehicle.id);
    }

    loadVehicle();

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicle) return undefined;

    const previousTitle = document.title;
    const title = `${getVehicleTitle(vehicle)} en oX NEXMOV`;
    const location = [vehicle.city, vehicle.province].filter(Boolean).join(", ");
    const description = [
      `${vehicle.brand} ${vehicle.model}`,
      vehicle.year ? `año ${vehicle.year}` : "",
      vehicle.kilometers ? `${Number(vehicle.kilometers).toLocaleString("es-AR")} km` : "",
      location ? `en ${location}` : "",
      "Publicado en oX NEXMOV.",
    ]
      .filter(Boolean)
      .join(" ");
    const shareUrl = getVehicleShareUrl(vehicle.id);

    const previousCanonical = document.querySelector("link[rel='canonical']")?.href || "";
    const vehicleImage = vehicle.mainImageUrl || vehicle.imageUrl || "";

    document.title = title;
    setMetaContent("name", "description", description);
    setMetaContent("property", "og:type", "product");
    setMetaContent("property", "og:title", title);
    setMetaContent("property", "og:description", description);
    setMetaContent("property", "og:url", shareUrl);
    if (vehicleImage) {
      setMetaContent("property", "og:image", vehicleImage);
      setMetaContent("name", "twitter:image", vehicleImage);
    }
    setMetaContent("name", "twitter:title", title);
    setMetaContent("name", "twitter:description", description);
    setCanonical(shareUrl);

    // JSON-LD schema.org/Car — rich results en Google para autos usados
    injectJsonLd("ox-vehicle-jsonld", buildCarSchema(vehicle, shareUrl));

    return () => {
      document.title = previousTitle;
      setMetaContent("property", "og:type", "website");
      setMetaContent("property", "og:title", "oX NEXMOV — Marketplace de vehículos verificados");
      setMetaContent("property", "og:description", "Encontrá tu próximo vehículo en oX NEXMOV. Publicaciones de dealers verificados con datos reales, comparador y consultas trazables.");
      setMetaContent("property", "og:image", "https://www.oxnexmov.com.ar/1hero-car.png");
      setMetaContent("name", "twitter:image", "https://www.oxnexmov.com.ar/1hero-car.png");
      if (previousCanonical) setCanonical(previousCanonical);
      removeJsonLd("ox-vehicle-jsonld");
    };
  }, [vehicle]);

  function goBackOrSearch() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    onNavigate?.("search");
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="auth-message">Cargando detalle del vehiculo...</div>
        </div>
      </section>
    );
  }

  if (!vehicle) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="empty-state">
            <h2>Vehiculo no disponible</h2>
            <p>{errorMessage || "La publicacion solicitada no esta disponible."}</p>
            <button
              type="button"
              className="table-action-btn"
              onClick={() => onNavigate?.("search")}
            >
              Ver vehiculos disponibles
            </button>
          </div>
        </div>
      </section>
    );
  }

  const dealer = vehicle.dealer || null;
  const favoriteActive = appActions?.isFavorite?.(vehicle.id) || false;
  const shareUrl = getVehicleShareUrl(vehicle.id);

  return (
    <>
      <section className="page-section" aria-hidden="true">
        <div className="container">
          <div className="route-loading" />
        </div>
      </section>

      <VehicleDetailModal
        vehicle={vehicle}
        dealer={dealer}
        onClose={goBackOrSearch}
        onCompare={() => appActions?.addToCompare?.(vehicle)}
        onFavorite={() => appActions?.toggleFavorite?.(vehicle)}
        favoriteActive={favoriteActive}
        onContact={() => {}}
        appActions={appActions}
        onNavigate={onNavigate}
        shareUrl={shareUrl}
      />
    </>
  );
}
