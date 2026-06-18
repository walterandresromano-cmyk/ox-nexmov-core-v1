import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/home.css";
import ScrambleStat from "../../components/ScrambleStat.jsx";
import { usePlaceholderCycle } from "../../hooks/usePlaceholderCycle.js";
import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import VehicleCardSkeleton from "../../components/cards/VehicleCardSkeleton.jsx";
const VehicleDetailModal = lazy(() => import("../../components/cards/VehicleDetailModal.jsx"));
const ContactGate        = lazy(() => import("./ContactGate.jsx"));
import { normalizeWhatsAppArgentina } from "../../lib/formatters.js";
import { registerVehicleDetailView } from "../../services/vehicleViews.service.js";
import { listPublicActiveDealers } from "../../services/dealers.service.js";
import { listPublicLatestVehicles, getPublicInventoryStats, isPublicVehicleVisible } from "../../services/vehicles.service.js";
import { saveVehiclePreview, loadVehiclePreview } from "../../lib/vehiclePreviewCache.js";
import {
  ShieldCheckIcon,
  ArrowsSwapIcon,
  TargetIcon,
  DollarSignIcon,
  ClipboardCheckIcon,
  CheckIcon,
} from "../../components/icons/PublicIcons.jsx";

const quickSearches = [
  "SUV financiada",
  "Primer auto",
  "Bajo consumo",
  "Pick up diesel",
  "Familiar 7 asientos",
];

const QUICK_SEARCH_PRESETS = {
  "SUV financiada": {
    query: "",
    filters: { vehicleType: "suv", financing: "yes" },
  },
  "Primer auto": {
    query: "",
    filters: { priceMax: "15000000", kmMax: "120000", status: "available" },
  },
  "Bajo consumo": {
    query: "",
    filters: { fuel: "nafta" },
  },
  "Pick up diesel": {
    query: "",
    filters: { vehicleType: "pickup", fuel: "diesel" },
  },
  "Familiar 7 asientos": {
    query: "7 asientos",
    filters: { vehicleType: "suv" },
  },
};

const trustItems = [
  { title: "Vendedores verificados", text: "Datos comerciales validados por oX antes de operar", icon: ShieldCheckIcon },
  { title: "Comparar hasta 4 autos", text: "Lado a lado, con datos reales", icon: ArrowsSwapIcon },
  { title: "Contactos seguros", text: "Registrados antes del chat", icon: TargetIcon },
  { title: "Financiación visible", text: "Entrega, cuotas y tasa siempre claros", icon: DollarSignIcon },
  { title: "Publicaciones auditadas", text: "Revisadas antes de publicarse", icon: ClipboardCheckIcon },
  { title: "Sin comisión", text: "Buscar, comparar y contactar no tiene ningún costo para el comprador.", icon: CheckIcon },
];

const confidenceItems = [
  {
    title: "Publicación revisada",
    text: "Datos clave visibles antes de avanzar.",
    details: [
      "Precio, kilometraje y versión publicados",
      "Ubicación y plaza comercial visibles",
      "Fotos cargadas o estado informado",
      "Señal, financiación y combustible claros",
      "Comparación disponible antes del contacto",
    ],
  },
  {
    title: "Vendedor identificado",
    text: "Operadores habilitados dentro de la red.",
    details: [
      "Cuenta comercial asociada a cada unidad",
      "Categoría del vendedor visible en la publicación",
      "Teléfono validado antes de derivar",
      "Historial operativo dentro de la plataforma",
      "Soporte interno si la información no coincide",
    ],
  },
  {
    title: "Consulta registrada",
    text: "Tu contacto queda registrado antes del chat.",
    details: [
      "Tu interés queda asociado al vehículo",
      "El vendedor recibe tu consulta con contexto",
      "No necesitás registrarte para explorar",
      "Podés comparar alternativas antes de decidir",
      "La conversación empieza con datos ordenados",
    ],
  },
];

function getPlanLabel(plan) {
  if (plan === "platinum") return "Platinum";
  if (plan === "elite") return "Elite";
  if (plan === "pro") return "Pro";
  return "Inicio";
}

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

function formatCount(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

function formatKm(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Sin km";
  }

  return `${number.toLocaleString("es-AR")} km`;
}

function buildDealerForVehicle(vehicle) {
  return {
    id: vehicle.dealer?.id || `dealer-${vehicle.id}`,
    commercialName: vehicle.dealer?.commercialName || "Dealer no informado",
    plan: vehicle.dealer?.plan || "inicio",
    planStatus: "active",
    province: vehicle.province || "",
    city: vehicle.city || "",
    logo: vehicle.dealer?.logo || null,
    phone: normalizeWhatsAppArgentina(
      vehicle.dealer?.phone ||
        vehicle.dealer?.phoneWhatsapp ||
        vehicle.dealer?.dealerWhatsapp ||
        vehicle.dealer?.dealer_whatsapp ||
        vehicle.dealer?.phone_whatsapp ||
        vehicle.dealer?.contactPhone ||
        vehicle.dealer?.contact_phone ||
        vehicle.dealerWhatsapp ||
        vehicle.dealer_whatsapp ||
        vehicle.phoneWhatsapp ||
        vehicle.phone_whatsapp ||
        vehicle.contactPhone ||
        vehicle.contact_phone ||
        vehicle.raw?.dealer_phone
    ),
    phoneWhatsapp: normalizeWhatsAppArgentina(
      vehicle.dealer?.phone ||
        vehicle.dealer?.phoneWhatsapp ||
        vehicle.dealer?.dealerWhatsapp ||
        vehicle.dealer?.dealer_whatsapp ||
        vehicle.dealer?.phone_whatsapp ||
        vehicle.dealer?.contactPhone ||
        vehicle.dealer?.contact_phone ||
        vehicle.dealerWhatsapp ||
        vehicle.dealer_whatsapp ||
        vehicle.phoneWhatsapp ||
        vehicle.phone_whatsapp ||
        vehicle.contactPhone ||
        vehicle.contact_phone ||
        vehicle.raw?.dealer_phone
    ),
    dealerWhatsapp: normalizeWhatsAppArgentina(
      vehicle.dealer?.dealerWhatsapp ||
        vehicle.dealer?.dealer_whatsapp ||
        vehicle.dealer?.phone ||
        vehicle.dealer?.phoneWhatsapp ||
        vehicle.dealer?.phone_whatsapp ||
        vehicle.dealer?.contactPhone ||
        vehicle.dealer?.contact_phone ||
        vehicle.dealerWhatsapp ||
        vehicle.dealer_whatsapp ||
        vehicle.phoneWhatsapp ||
        vehicle.phone_whatsapp ||
        vehicle.contactPhone ||
        vehicle.contact_phone ||
        vehicle.raw?.dealer_phone
    ),
    contactPhone:
      vehicle.dealer?.contactPhone ||
      vehicle.dealer?.contact_phone ||
      vehicle.contactPhone ||
      vehicle.contact_phone ||
      vehicle.phoneWhatsapp ||
      vehicle.phone_whatsapp ||
      vehicle.dealerWhatsapp ||
      vehicle.dealer_whatsapp ||
      vehicle.raw?.dealer_phone ||
      "",
    benefits: {},
    currentPeriod: {
      publicationsUsed: 0,
      expiresInDays: 30,
    },
  };
}

function getVehicleSignal(vehicle, index) {
  const price = Number(vehicle.price || 0);
  const km = Number(vehicle.kilometers || vehicle.km || 0);
  const year = Number(vehicle.year || 0);

  if (price > 0 && price <= 15000000) {
    return { label: "Buena oportunidad", text: "Precio competitivo" };
  }

  if (km > 0 && km <= 30000) {
    return { label: "Menor uso", text: "Kilometraje atractivo" };
  }

  if (year >= 2022) {
    return { label: "Modelo reciente", text: "Unidad nueva en la red" };
  }

  if (index === 0) {
    return { label: "Destacado", text: "Recién publicado" };
  }

  return { label: "Disponible", text: "Unidad activa" };
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sortEntriesByCount(entries) {
  return Object.entries(entries).sort((a, b) => b[1] - a[1]);
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* isVehicleVisibleForBuyer is isPublicVehicleVisible imported from vehicles.service.js */
const isVehicleVisibleForBuyer = isPublicVehicleVisible;

function getVehicleAutocompleteFields(vehicle) {
  const brand = String(
    vehicle.brand || vehicle.make || vehicle.raw?.brand || vehicle.raw?.make || ""
  ).trim();
  const model = String(vehicle.model || vehicle.raw?.model || "").trim();
  const version = String(vehicle.version || vehicle.raw?.version || "").trim();
  const year = String(vehicle.year || vehicle.raw?.year || "").trim();

  return { brand, model, version, year };
}

function scoreAutocompleteSuggestion(label, haystack, query) {
  const normalizedLabel = normalizeSearchText(label);
  const normalizedHaystack = normalizeSearchText(haystack || label);
  const tokens = query.split(" ").filter(Boolean);

  let score = 0;

  if (normalizedLabel === query) score += 120;
  if (normalizedLabel.startsWith(query)) score += 80;
  if (normalizedHaystack.includes(query)) score += 45;

  tokens.forEach((token) => {
    if (token.length > 1 && normalizedHaystack.includes(token)) score += 10;
  });

  return score;
}

function buildVehicleAutocompleteSuggestions(vehicles, query, limit = 8) {
  const text = normalizeSearchText(query);
  if (text.length < 2) return [];

  const suggestions = new Map();

  function addSuggestion(suggestion) {
    if (!suggestion.label) return;

    const key = `${suggestion.type}:${normalizeSearchText(suggestion.label)}`;
    const haystack = [
      suggestion.label,
      suggestion.brand,
      suggestion.model,
      suggestion.version,
      suggestion.year,
    ]
      .filter(Boolean)
      .join(" ");
    const score = scoreAutocompleteSuggestion(suggestion.label, haystack, text);

    if (score <= 0) return;

    const current = suggestions.get(key);
    if (!current || score > current.score) {
      suggestions.set(key, {
        ...suggestion,
        searchValue: suggestion.searchValue || suggestion.label,
        score,
      });
    }
  }

  vehicles.filter(isVehicleVisibleForBuyer).forEach((vehicle) => {
    const { brand, model, version, year } = getVehicleAutocompleteFields(vehicle);
    if (!brand) return;

    addSuggestion({
      type: "brand",
      label: brand,
      searchValue: brand,
      brand,
      year,
    });

    if (model) {
      const modelLabel = `${brand} ${model}`;
      addSuggestion({
        type: "model",
        label: modelLabel,
        searchValue: modelLabel,
        brand,
        model,
        year,
      });
    }

    if (model && version) {
      const versionLabel = `${brand} ${model} ${version}`;
      addSuggestion({
        type: "version",
        label: versionLabel,
        searchValue: versionLabel,
        brand,
        model,
        version,
        year,
      });
    }
  });

  return Array.from(suggestions.values())
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "es"))
    .slice(0, limit);
}

function getSuggestionTypeLabel(type) {
  if (type === "brand") return "Marca";
  if (type === "model") return "Modelo";
  if (type === "version") return "Versión";
  return "Sugerencia";
}

function getGhostCompletion(query, suggestions) {
  const rawQuery = String(query || "");
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (normalizedQuery.length < 2 || !suggestions.length) return null;

  const suggestion = suggestions.find((item) =>
    normalizeSearchText(item.searchValue || item.label).startsWith(normalizedQuery)
  );

  if (!suggestion) return null;

  const value = suggestion.searchValue || suggestion.label;
  if (value.length <= rawQuery.length) return null;

  return {
    value,
    suffix: value.slice(rawQuery.length),
  };
}

// Componente aislado para que el ciclo de placeholder (setText cada 35-60ms)
// solo re-renderice el input, no todo Home.
function HeroSearchInput({ value, ghostCompletion, onChange, onAcceptCompletion }) {
  const cycledPlaceholder = usePlaceholderCycle(value === "");
  return (
    <div className="vehicle-autocomplete-field">
      {ghostCompletion && (
        <span className="vehicle-autocomplete-ghost" aria-hidden="true">
          <span>{value}</span>
          {ghostCompletion.suffix}
        </span>
      )}
      <input
        type="search"
        autoComplete="off"
        aria-label="Buscar vehículos"
        value={value}
        onChange={onChange}
        onKeyDown={(event) => {
          if (
            ghostCompletion &&
            (event.key === "Tab" || event.key === "ArrowRight") &&
            event.currentTarget.selectionStart === value.length
          ) {
            event.preventDefault();
            onAcceptCompletion(ghostCompletion.value);
          }
        }}
        placeholder={cycledPlaceholder || "¿Qué vehículo estás buscando?"}
      />
    </div>
  );
}

export default function Home({ onNavigate, appActions = {} }) {
  const [publicDealers, setPublicDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [dealersError, setDealersError] = useState("");

  const [latestVehicles, setLatestVehicles] = useState(() => loadVehiclePreview() || []);
  const [loadingLatestVehicles, setLoadingLatestVehicles] = useState(() => loadVehiclePreview() === null);
  const [latestVehiclesError, setLatestVehiclesError] = useState("");
  const [heroSearchText, setHeroSearchText] = useState("");

  const latestVehiclesCarouselRef = useRef(null);
  const heroRef        = useRef(null);
  const roadRef        = useRef(null);
  const heroCopyRef    = useRef(null);
  const spotlightRef   = useRef(null);
  const parallaxRaf    = useRef(null);
  const spotlightRaf   = useRef(null);

  const [extraStats, setExtraStats] = useState({ brands: 0, reserved: 0, sold: 0, withFinancing: 0, contacts: 0, activeDealers: 0 });

  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [selectedFeaturedVehicle, setSelectedFeaturedVehicle] = useState(null);
  const [selectedFeaturedDealer, setSelectedFeaturedDealer] = useState(null);
  const [showFeaturedDetail, setShowFeaturedDetail] = useState(false);
  const [showFeaturedContactGate, setShowFeaturedContactGate] = useState(false);

  const safeAppActions = {
    authUser: appActions?.authUser || null,
    authProfile: appActions?.authProfile || null,
    addToCompare:
      appActions?.addToCompare ||
      (() => {
        if (onNavigate) onNavigate("search");
      }),
    toggleFavorite:
      appActions?.toggleFavorite ||
      (() => {
        if (onNavigate) onNavigate("login");
      }),
    isFavorite: appActions?.isFavorite || (() => false),
  };

  async function loadPublicDealers() {
    setLoadingDealers(true);
    setDealersError("");

    const { dealers, error } = await listPublicActiveDealers();

    if (error) {
      setPublicDealers([]);
      setDealersError(
        error.message || "No se pudieron cargar los dealers activos."
      );
      setLoadingDealers(false);
      return;
    }

    setPublicDealers(dealers || []);
    setLoadingDealers(false);
  }

  async function loadLatestVehicles() {
    setLatestVehiclesError("");

    const { vehicles, error } = await listPublicLatestVehicles({ limit: 8 });

    setLoadingLatestVehicles(false);

    if (error) {
      // Si hay datos cacheados, los mantenemos silenciosamente
      setLatestVehicles((prev) => {
        if (prev.length === 0) {
          setLatestVehiclesError(
            "No pudimos cargar vehículos disponibles en este momento."
          );
          return [];
        }
        return prev;
      });
      return;
    }

    const filtered = (vehicles || []).filter(isPublicVehicleVisible);
    saveVehiclePreview(filtered);
    setLatestVehicles(filtered);
  }

  useEffect(() => {
    loadPublicDealers();
    loadLatestVehicles();
    getPublicInventoryStats().then(setExtraStats).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (latestVehicles.length <= 1) return;

    const carousel = latestVehiclesCarouselRef.current;
    if (!carousel) return;

    const interval = window.setInterval(() => {
      const cardWidth = carousel.firstElementChild?.offsetWidth || 330;
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      const nextScroll = carousel.scrollLeft + cardWidth;

      carousel.scrollTo({
        left: nextScroll >= maxScroll ? 0 : nextScroll,
        behavior: "smooth",
      });
    }, 4200);

    return () => window.clearInterval(interval);
  }, [latestVehicles.length]);

  const featuredVehicles = latestVehicles.slice(0, 4);
  const featuredCount = featuredVehicles.length;

  useEffect(() => {
    if (featuredCount <= 1) return;
    const id = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredCount);
    }, 3500);
    return () => clearInterval(id);
  }, [featuredCount]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onScroll() {
      if (parallaxRaf.current) return;
      parallaxRaf.current = requestAnimationFrame(() => {
        parallaxRaf.current = null;

        // Hero parallax
        const { top: heroTop, height: heroH } = hero.getBoundingClientRect();
        if (heroTop <= heroH && heroTop >= -heroH) {
          const offset = -heroTop;
          if (roadRef.current)     roadRef.current.style.transform     = `translateY(${(offset * 0.30).toFixed(1)}px)`;
          if (heroCopyRef.current) heroCopyRef.current.style.transform = `translateY(${(offset * 0.12).toFixed(1)}px)`;
        }

      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (parallaxRaf.current) cancelAnimationFrame(parallaxRaf.current);
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    const spot = spotlightRef.current;
    if (!hero || !spot || window.matchMedia("(hover: none)").matches) return;

    function onMouseMove(e) {
      if (spotlightRaf.current) return;
      spotlightRaf.current = requestAnimationFrame(() => {
        spotlightRaf.current = null;
        const { left, top, width, height } = hero.getBoundingClientRect();
        const x = ((e.clientX - left) / width  * 100).toFixed(1);
        const y = ((e.clientY - top)  / height * 100).toFixed(1);
        spot.style.setProperty("--sx", `${x}%`);
        spot.style.setProperty("--sy", `${y}%`);
        spot.style.opacity = "1";
      });
    }

    function onMouseLeave() {
      if (spot) spot.style.opacity = "0";
    }

    hero.addEventListener("mousemove", onMouseMove);
    hero.addEventListener("mouseleave", onMouseLeave);
    return () => {
      hero.removeEventListener("mousemove", onMouseMove);
      hero.removeEventListener("mouseleave", onMouseLeave);
      if (spotlightRaf.current) cancelAnimationFrame(spotlightRaf.current);
    };
  }, []);

  const homeStats = useMemo(() => {
    const totalActiveVehicles = publicDealers.reduce(
      (sum, dealer) => sum + Number(dealer.activeVehiclesCount || 0),
      0
    );

    const cities = countBy(publicDealers, (dealer) => {
      if (!dealer.city) return "";
      return dealer.province ? `${dealer.city}, ${dealer.province}` : dealer.city;
    });

    const activeLocations = sortEntriesByCount(cities).slice(0, 5);

    const vehiclesWithImages = latestVehicles.filter(
      (vehicle) => vehicle.mainImageUrl || vehicle.imageUrl
    ).length;

    const provinces = new Set(
      publicDealers.map((d) => d.province).filter(Boolean)
    ).size;

    return {
      totalActiveVehicles,
      visibleDealers: publicDealers.length,
      activeLocations,
      vehiclesWithImages,
      provinces,
    };
  }, [publicDealers, latestVehicles]);

  const heroAutocompleteSuggestions = useMemo(
    () => buildVehicleAutocompleteSuggestions(latestVehicles, heroSearchText, 8),
    [latestVehicles, heroSearchText]
  );

  const heroGhostCompletion = useMemo(
    () => getGhostCompletion(heroSearchText, heroAutocompleteSuggestions),
    [heroSearchText, heroAutocompleteSuggestions]
  );

  function goToSearch(query = "", overrides = {}) {
    onNavigate("search", {
      query,
      ...overrides,
    });
  }

  function handleHeroSearch(event) {
    event.preventDefault();
    goToSearch(heroSearchText);
  }

  function scrollLatestVehicles(direction) {
    const carousel = latestVehiclesCarouselRef.current;
    if (!carousel) return;

    const cardWidth = carousel.firstElementChild?.offsetWidth || 330;
    carousel.scrollBy({
      left: direction === "next" ? cardWidth : -cardWidth,
      behavior: "smooth",
    });
  }

  return (
    <>
    <section className="page-section ox-home-page-v3">
      <div className="container ox-home-shell-v3">
        <section className="ox-home-hero-v3" ref={heroRef}>
          <div className="ox-home-hero-road" aria-hidden="true" ref={roadRef} />
          <div className="ox-hero-spotlight" aria-hidden="true" ref={spotlightRef} />
          <div className="ox-home-hero-copy-v3" ref={heroCopyRef}>
            <p className="ox-home-eyebrow-v3 ox-hero-reveal ox-hero-reveal--0">
              Red automotriz verificada · Argentina
            </p>

            <h1>
              <span className="ox-hero-reveal ox-hero-reveal--1">
                <span className="ox-hero-word-white">Comprá</span> con datos reales.
              </span>
              <br />
              <span className="ox-hero-reveal ox-hero-reveal--2">
                <span className="ox-hero-word-white">Guardá</span> tu Garage.
              </span>
              <br />
              <span className="ox-hero-reveal ox-hero-reveal--3">
                <span className="ox-hero-word-white">Decidí</span> con <span>contexto completo.</span>
              </span>
            </h1>

            <p className="ox-hero-reveal ox-hero-reveal--4">
              Comprá sin sorpresas. Publicaciones revisadas, vendedores
              identificados y precio visible desde el primer clic.
            </p>

            <form
              className="ox-home-search-v3 vehicle-autocomplete ox-hero-reveal ox-hero-reveal--5"
              onSubmit={handleHeroSearch}
            >
              <HeroSearchInput
                value={heroSearchText}
                ghostCompletion={heroGhostCompletion}
                onChange={(event) => setHeroSearchText(event.target.value)}
                onAcceptCompletion={setHeroSearchText}
              />

              <button type="submit">Buscar</button>
            </form>

            <div className="ox-home-chips-v3 ox-hero-reveal ox-hero-reveal--6">
              {quickSearches.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    const preset = QUICK_SEARCH_PRESETS[q] || { query: q };
                    goToSearch(preset.query ?? q, {
                      filters: preset.filters || {},
                    });
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="ox-home-primary-actions-v3 ox-hero-reveal ox-hero-reveal--7">
              <button type="button" onClick={() => goToSearch("")}>
                Buscar vehículos
              </button>
              <button type="button" onClick={() => onNavigate("zeroKm")}>
                Ver financiación 0km
              </button>
              <button type="button" onClick={() => onNavigate("sellVehicle")}>
                Mi Garage
              </button>
            </div>

            <div className="ox-home-trust-strip-v3">
              {trustItems.map((item) => {
                const TrustIcon = item.icon;
                return (
                  <article key={item.title}>
                    <span><TrustIcon size={18} /></span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.text}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="ox-home-hero-stage-v3" />

          <div className="ox-home-hero-brand" aria-hidden="true">
            <span className="ox-home-hero-tagline">Argentina · Verificado</span>
          </div>

        </section>

        {latestVehiclesError && (
          <div className="auth-warning">
            {latestVehiclesError}
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={loadLatestVehicles}
              style={{ marginLeft: "10px" }}
            >
              Reintentar
            </button>
          </div>
        )}

        {dealersError && (
          <div className="auth-warning">
            {dealersError}
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={loadPublicDealers}
              style={{ marginLeft: "10px" }}
            >
              Reintentar
            </button>
          </div>
        )}

        <section className="ox-home-main-grid-v3">
          <div className="ox-home-featured-vehicles-v3">
            <div className="ox-home-section-head-v3">
              <div>
                <h2>Vehículos destacados</h2>
                <p>Publicadas recientemente, con datos completos.</p>
              </div>

              <div className="ox-home-section-actions-v3">
                <button type="button" onClick={() => scrollLatestVehicles("prev")}>
                  ←
                </button>
                <button type="button" onClick={() => scrollLatestVehicles("next")}>
                  →
                </button>
                <button type="button" onClick={() => goToSearch("")}>
                  Ver todos →
                </button>
              </div>
            </div>

            {loadingLatestVehicles && (
              <div className="ox-home-vehicles-carousel-v3 ox-home-vehicles-skeleton-v3" aria-hidden="true">
                {Array.from({ length: 5 }, (_, n) => (
                  <div key={n} className="ox-home-vehicle-wrap-v3">
                    <VehicleCardSkeleton compact index={n} />
                  </div>
                ))}
              </div>
            )}

            {!loadingLatestVehicles && latestVehicles.length === 0 && (
              <div className="empty-state">
                <strong>No hay vehículos publicados disponibles en este momento.</strong>
                <p>
                  Estamos actualizando el inventario. Podés volver a intentarlo
                  más tarde o consultar financiación 0km.
                </p>
                <button type="button" onClick={() => onNavigate("zeroKm")}>
                  Ver financiación 0km
                </button>
              </div>
            )}

            {latestVehicles.length > 0 && (
              <div
                ref={latestVehiclesCarouselRef}
                className="ox-home-vehicles-carousel-v3"
              >
                {latestVehicles.slice(0, 8).map((vehicle, idx) => {
                  const dealer = buildDealerForVehicle(vehicle);

                  return (
                    <div key={vehicle.id} className="ox-home-vehicle-wrap-v3">
                      <VehicleCardPublic
                        vehicle={{
                          ...vehicle,
                          dealer,
                          marketReferencePrice:
                            vehicle.marketReferencePrice || vehicle.price || 0,
                        }}
                        dealer={dealer}
                        appActions={safeAppActions}
                        onNavigate={onNavigate}
                        priority={idx < 3}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>

        <aside className="ox-home-confidence-v3">
          <div className="ox-home-confidence-head-v3">
            <h2>
              Antes de contactar, ya sabés más
            </h2>
            <p>
              Precio, ubicación, financiación e información del vendedor conviven
              en una misma lectura, sin presión y sin pasos innecesarios.
            </p>
          </div>

            <div className="ox-home-confidence-list-v3">
              {confidenceItems.map((item) => (
                <article key={item.title}>
                  <span><CheckIcon size={16} /></span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="ox-home-confidence-cta-v3">
              <strong>Menos incertidumbre. Más decisión.</strong>
              <span>
                Cuando una unidad te interesa, el contacto sucede con contexto:
                sabés quién publica, qué datos están visibles y cómo queda
                registrada tu consulta.
              </span>
            </div>
        </aside>

        <section className="ox-home-intelligence-grid-v3">
          <article className="ox-home-inventory-v3">
            <div className="ox-home-inventory-road" aria-hidden="true" />
            <h2>Vehículos en todo el país</h2>
            <p>Publicaciones en las principales plazas de Argentina.</p>

            <div className="ox-home-map-v3">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="ox-home-stats-v3">
              {(extraStats.activeDealers || homeStats.visibleDealers) > 0 && (
                <ScrambleStat value={extraStats.activeDealers || homeStats.visibleDealers} label="Vendedores activos" />
              )}
              {homeStats.totalActiveVehicles > 0 && (
                <ScrambleStat value={homeStats.totalActiveVehicles} label="Publicaciones activas" />
              )}
              {homeStats.activeLocations.length > 0 && (
                <ScrambleStat value={homeStats.activeLocations.length} label="Plazas con movimiento" />
              )}
              {homeStats.vehiclesWithImages > 0 && (
                <ScrambleStat value={homeStats.vehiclesWithImages} label="Imágenes cargadas hoy" />
              )}
              {extraStats.brands > 0 && (
                <ScrambleStat value={extraStats.brands} label="Marcas disponibles" />
              )}
              {homeStats.provinces > 0 && (
                <ScrambleStat value={homeStats.provinces} label="Provincias cubiertas" />
              )}
              {extraStats.reserved > 0 && (
                <ScrambleStat value={extraStats.reserved} label="Vehículos reservados" />
              )}
              {extraStats.sold > 0 && (
                <ScrambleStat value={extraStats.sold} label="Vehículos vendidos" />
              )}
              {extraStats.withFinancing > 0 && (
                <ScrambleStat value={extraStats.withFinancing} label="Con financiación" />
              )}
              {extraStats.contacts > 0 && (
                <ScrambleStat value={extraStats.contacts} label="Consultas registradas" />
              )}
            </div>

            <div className="ox-home-locations-v3">
              {homeStats.activeLocations.length > 0 ? (
                homeStats.activeLocations.map(([location, count]) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => goToSearch(location)}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ opacity: 0.7, flexShrink: 0 }}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    {location}
                    <small>{count} activos</small>
                  </button>
                ))
              ) : (
                <span>Sin plazas activas para mostrar todavía.</span>
              )}
            </div>
          </article>

        </section>

      </div>
    </section>

    <Suspense fallback={null}>
      {showFeaturedDetail && selectedFeaturedVehicle && (
        <VehicleDetailModal
          vehicle={selectedFeaturedVehicle}
          dealer={selectedFeaturedDealer}
          onClose={() => setShowFeaturedDetail(false)}
          onCompare={() => safeAppActions?.addToCompare?.(selectedFeaturedVehicle)}
          onFavorite={() => safeAppActions?.toggleFavorite?.(selectedFeaturedVehicle)}
          favoriteActive={safeAppActions?.isFavorite?.(selectedFeaturedVehicle.id)}
          onContact={() => {
            setShowFeaturedDetail(false);
            setShowFeaturedContactGate(true);
          }}
        />
      )}

      {showFeaturedContactGate && selectedFeaturedVehicle && (
        <ContactGate
          vehicle={selectedFeaturedVehicle}
          dealer={selectedFeaturedDealer}
          authUser={safeAppActions?.authUser}
          authProfile={safeAppActions?.authProfile}
          onClose={() => setShowFeaturedContactGate(false)}
          onNavigate={onNavigate}
        />
      )}
    </Suspense>
    </>
  );
}
