import { useEffect, useMemo, useRef, useState } from "react";
import VehicleCardPublic from "../../components/cards/VehicleCardPublic.jsx";
import { listPublicActiveDealers } from "../../services/dealers.service.js";
import { listPublicLatestVehicles } from "../../services/vehicles.service.js";

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
  if (vehicle.price && vehicle.price <= 15000000) {
    return {
      label: "Oportunidad",
      text: "Precio competitivo",
    };
  }

  if (vehicle.kilometers <= 30000) {
    return {
      label: "Menor uso",
      text: "Kilometraje atractivo",
    };
  }

  if (vehicle.year >= 2022) {
    return {
      label: "Reciente",
      text: "Modelo nuevo",
    };
  }

  if (index === 0) {
    return {
      label: "Nuevo ingreso",
      text: "Recién publicado",
    };
  }

  return {
    label: "Disponible",
    text: "Unidad activa",
  };
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);

    if (!key) return acc;

    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

const homeHeroQuickSearches = [
  "SUV financiada",
  "Primer auto",
  "0km entrega inmediata",
  "Bajo consumo",
  "Pick up diesel",
  "Familiar 7 asientos",
];

const homeHeroTrustItems = [
  {
    title: "Dealers verificados",
    text: "Red validada",
    icon: "◇",
  },
  {
    title: "Comparador real",
    text: "Hasta 4 vehículos",
    icon: "⇄",
  },
  {
    title: "Consultas trazables",
    text: "Antes del WhatsApp",
    icon: "◎",
  },
  {
    title: "Financiación clara",
    text: "Sin sorpresas",
    icon: "$",
  },
  {
    title: "Publicaciones revisadas",
    text: "Datos coherentes",
    icon: "✓",
  },
];

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
      const nextScroll = carousel.scrollLeft + 356;

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

    const brands = countBy(latestVehicles, (vehicle) => vehicle.brand);
    const models = countBy(latestVehicles, (vehicle) => {
      if (!vehicle.brand || !vehicle.model) return "";
      return `${vehicle.brand} ${vehicle.model}`;
    });

    const activeLocations = sortEntriesByCount(cities).slice(0, 5);
    const activeBrands = sortEntriesByCount(brands).slice(0, 5);
    const activeModels = sortEntriesByCount(models).slice(0, 3);

    const averagePrice =
      latestVehicles.length > 0
        ? latestVehicles.reduce(
            (sum, vehicle) => sum + Number(vehicle.price || 0),
            0
          ) / latestVehicles.length
        : 0;

    const vehiclesWithImages = latestVehicles.filter(
      (vehicle) => vehicle.mainImageUrl || vehicle.imageUrl
    ).length;

    return {
      totalActiveVehicles,
      visibleDealers: publicDealers.length,
      activeLocations,
      activeBrands,
      activeModels,
      averagePrice,
      vehiclesWithImages,
    };
  }, [publicDealers, latestVehicles]);

  function scrollLatestVehicles(direction) {
    const carousel = latestVehiclesCarouselRef.current;
    if (!carousel) return;

    const amount = 356;

    carousel.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }
    function handleHeroSearch(event) {
    event.preventDefault();
  
    onNavigate("search", {
      query: heroSearchText,
    });
  }

  return (
    <section className="page-section">
      <div className="container panel public-page-panel">
         <div className="ox-home-hero-v2">
  <div className="ox-home-hero-copy">
    <p className="ox-home-hero-eyebrow">La plataforma líder en Argentina</p>

    <h1>
      Comprá mejor.
      <br />
      Vendé mejor.
      <br />
      Decidí con <span>más información.</span>
    </h1>

    <p className="ox-home-hero-lead">
      Datos reales, dealers verificados y herramientas para tomar siempre la
      mejor decisión.
    </p>

    <form className="ox-home-hero-search" onSubmit={handleHeroSearch}>
      <input
        value={heroSearchText}
        onChange={(event) => setHeroSearchText(event.target.value)}
        placeholder="¿Qué vehículo estás buscando?"
      />

      <button type="submit">Buscar</button>
    </form>

    <div className="ox-home-hero-chips">
      {homeHeroQuickSearches.map((query) => (
        <button
          key={query}
          type="button"
          onClick={() =>
            onNavigate("search", {
              query,
            })
          }
        >
          {query}
        </button>
      ))}
    </div>

    <div className="ox-home-trust-strip">
      {homeHeroTrustItems.map((item) => (
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

      <div className="ox-home-hero-visual">
  <div className="ox-home-vehicle-frame">
    {featuredVehicle?.mainImageUrl || featuredVehicle?.imageUrl ? (
      <img
        className="ox-home-vehicle-image"
        src={featuredVehicle.mainImageUrl || featuredVehicle.imageUrl}
        alt={`${featuredVehicle.brand} ${featuredVehicle.model}`}
      />
    ) : (
      <div className="ox-home-vehicle-placeholder">
        <span>oX NEXMOV</span>
        <strong>Vehículo destacado</strong>
      </div>
    )}
  </div>

  <article className="ox-home-highlight-card">
    <span>{featuredSignal?.label || "Destacado"}</span>

    <h3>
      {featuredVehicle
        ? `${featuredVehicle.brand} ${featuredVehicle.model}`
        : "Unidad seleccionada"}
    </h3>

    <p>
      {featuredVehicle
        ? `${featuredVehicle.version || "Sin versión"} · ${
            featuredVehicle.year || "Sin año"
          } · ${featuredVehicle.city || "Ubicación a confirmar"}`
        : "Datos reales · Dealer verificado · Consulta trazable"}
    </p>

    <strong>
      {featuredVehicle ? formatARS(featuredVehicle.price) : "Menos incertidumbre."}
    </strong>

    {featuredDealer && (
      <small>
        {featuredDealer.commercialName} · {getPlanLabel(featuredDealer.plan)}
      </small>
    )}

    <button
      type="button"
      onClick={() =>
        onNavigate("search", {
          query: featuredVehicle
            ? `${featuredVehicle.brand} ${featuredVehicle.model}`
            : heroSearchText,
        })
      }
    >
      Ver publicaciones
    </button>
  </article>
</div>
 
 </div>

<div className="admin-section-block ox-home-section ox-home-latest-section">
          <div className="buyer-section-head ox-home-section-head">

            <div>
              <p className="eyebrow">Últimos ingresos</p>
              <h2>Vehículos recién publicados en la red.</h2>
              <p>
                Un vistazo rápido a las unidades más recientes cargadas por
                dealers activos dentro de oX NEXMOV.
              </p>
            </div>

            <div className="admin-action-row">
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => scrollLatestVehicles("prev")}
              >
                ←
              </button>

              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => scrollLatestVehicles("next")}
              >
                →
              </button>

              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => onNavigate("search")}
              >
                Ver todos
              </button>
            </div>
          </div>

          {loadingLatestVehicles && (
            <div className="auth-message">Cargando últimos ingresos...</div>
          )}

          {latestVehiclesError && (
            <div className="auth-warning">{latestVehiclesError}</div>
          )}

          {!loadingLatestVehicles &&
            !latestVehiclesError &&
            latestVehicles.length === 0 && (
              <div className="empty-state">
                Próximamente mostraremos aquí los últimos vehículos ingresados.
              </div>
            )}

          {latestVehicles.length > 0 && (
            <div
              ref={latestVehiclesCarouselRef}
              className="latest-vehicles-carousel ox-home-latest-carousel"
              style={{
                display: "grid",
                gridAutoFlow: "column",
                gridAutoColumns: "minmax(280px, 340px)",
                gap: "16px",
                overflowX: "auto",
                paddingBottom: "4px",
                scrollSnapType: "x mandatory",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {latestVehicles.map((vehicle) => {
                const dealer = buildDealerForVehicle(vehicle);

                return (
                  <div key={vehicle.id} className="ox-home-latest-card-wrap">                                         
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

        <div className="admin-section-block ox-home-section ox-home-dealers-section">
          <div className="buyer-section-head ox-home-section-head">
            <div>
              <p className="eyebrow">Red activa</p>
              <h2>Dealers que trabajan con oX NEXMOV.</h2>
              <p>
                Agencias y concesionarias activas dentro de la red, con identidad
                institucional, publicaciones reales y operación trazable.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => onNavigate("joinNetwork")}
            >
              Sumate a la red
            </button>
          </div>

          {loadingDealers && (
            <div className="auth-message">Cargando dealers activos...</div>
          )}

          {dealersError && <div className="auth-warning">{dealersError}</div>}

          {!loadingDealers && !dealersError && publicDealers.length === 0 && (
            <div className="empty-state">
              Próximamente mostraremos aquí los dealers activos de la red con su
              imagen institucional.
            </div>
          )}

          {publicDealers.length > 0 && (
            <div className="dealer-modules-grid ox-home-dealers-grid">
              {publicDealers.slice(0, 8).map((dealer) => (
                <article
                  key={dealer.id}
                  className={`dealer-module-card ox-home-dealer-card rank-${dealer.plan || "inicio"}`}
                >
                  {dealer.logo ? (
                    <img
                      src={dealer.logo}
                      alt={`Imagen institucional de ${dealer.commercialName}`}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "16px",
                        border: "1px solid var(--ox-border)",
                        background: "var(--ox-card-2)",
                        marginBottom: "14px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "120px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "16px",
                        border: "1px solid var(--ox-border)",
                        background: "var(--ox-card-2)",
                        color: "var(--ox-muted)",
                        marginBottom: "14px",
                        textAlign: "center",
                        padding: "12px",
                      }}
                    >
                      Dealer activo
                    </div>
                  )}

                  <h3>{dealer.commercialName}</h3>

                  <p>
                    {dealer.city || "Ciudad no informada"}
                    {dealer.province ? `, ${dealer.province}` : ""}
                  </p>

                  <div className="admin-benefits-list">
                    <span>{getPlanLabel(dealer.plan)}</span>
                    <span>
                      {dealer.activeVehiclesCount}{" "}
                      {dealer.activeVehiclesCount === 1
                        ? "vehículo activo"
                        : "vehículos activos"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="admin-section-block ox-home-section ox-home-signals-section">
          <div className="buyer-section-head ox-home-section-head">
            <div>
              <p className="eyebrow">Señales destacadas</p>
              <h2>Señales destacadas del sistema.</h2>
              <p>
                Una selección corta de oportunidades con mejor lectura comercial
                hoy, calculadas a partir de las unidades activas más recientes.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => onNavigate("search")}
            >
              Explorar señales
            </button>
          </div>

          {latestVehicles.length === 0 ? (
            <div className="empty-state">
              Cuando haya unidades activas, mostraremos señales comerciales
              destacadas.
            </div>
          ) : (
            <div className="dealer-modules-grid ox-home-signals-grid">
              {latestVehicles.slice(0, 4).map((vehicle, index) => {
                const signal = getVehicleSignal(vehicle, index);

                return (
                  <article className="dealer-module-card ox-home-signal-card" key={vehicle.id}>
                    {vehicle.mainImageUrl || vehicle.imageUrl ? (
                      <img
                        src={vehicle.mainImageUrl || vehicle.imageUrl}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        style={{
                          width: "100%",
                          height: "130px",
                          objectFit: "cover",
                          borderRadius: "16px",
                          border: "1px solid var(--ox-border)",
                          background: "var(--ox-card-2)",
                          marginBottom: "14px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "130px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "16px",
                          border: "1px solid var(--ox-border)",
                          background: "var(--ox-card-2)",
                          color: "var(--ox-muted)",
                          marginBottom: "14px",
                          textAlign: "center",
                          padding: "12px",
                        }}
                      >
                        {vehicle.brand} {vehicle.model}
                      </div>
                    )}

                    <div className="admin-benefits-list">
                      <span>{signal.label}</span>
                      <span>{signal.text}</span>
                    </div>

                    <h3>
                      {vehicle.brand} {vehicle.model}
                    </h3>

                    <p>
                      {vehicle.version || "Sin versión"} ·{" "}
                      {vehicle.year || "Sin año"} ·{" "}
                      {vehicle.city || "Sin ciudad"}
                    </p>

                    <strong
                      style={{
                        display: "block",
                        color: "var(--ox-cyan)",
                        fontSize: "1.25rem",
                        marginTop: "10px",
                      }}
                    >
                      {formatARS(vehicle.price)}
                    </strong>

                    <button type="button" onClick={() => onNavigate("search")}>
                      Consultar disponibilidad
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

       <div className="admin-section-block ox-home-section ox-home-coverage-section">
         <div className="buyer-section-head ox-home-section-head">
            <div>
              <p className="eyebrow">Cobertura comercial</p>
              <h2>Inventario distribuido en plazas reales.</h2>
              <p>
                La red muestra dónde hay oferta activa y qué plazas empiezan a
                concentrar movimiento dentro de oX NEXMOV.
              </p>
            </div>
          </div>

          <div className="admin-kpi-grid ox-home-coverage-kpi-grid">
            <article className="admin-kpi-card ox-home-coverage-kpi">
              <span>Concesionarias activas</span>
              <strong>{formatCount(homeStats.visibleDealers)}</strong>
              <p>Dealers visibles con operación vigente.</p>
            </article>

            <article className="admin-kpi-card ox-home-coverage-kpi">
              <span>Unidades activas</span>
              <strong>{formatCount(homeStats.totalActiveVehicles)}</strong>
              <p>Publicaciones visibles dentro del mercado.</p>
            </article>

            <article className="admin-kpi-card ox-home-coverage-kpi">
              <span>Plazas con movimiento</span>
              <strong>{formatCount(homeStats.activeLocations.length)}</strong>
              <p>Ciudades o zonas con inventario activo.</p>
            </article>

            <article className="admin-kpi-card ox-home-coverage-kpi">
              <span>Imágenes cargadas</span>
              <strong>{formatCount(homeStats.vehiclesWithImages)}</strong>
              <p>Últimos ingresos con imagen principal.</p>
            </article>
          </div>

          <div className="dealer-modules-grid ox-home-coverage-grid">
            <article className="dealer-module-card ox-home-coverage-card">
              <h3>Plazas con más movimiento</h3>

              {homeStats.activeLocations.length === 0 ? (
                <p>Sin plazas activas para mostrar todavía.</p>
              ) : (
                <div className="admin-benefits-list">
                  {homeStats.activeLocations.map(([location, count]) => (
                    <span key={location}>
                      {location} · {count}
                    </span>
                  ))}
                </div>
              )}
            </article>

            <article className="dealer-module-card ox-home-coverage-card">
              <h3>Marcas con presencia reciente</h3>

              {homeStats.activeBrands.length === 0 ? (
                <p>Sin marcas activas para mostrar todavía.</p>
              ) : (
                <div className="admin-benefits-list">
                  {homeStats.activeBrands.map(([brand, count]) => (
                    <span key={brand}>
                      {brand} · {count}
                    </span>
                  ))}
                </div>
              )}
            </article>

            <article className="dealer-module-card ox-home-coverage-card">
              <h3>Modelos recientes</h3>

              {homeStats.activeModels.length === 0 ? (
                <p>Sin modelos activos para mostrar todavía.</p>
              ) : (
                <div className="admin-benefits-list">
                  {homeStats.activeModels.map(([model, count]) => (
                    <span key={model}>
                      {model} · {count}
                    </span>
                  ))}
                </div>
              )}
            </article>

            <article className="dealer-module-card ox-home-coverage-card">
              <h3>Precio promedio visible</h3>
              <p>
                Referencia rápida calculada sobre los últimos ingresos visibles.
              </p>
              <strong
                style={{
                  color: "var(--ox-cyan)",
                  fontSize: "1.35rem",
                }}
              >
                {formatARS(homeStats.averagePrice)}
              </strong>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Pulso del mercado</p>
              <h2>Lecturas rápidas para decidir mejor.</h2>
              <p>
                Una vista resumida de actividad comercial reciente, útil para
                entender qué se está moviendo dentro de la red.
              </p>
            </div>
          </div>

          <div className="dealer-modules-grid">
            <article className="dealer-module-card">
              <h3>Nuevos ingresos</h3>
              <p>
                {formatCount(latestVehicles.length)} unidades recientes cargadas
                por dealers activos.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Red identificable</h3>
              <p>
                {formatCount(publicDealers.length)} concesionarias con identidad
                institucional visible.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Consulta con trazabilidad</h3>
              <p>
                Al contactar una unidad, la acción se registra para ordenar el
                seguimiento comercial.
              </p>
            </article>

            <article className="dealer-module-card rank-pro">
              <h3>Buena oportunidad</h3>
              <p>
                Unidades recientes, dealers activos y señales de mercado para
                comprar con más contexto.
              </p>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Cómo avanzar</p>
              <h2>Explorá, compará y consultá con trazabilidad.</h2>
              <p>
                La plataforma ordena la búsqueda para que puedas evaluar opciones,
                comparar vehículos y contactar dealers identificados con más
                claridad.
              </p>
            </div>
          </div>

          <div className="dealer-modules-grid">
            <article className="dealer-module-card">
              <h3>Buscar con criterio</h3>
              <p>
                Filtrá vehículos reales por marca, modelo, precio, ubicación,
                financiación y señales comerciales.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Comparar opciones</h3>
              <p>
                Revisá unidades lado a lado para entender diferencias de precio,
                año, kilometraje y propuesta comercial.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Consultar con registro</h3>
              <p>
                Al contactar, la consulta queda trazada para mejorar el seguimiento
                y evitar contactos anónimos.
              </p>
            </article>

            <article className="dealer-module-card">
              <h3>Vender tu vehículo</h3>
              <p>
                También podés cargar tu intención de venta para que la plataforma
                revise oportunidades con dealers habilitados.
              </p>
            </article>
          </div>
        </div>

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <p className="eyebrow">Cierre comercial</p>
              <h2>Encontrá una opción con mejor lectura.</h2>
              <p>
                oX NEXMOV no busca sumar ruido: busca ordenar datos, dealers,
                publicaciones y oportunidades para que cada decisión tenga más
                contexto.
              </p>
            </div>

            <div className="admin-action-row">
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => onNavigate("search")}
              >
                Explorar vehículos
              </button>

              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => onNavigate("zeroKm")}
              >
                Evaluar financiación
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}