import "../../styles/joinNetwork.css";
import { DEALER_PLANS } from "../../config/plans.js";

import { useEffect, useMemo, useState } from "react";
import { listPublicActiveDealers } from "../../services/dealers.service.js";

const dealerSignals = [
  "Dealers verificados",
  "Leads trazables",
  "Publicaciones con contexto",
];

const dealerChallenges = [
  {
    title: "Publicar no alcanza",
    text: "El comprador compara, duda, vuelve y necesita señales claras antes de avanzar con una consulta real.",
  },
  {
    title: "La confianza define el contacto",
    text: "Una publicación ordenada, con datos coherentes y trazabilidad comercial, mejora la percepción del dealer.",
  },
  {
    title: "Cada consulta tiene valor",
    text: "Registrar el lead antes del WhatsApp ayuda a cuidar el seguimiento y evita perder oportunidades comerciales.",
  },
];

const proposalCards = [
  {
    title: "Publicaciones premium",
    text: "Vehículos presentados con datos clave, fotos, precio, ubicación y contexto para decidir mejor.",
  },
  {
    title: "Leads trazables",
    text: "Cada consulta queda registrada antes de abrir el canal de contacto.",
  },
  {
    title: "Comparador para compradores",
    text: "El usuario puede comparar opciones y llegar al contacto con mayor claridad.",
  },
  {
    title: "Señales comerciales",
    text: "Badges, ranking y presencia visual ayudan a diferenciar la operación del dealer.",
  },
  {
    title: "Panel dealer mobile",
    text: "Una experiencia tipo app para revisar publicaciones, leads, tickets, plan y cupos.",
  },
  {
    title: "Soporte interno",
    text: "Tickets y comunicación con administración para ordenar correcciones y consultas.",
  },
];

const planPositioning = {
  inicio: {
    cup: "Hasta 10 publicaciones por período",
    audience: "Para agencias que quieren empezar con presencia profesional.",
    visibility: "Presencia inicial con señales básicas y operación trazable.",
    features: [
      "Panel dealer operativo.",
      "Publicaciones comparables.",
      "Leads trazables.",
      "Señales básicas.",
      "Soporte interno.",
    ],
  },
  pro: {
    cup: "Hasta 30 publicaciones por período",
    audience:
      "Para dealers con actividad constante que necesitan más capacidad y mejor presencia comercial.",
    visibility: "Más capacidad de publicación y mejor presencia visual.",
    features: [
      "Más capacidad de publicación.",
      "Mejor presencia visual.",
      "Métricas estándar.",
      "Herramientas habilitadas según configuración.",
      "Beneficios adicionales si admin lo habilita.",
    ],
  },
  elite: {
    cup: "Hasta 50 publicaciones por período",
    audience: "Para operaciones con mayor volumen y seguimiento comercial.",
    visibility: "Mayor diferenciación visual, sin publicación ilimitada.",
    features: [
      "Mayor diferenciación visual.",
      "Señales premium.",
      "Métricas avanzadas.",
      "Oportunidades comerciales si corresponde.",
      "Herramientas comerciales avanzadas.",
    ],
  },
  platinum: {
    cup: "Publicaciones ilimitadas",
    audience:
      "Para equipos de alto volumen que necesitan máxima capacidad dentro de la red.",
    visibility: "Nivel superior de presencia, señales y herramientas.",
    features: [
      "Máxima diferenciación visual dentro de la red.",
      "Señales completas.",
      "Métricas completas.",
      "Herramientas completas.",
      "Presencia superior dentro del ecosistema.",
    ],
  },
};

const workflowSteps = [
  "Solicitás el alta.",
  "Revisamos la agencia.",
  "Activamos tu plan.",
  "Cargás publicaciones.",
  "Recibís consultas trazables.",
  "Gestionás desde tu panel.",
];

const planOrder = ["inicio", "pro", "elite", "platinum"];

const publicDealerPlanLabels = {
  inicio: "Dealer verificado",
  pro: "Dealer Pro",
  elite: "Dealer Elite",
  platinum: "Dealer Platinum",
};

const publicDealerPlanClass = {
  inicio: "verified",
  pro: "pro",
  elite: "elite",
  platinum: "platinum",
};

function getDealerInitials(name) {
  return String(name || "oX")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDealerLocation(dealer) {
  return [dealer.city, dealer.province].filter(Boolean).join(", ");
}

function mapPublicDealerCard(dealer) {
  const plan = publicDealerPlanLabels[dealer.plan] ? dealer.plan : "inicio";
  const name = dealer.commercialName || dealer.name || "Dealer verificado";

  return {
    id: dealer.id,
    name,
    initials: getDealerInitials(name),
    location: formatDealerLocation(dealer),
    logo: dealer.logo || dealer.logoUrl || dealer.imageUrl || null,
    planClass: publicDealerPlanClass[plan],
    badge: publicDealerPlanLabels[plan],
    activeVehiclesCount: Number(dealer.activeVehiclesCount || 0),
  };
}

export default function JoinNetwork({ onNavigate }) {
  const [networkDealers, setNetworkDealers] = useState([]);
  const [isLoadingNetworkDealers, setIsLoadingNetworkDealers] = useState(true);

  const plans = planOrder
    .map((planId) => {
      const plan = DEALER_PLANS[planId];
      const positioning = planPositioning[planId];

      return plan && positioning ? { ...plan, ...positioning } : null;
    })
    .filter(Boolean);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicDealers() {
      setIsLoadingNetworkDealers(true);

      let dealers = [];

      try {
        const response = await listPublicActiveDealers();
        dealers = response.dealers || [];
      } catch {
        dealers = [];
      }

      if (!isMounted) return;

      setNetworkDealers(
        (dealers || [])
          .map(mapPublicDealerCard)
          .filter((dealer) => dealer.id && dealer.name)
          .slice(0, 8)
      );
      setIsLoadingNetworkDealers(false);
    }

    loadPublicDealers();

    return () => {
      isMounted = false;
    };
  }, []);

  const publicDealers = useMemo(() => networkDealers, [networkDealers]);

  return (
    <section className="page-section join-network-page">
      <div className="container panel join-network-panel">
        <section className="join-network-hero">
          <div className="join-network-hero-copy">
            <p className="eyebrow">Red de dealers</p>

            <h1>
              Sumá tu agencia a una nueva forma de{" "}
              <span>comercializar vehículos.</span>
            </h1>

            <p>
              oX NEXMOV reúne publicaciones, consultas, herramientas
              comerciales y señales de confianza para que cada dealer trabaje
              con más claridad.
            </p>

            <div className="join-network-actions">
              <button type="button" onClick={() => onNavigate?.("login")}>
                Quiero sumar mi agencia
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => onNavigate?.("search")}
              >
                Ver publicaciones
              </button>
            </div>
          </div>

          <aside className="join-network-hero-card">
            <span>Red premium</span>
            <strong>Más claridad para vender mejor</strong>
            <div className="join-network-signal-list">
              {dealerSignals.map((signal) => (
                <small key={signal}>{signal}</small>
              ))}
            </div>
          </aside>
        </section>

        <section className="join-network-problem">
          <div className="join-network-section-head">
            <p className="eyebrow">Contexto comercial</p>
            <h2>Una red pensada para vender con más claridad.</h2>
            <p>
              Presencia, señales comerciales y trazabilidad reunidas en una
              experiencia que mejora la percepción de cada agencia.
            </p>
          </div>

          <div className="join-network-values">
            {dealerChallenges.map((item) => (
              <article key={item.title} className="join-network-value-card">
                <span>Desafío</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="join-network-section join-network-proposal">
          <div className="join-network-section-head">
            <p className="eyebrow">Propuesta oX NEXMOV</p>
            <h2>
              Una red donde el comprador decide con claridad y el dealer trabaja
              con mejores herramientas.
            </h2>
            <p>
              Publicaciones claras, leads trazables y herramientas comerciales
              para convertir mejor cada oportunidad.
            </p>
          </div>

          <div className="join-network-proposal-grid">
            {proposalCards.map((item) => (
              <article key={item.title} className="join-network-proposal-card">
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <p className="join-network-commercial-note">
            oX NEXMOV no garantiza volumen de consultas ni ventas. Las
            herramientas disponibles dependen del plan contratado, beneficios
            habilitados y estado de la beta comercial.
          </p>
        </section>

        <section className="join-network-section join-network-dealers">
          <div className="join-network-section-head">
            <p className="eyebrow">Red activa</p>
            <h2>Dealers que ya forman parte de la red</h2>
            <p>
              Agencias verificadas que publican, gestionan consultas y trabajan
              con herramientas comerciales dentro de oX NEXMOV.
            </p>
          </div>

          {isLoadingNetworkDealers ? (
            <div
              className="join-network-dealer-grid"
              aria-label="Cargando dealers de la red"
            >
              {[0, 1, 2, 3].map((item) => (
                <article
                  key={item}
                  className="join-network-dealer-card join-network-dealer-card-loading"
                >
                  <div className="join-network-dealer-logo ox-shimmer" />
                  <div className="join-network-dealer-skeleton-bar join-network-dealer-skeleton-bar--short ox-shimmer" />
                  <div className="join-network-dealer-skeleton-bar join-network-dealer-skeleton-bar--wide ox-shimmer" />
                  <div className="join-network-dealer-skeleton-bar ox-shimmer" />
                </article>
              ))}
            </div>
          ) : publicDealers.length > 0 ? (
            <div className="join-network-dealer-grid">
              {publicDealers.map((dealer) => (
                <article
                  key={dealer.id}
                  className={`join-network-dealer-card join-network-dealer-${dealer.planClass}`}
                >
                    {dealer.logo ? (
                    <img
                      className="join-network-dealer-img"
                      src={dealer.logo}
                      alt={`Imagen institucional de ${dealer.name}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="join-network-dealer-initials">
                      <span>{dealer.initials}</span>
                    </div>
                  )}

                  <div className="join-network-dealer-content">
                    <span className="join-network-dealer-badge">
                      {dealer.badge}
                    </span>
                    <strong>{dealer.name}</strong>
                    <p>{dealer.location || "Red oX NEXMOV"}</p>
                  </div>

                  <small>Dealer verificado dentro de la red oX.</small>

                  {dealer.activeVehiclesCount > 0 && (
                    <span className="join-network-dealer-count">
                      {dealer.activeVehiclesCount} publicaciones activas
                    </span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="join-network-dealers-empty">
              <strong>
                Estamos incorporando agencias verificadas a la red.
              </strong>
              <p>
                Pronto vas a ver aquí dealers activos con presencia
                institucional dentro de oX NEXMOV.
              </p>
            </div>
          )}

        </section>

        <section className="join-network-section join-network-plan-section">
          <div className="join-network-section-head">
            <p className="eyebrow">Planes dealer</p>
            <h2>Elegí una escala comercial acorde a tu operación.</h2>
            <p>
              Sin precios publicados: cada plan define cupos, señales,
              visibilidad y herramientas según el nivel de participación dentro
              de la red.
            </p>
          </div>

          <div className="join-network-plans">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`join-network-plan-card join-network-plan-${plan.rankTheme}`}
              >
                <span>{plan.rankLabel}</span>
                <strong>{plan.cup}</strong>
                <p>{plan.audience}</p>

                <div className="join-network-plan-meta">
                  <small>{plan.visibility}</small>
                </div>

                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <button type="button" onClick={() => onNavigate?.("login")}>
                  Solicitar este plan
                </button>
              </article>
            ))}
          </div>

          <p className="join-network-commercial-note">
            Los planes definen cupos, visibilidad y herramientas de trabajo. La
            contratación de un plan no implica resultados comerciales
            garantizados.
          </p>
        </section>

        <section className="join-network-section join-network-difference">
          <div className="join-network-section-head">
            <p className="eyebrow">Diferenciación por plan</p>
            <h2>Más herramientas comerciales, sin confundir al comprador.</h2>
            <p>
              Todos los planes permiten que el comprador compare vehículos. La
              diferencia entre planes no bloquea funciones útiles al comprador:
              se expresa en cupos, señales, prioridad visual, métricas y
              herramientas comerciales.
            </p>
          </div>
        </section>

        <section className="join-network-section">
          <div className="join-network-section-head">
            <p className="eyebrow">Alta dealer</p>
            <h2>Un ingreso simple a una operación más ordenada.</h2>
          </div>

          <div className="join-network-steps">
            {workflowSteps.map((step, index) => (
              <article key={step} className="join-network-step-card">
                <strong>{index + 1}</strong>
                <div>
                  <h3>{step}</h3>
                  <p>
                    {index === 0
                      ? "La agencia inicia el alta desde el acceso operativo."
                      : "Cada etapa suma contexto para trabajar mejor dentro de la red."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="join-network-final">
          <div>
            <p className="eyebrow">Próximo paso</p>
            <h2>Convertí tu stock en una experiencia de compra más clara.</h2>
            <p>
              Solicitá el alta como dealer y prepará tu operación para trabajar
              con publicaciones premium, leads trazables y una red diseñada para
              vender con más confianza.
            </p>
          </div>

          <div className="join-network-final-actions">
            <button type="button" onClick={() => onNavigate?.("login")}>
              Solicitar alta como dealer
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate?.("search")}
            >
              Ver publicaciones
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
