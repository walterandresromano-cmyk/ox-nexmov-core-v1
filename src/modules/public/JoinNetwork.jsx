import { DEALER_PLANS } from "../../config/plans.js";

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

export default function JoinNetwork({ onNavigate }) {
  const plans = planOrder
    .map((planId) => {
      const plan = DEALER_PLANS[planId];
      const positioning = planPositioning[planId];

      return plan && positioning ? { ...plan, ...positioning } : null;
    })
    .filter(Boolean);

  return (
    <section className="page-section join-network-page">
      <div className="container panel join-network-panel">
        <section className="join-network-hero">
          <div className="join-network-hero-copy">
            <p className="eyebrow">Red comercial oX NEXMOV</p>

            <h1>
              Sumá tu agencia a una red automotriz{" "}
              <span>más clara, confiable e inteligente.</span>
            </h1>

            <p>
              Publicá mejor, recibí leads trazables y diferenciá tus vehículos
              con señales comerciales que ayudan al comprador a decidir.
            </p>

            <div className="join-network-actions">
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
            <p className="eyebrow">El problema</p>
            <h2>Hoy el dealer necesita más que una vidriera digital.</h2>
            <p>
              La oportunidad no está solo en aparecer: está en construir
              confianza, ordenar el contacto y diferenciar cada publicación con
              información que el comprador pueda entender rápido.
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
            <p className="eyebrow">Cómo funciona</p>
            <h2>De la solicitud al panel dealer, sin fricción innecesaria.</h2>
          </div>

          <div className="join-network-steps">
            {workflowSteps.map((step, index) => (
              <article key={step} className="join-network-step-card">
                <strong>{index + 1}</strong>
                <div>
                  <h3>{step}</h3>
                  <p>
                    {index === 0
                      ? "Iniciás el proceso desde el acceso de dealer."
                      : "La operación avanza dentro del circuito comercial de oX NEXMOV."}
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

