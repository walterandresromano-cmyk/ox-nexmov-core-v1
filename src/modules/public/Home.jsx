import { useEffect, useMemo, useRef, useState } from "react";
import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import { listPublicActiveDealers } from "../../services/dealers.service.js";
import { listPublicLatestVehicles } from "../../services/vehicles.service.js";

const quickSearches = [
  "SUV financiada",
  "Primer auto",
  "0km entrega inmediata",
  "Bajo consumo",
  "Pick up diesel",
  "Familiar 7 asientos",
];

const trustItems = [
  { title: "Dealers verificados", text: "Red validada", icon: "◇" },
  { title: "Comparador real", text: "Hasta 4 vehículos", icon: "⇄" },
  { title: "Consultas trazables", text: "Antes del WhatsApp", icon: "◎" },
  { title: "Financiación clara", text: "Sin sorpresas", icon: "$" },
  { title: "Publicaciones revisadas", text: "Datos coherentes", icon: "✓" },
];

const confidenceItems = [
  {
    title: "Dealers verificados",
    text: "Publican solo quienes cumplen nuestros estándares.",
  },
  {
    title: "Comparador real",
    text: "Compará hasta 4 vehículos con datos clave lado a lado.",
  },
  {
    title: "Consultas trazables",
    text: "Cada contacto queda registrado antes del WhatsApp.",
  },
  {
    title: "Financiación clara",
    text: "Entrega, cuotas, tasa y condiciones siempre visibles.",
  },
  {
    title: "Publicaciones revisadas",
    text: "Datos coherentes. Si algo no cuadra, se revisa.",
  },
  {
    title: "Soporte real",
    text: "Personas que te ayudan cuando se necesita resolver.",
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
    phone: "",
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

export default function Home({ onNavigate, appActions = {} }) {
  const [publicDealers, setPublicDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [dealersError, setDealersError] = useState("");

  const [latestVehicles, setLatestVehicles] = useState([]);
  const [loadingLatestVehicles, setLoadingLatestVehicles] = useState(true);
  const [latestVehiclesError, setLatestVehiclesError] = useState("");
  const [heroSearchText, setHeroSearchText] = useState("");

  const latestVehiclesCarouselRef = useRef(null);

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

  useEffect(() => {
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
          error.message || "No se pudieron cargar los últimos ingresos."
        );
        setLoadingLatestVehicles(false);
        return;
      }

      setLatestVehicles(vehicles || []);
      setLoadingLatestVehicles(false);
    }

    loadPublicDealers();
    loadLatestVehicles();
  }, []);

  useEffect(() => {
    if (latestVehicles.length <= 1) return;

    const carousel = latestVehiclesCarouselRef.current;
    if (!carousel) return;

    const interval = window.setInterval(() => {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      const nextScroll = carousel.scrollLeft + 330;

      carousel.scrollTo({
        left: nextScroll >= maxScroll ? 0 : nextScroll,
        behavior: "smooth",
      });
    }, 4200);

    return () => window.clearInterval(interval);
  }, [latestVehicles.length]);

  const featuredVehicle = latestVehicles[0] || null;
  const featuredDealer = featuredVehicle
    ? buildDealerForVehicle(featuredVehicle)
    : null;
  const featuredSignal = featuredVehicle
    ? getVehicleSignal(featuredVehicle, 0)
    : null;

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

    carousel.scrollBy({
      left: direction === "next" ? 330 : -330,
      behavior: "smooth",
    });
  }

  return (
    <section className="page-section ox-home-page-v3">
      <div className="container ox-home-shell-v3">
        <section className="ox-home-hero-v3">
          <div className="ox-home-hero-copy-v3">
            <p className="ox-home-eyebrow-v3">
              La plataforma líder en Argentina
            </p>

            <h1>
              Comprá mejor.
              <br />
              Vendé mejor.
              <br />
              Decidí con <span>más información.</span>
            </h1>

            <p>
              Datos reales, dealers verificados y herramientas para tomar siempre
              la mejor decisión.
            </p>

            <form className="ox-home-search-v3" onSubmit={handleHeroSearch}>
              <input
                value={heroSearchText}
                onChange={(event) => setHeroSearchText(event.target.value)}
                placeholder="¿Qué vehículo estás buscando?"
              />

              <button type="submit">Buscar</button>
            </form>

            <div className="ox-home-chips-v3">
              {quickSearches.map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => goToSearch(query)}
                >
                  {query}
                </button>
              ))}
            </div>

            <div className="ox-home-trust-strip-v3">
              {trustItems.map((item) => (
                <article key={item.title}>
                  <span>{item.icon}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="ox-home-hero-stage-v3">
            <div className="ox-home-neon-frame-v3"></div>

            <img
              className="ox-home-hero-car-v3"
              src="/hero-car.png"
              alt="Vehículo institucional oX NEXMOV"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />

            <div className="ox-home-hero-car-fallback-v3">
              <span>oX NEXMOV</span>
              <strong>Vehículo institucional</strong>
            </div>
          </div>

          <aside className="ox-home-featured-card-v3">
            <span className="ox-home-featured-badge-v3">
              {featuredSignal?.label || "Destacado"}
            </span>

            <h2>
              {featuredVehicle
                ? `${featuredVehicle.brand} ${featuredVehicle.model}`
                : "Unidad destacada"}
            </h2>

            <p>
              {featuredVehicle
                ? `${featuredVehicle.version || "Sin versión"} · ${
                    featuredVehicle.year || "Sin año"
                  } · ${formatKm(featuredVehicle.kilometers || featuredVehicle.km)}`
                : "Publicación real con lectura comercial."}
            </p>

            <strong>
              {featuredVehicle ? formatARS(featuredVehicle.price) : "Consultar"}
            </strong>

            <small>
              {featuredDealer
                ? `${featuredDealer.commercialName} · ${getPlanLabel(
                    featuredDealer.plan
                  )}`
                : "Dealer verificado"}
            </small>

            <em>{featuredSignal?.text || "Buena lectura comercial"}</em>

            <button
              type="button"
              onClick={() =>
                goToSearch(
                  featuredVehicle
                    ? `${featuredVehicle.brand} ${featuredVehicle.model}`
                    : ""
                )
              }
            >
              Ver detalle
            </button>
          </aside>
        </section>

        {latestVehiclesError && (
          <div className="auth-warning">{latestVehiclesError}</div>
        )}

        {dealersError && <div className="auth-warning">{dealersError}</div>}

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
              <div className="auth-message">Cargando últimos ingresos...</div>
            )}

            {!loadingLatestVehicles && latestVehicles.length === 0 && (
              <div className="empty-state">
                Próximamente mostraremos vehículos destacados.
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
                  <span>◇</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="ox-home-confidence-cta-v3">
              <strong>Menos incertidumbre. Más decisión.</strong>
              <span>Comprá con datos. Compará con criterio.</span>
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
  );
}