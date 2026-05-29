import { useEffect, useMemo, useRef, useState } from "react";
import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import VehicleDetailModal from "../../components/cards/VehicleDetailModal.jsx";
import ContactGate from "./ContactGate.jsx";
import { normalizeWhatsAppArgentina } from "../../lib/formatters.js";
import { registerVehicleDetailView } from "../../services/vehicleViews.service.js";
import { listPublicActiveDealers } from "../../services/dealers.service.js";
import { listPublicLatestVehicles } from "../../services/vehicles.service.js";
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
  "0km entrega inmediata",
  "Bajo consumo",
  "Pick up diesel",
  "Familiar 7 asientos",
];

const trustItems = [
  { title: "Dealers verificados", text: "Habilitados por administración", icon: ShieldCheckIcon },
  { title: "Comparador real", text: "Lado a lado con datos reales", icon: ArrowsSwapIcon },
  { title: "Contactos trazables", text: "Registrados antes del chat", icon: TargetIcon },
  { title: "Financiación visible", text: "Entrega, cuotas y tasa siempre claros", icon: DollarSignIcon },
  { title: "Publicaciones auditadas", text: "Revisadas antes de publicarse", icon: ClipboardCheckIcon },
];

const confidenceItems = [
  {
    title: "Dealers verificados",
    text: "Publican solo quienes superan el proceso de habilitación de administración.",
  },
  {
    title: "Comparador real",
    text: "Compará hasta 4 vehículos con precio, financiación y datos clave lado a lado.",
  },
  {
    title: "Contactos trazables",
    text: "Cada consulta queda registrada antes de llegar al WhatsApp del dealer.",
  },
  {
    title: "Financiación visible",
    text: "Entrega, cuotas, tasa y condiciones siempre informadas en la publicación.",
  },
  {
    title: "Publicaciones auditadas",
    text: "Administración revisa cada publicación antes de que esté disponible.",
  },
  {
    title: "Soporte real",
    text: "Personas que ayudan a resolver cuando algo no funciona como debería.",
  },
];

const buyerSteps = [
  "Buscás por modelo o necesidad.",
  "Comparás opciones reales.",
  "Revisás precio, financiación y dealer.",
  "Te registrás solo al momento de contactar.",
  "Consultás con trazabilidad.",
];

const dealerBenefits = [
  "Publicaciones profesionales",
  "Leads trazables",
  "Métricas por vehículo",
  "Cupos por plan",
  "Panel operativo simple",
  "Soporte interno tipo ticket",
  "Diferenciación por señales reales",
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

function isVehicleVisibleForBuyer(vehicle) {
  const status = normalizeSearchText(
    [
      vehicle.status,
      vehicle.publicationStatus,
      vehicle.publication_status,
      vehicle.raw?.status,
      vehicle.raw?.publication_status,
    ]
      .filter(Boolean)
      .join(" ")
  );

  const blockedStatus = [
    "draft",
    "borrador",
    "paused",
    "pausado",
    "suspended",
    "suspendido",
    "expired",
    "vencido",
    "deleted",
    "eliminado",
    "inactive",
    "inactivo",
    "rejected",
    "rechazado",
  ];

  if (blockedStatus.some((blocked) => status.includes(blocked))) return false;
  if (vehicle.isPublished === false || vehicle.raw?.is_published === false) return false;
  if (vehicle.active === false || vehicle.is_active === false) return false;
  if (vehicle.raw?.active === false || vehicle.raw?.is_active === false) return false;

  return true;
}

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

export default function Home({ onNavigate, appActions = {} }) {
  const [publicDealers, setPublicDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [dealersError, setDealersError] = useState("");

  const [latestVehicles, setLatestVehicles] = useState([]);
  const [loadingLatestVehicles, setLoadingLatestVehicles] = useState(true);
  const [latestVehiclesError, setLatestVehiclesError] = useState("");
  const [heroSearchText, setHeroSearchText] = useState("");

  const latestVehiclesCarouselRef = useRef(null);

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
    setLoadingLatestVehicles(true);
    setLatestVehiclesError("");

    const { vehicles, error } = await listPublicLatestVehicles({ limit: 8 });

    if (error) {
      setLatestVehicles([]);
      setLatestVehiclesError(
        "No pudimos cargar vehículos disponibles en este momento."
      );
      setLoadingLatestVehicles(false);
      return;
    }

    setLatestVehicles(vehicles || []);
    setLoadingLatestVehicles(false);
  }

  useEffect(() => {
    loadPublicDealers();
    loadLatestVehicles();
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

    return {
      totalActiveVehicles,
      visibleDealers: publicDealers.length,
      activeLocations,
      vehiclesWithImages,
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

  function goToSearch(query = "") {
    onNavigate("search", {
      query,
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
        <section className="ox-home-hero-v3">
          <div className="ox-home-hero-road" aria-hidden="true" />
          <div className="ox-home-hero-copy-v3">
            <p className="ox-home-eyebrow-v3">
              Red automotriz verificada · Argentina
            </p>

            <h1>
              Comprá con datos reales.
              <br />
              Guardá tu Garage.
              <br />
              Decidí con <span>contexto completo.</span>
            </h1>

            <p>
              Publicaciones revisadas, dealers habilitados, financiación
              visible. Compará y contactá con todo el contexto antes de
              decidir.
            </p>

            <form
              className="ox-home-search-v3 vehicle-autocomplete"
              onSubmit={handleHeroSearch}
            >
              <div className="vehicle-autocomplete-field">
                {heroGhostCompletion && (
                  <span className="vehicle-autocomplete-ghost" aria-hidden="true">
                    <span>{heroSearchText}</span>
                    {heroGhostCompletion.suffix}
                  </span>
                )}

                <input
                  value={heroSearchText}
                  onChange={(event) => setHeroSearchText(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      heroGhostCompletion &&
                      (event.key === "Tab" || event.key === "ArrowRight") &&
                      event.currentTarget.selectionStart === heroSearchText.length
                    ) {
                      event.preventDefault();
                      setHeroSearchText(heroGhostCompletion.value);
                    }
                  }}
                  placeholder="¿Qué vehículo estás buscando?"
                />
              </div>

              <button type="submit">Buscar</button>
            </form>

            <div className="ox-home-primary-actions-v3">
              <button type="button" onClick={() => goToSearch("")}>
                Buscar vehículos
              </button>
              <button type="button" onClick={() => onNavigate("zeroKm")}>
                Ver financiación 0km
              </button>
              <button type="button" onClick={() => onNavigate("sellVehicle")}>
                Garage oX
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

          <div className="ox-home-hero-brand">
            <img
              className="ox-home-hero-car-v3"
              src="/hero-car.svg"
              alt="oX NEXMOV"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
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
                <p>Unidades recientes con lectura comercial.</p>
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
                    <div className="vehicle-card-skeleton">
                      <div className="vehicle-card-skeleton__image ox-shimmer" style={{ height: "108px" }} />
                      <div className="vehicle-card-skeleton__body">
                        <div className="vehicle-card-skeleton__line ox-shimmer" />
                        <div className="vehicle-card-skeleton__line vehicle-card-skeleton__line--short ox-shimmer" />
                        <div className="vehicle-card-skeleton__price ox-shimmer" />
                      </div>
                    </div>
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
                {latestVehicles.slice(0, 8).map((vehicle) => {
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
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="ox-home-confidence-v3">
            <h2>
              Por qué confiar en <span>oX</span> NEXMOV
            </h2>

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
                Precio, kilometraje, ubicación, financiación, dealer y
                comparación en un solo lugar.
              </span>
            </div>
          </aside>
        </section>

        <section className="ox-home-intelligence-grid-v3">
          <article className="ox-home-inventory-v3">
            <h2>Inventario en todo el país</h2>
            <p>La red más activa de Argentina.</p>

            <div className="ox-home-map-v3">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="ox-home-stats-v3">
              <div>
                <strong>{formatCount(homeStats.visibleDealers)}</strong>
                <span>Dealers activos</span>
              </div>
              <div>
                <strong>{formatCount(homeStats.totalActiveVehicles)}</strong>
                <span>Publicaciones activas</span>
              </div>
              <div>
                <strong>{formatCount(homeStats.activeLocations.length)}</strong>
                <span>Plazas con movimiento</span>
              </div>
              <div>
                <strong>{formatCount(homeStats.vehiclesWithImages)}</strong>
                <span>Imágenes cargadas hoy</span>
              </div>
            </div>

            <div className="ox-home-locations-v3">
              {homeStats.activeLocations.length > 0 ? (
                homeStats.activeLocations.map(([location, count]) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => goToSearch(location)}
                  >
                    {location}
                    <small>{count} activos</small>
                  </button>
                ))
              ) : (
                <span>Sin plazas activas para mostrar todavía.</span>
              )}
            </div>
          </article>

          <article className="ox-home-buyer-v3">
            <h2>Para compradores</h2>
            <p>Un camino simple para comprar mejor.</p>

            <ol>
              {buyerSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article className="ox-home-dealer-v3">
            <h2>Para dealers</h2>
            <p>Herramientas para vender mejor.</p>

            <ul>
              {dealerBenefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>

            <button type="button" onClick={() => onNavigate("joinNetwork")}>
              Sumate a la red
            </button>
          </article>
        </section>

        <section className="ox-home-bottom-trust-v3">
          <article>
            <strong>Confianza que se construye todos los días</strong>
            <span>
              Transparencia, tecnología y personas trabajando para que tomes
              siempre la mejor decisión.
            </span>
          </article>

          <article>
            <strong>Seguridad de datos</strong>
            <span>Protegemos tu información.</span>
          </article>

          <article>
            <strong>Red verificada</strong>
            <span>Dealers reales, no cualquiera.</span>
          </article>

          <article>
            <strong>Tecnología propia</strong>
            <span>Plataforma estable y moderna.</span>
          </article>

          <article>
            <strong>Soporte real</strong>
            <span>Personas que te ayudan.</span>
          </article>
        </section>
      </div>
    </section>

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
    </>
  );
}
