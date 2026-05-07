const networkValues = [
  {
    eyebrow: "Más visibilidad útil",
    title: "Publicaciones ordenadas",
    text: "Tus vehículos se muestran dentro de una experiencia pensada para que el comprador compare, consulte y avance con más confianza.",
  },
  {
    eyebrow: "Leads trazables",
    title: "Consultas con seguimiento",
    text: "Cada consulta queda registrada dentro de la plataforma para mejorar el seguimiento comercial y evitar contactos perdidos.",
  },
  {
    eyebrow: "Planes por escala",
    title: "Señales comerciales por plan",
    text: "Cada dealer trabaja con un plan acorde a su volumen, con cupos, beneficios y herramientas habilitadas según su operación.",
  },
  {
    eyebrow: "Comprador primero",
    title: "Comparación para compradores",
    text: "La plataforma prioriza claridad, comparación y datos útiles. Eso mejora la experiencia del comprador y fortalece al dealer serio.",
  },
];

const steps = [
  {
    title: "Alta del dealer",
    text: "Administración revisa los datos comerciales principales y valida si la cuenta puede incorporarse a la red.",
  },
  {
    title: "Activación del plan",
    text: "El plan, los cupos y los beneficios se activan después de la validación administrativa correspondiente.",
  },
  {
    title: "Carga de vehículos",
    text: "Cada publicación debe completar datos mínimos, precio coherente, fotos e información comercial clara.",
  },
  {
    title: "Gestión de oportunidades",
    text: "Los leads, consultas, tickets y oportunidades quedan centralizados para que el dealer pueda trabajar con orden.",
  },
];

const plans = [
  {
    name: "Inicio",
    amount: "10",
    text: "Hasta 10 publicaciones por período. Ideal para comenzar a operar dentro de la red con presencia controlada.",
  },
  {
    name: "Pro",
    amount: "30",
    text: "Mayor cupo, más herramientas comerciales y acceso ampliado a oportunidades según criterio operativo.",
  },
  {
    name: "Elite",
    amount: "50",
    text: "Pensado para dealers con mayor volumen, mejores señales comerciales y lectura más avanzada de operación.",
  },
  {
    name: "Platinum",
    amount: "Ilimitado",
    text: "Publicaciones ilimitadas y máximo nivel de herramientas dentro de la red oX NEXMOV.",
  },
];

const dealerTypes = [
  "Agencias multimarca",
  "Concesionarias",
  "Vendedores profesionales",
  "Operaciones con financiación",
  "Dealers con stock real",
  "Equipos comerciales en crecimiento",
];

export default function JoinNetwork({ onNavigate }) {
  return (
    <section className="page-section join-network-page">
      <div className="container panel join-network-panel">
        <section className="join-network-hero">
          <div className="join-network-hero-copy">
            <p className="eyebrow">Red comercial oX NEXMOV</p>

            <h1>
              Sumate a la red <span>oX NEXMOV.</span>
            </h1>

            <p>
              Formá parte de una red automotriz pensada para publicar vehículos
              con más claridad, recibir consultas trazables y diferenciar tu
              operación comercial.
            </p>

            <div className="join-network-actions">
              <button type="button" onClick={() => onNavigate?.("login")}>
                Solicitar alta de dealer
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
            <span>Red activa</span>
            <strong>Dealers verificados</strong>
            <p>
              El alta está sujeta a revisión administrativa, validación de datos
              comerciales y activación del plan correspondiente.
            </p>
          </aside>
        </section>

        <section className="join-network-values">
          {networkValues.map((item) => (
            <article key={item.title} className="join-network-value-card">
              <span>{item.eyebrow}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="join-network-section">
          <div className="join-network-section-head">
            <p className="eyebrow">Cómo funciona</p>
            <h2>Solicitud clara, activación administrada.</h2>
            <p>
              Iniciás la solicitud, administración valida los datos comerciales
              y, si corresponde, habilita el plan para empezar a operar dentro
              de la plataforma.
            </p>
          </div>

          <div className="join-network-steps">
            {steps.map((step, index) => (
              <article key={step.title} className="join-network-step-card">
                <strong>{index + 1}</strong>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="join-network-section">
          <div className="join-network-section-head">
            <p className="eyebrow">Planes comerciales</p>
            <h2>Un esquema pensado para distintas escalas de operación.</h2>
            <p>
              La diferencia entre planes no busca confundir al comprador:
              permite que cada dealer acceda a más herramientas, señales,
              métricas y capacidad operativa según su nivel de participación.
            </p>
          </div>

          <div className="join-network-plans">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`join-network-plan-card join-network-plan-${plan.name.toLowerCase()}`}
              >
                <span>Plan {plan.name}</span>
                <strong>{plan.amount}</strong>
                <p>{plan.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="join-network-section join-network-audience">
          <div className="join-network-section-head">
            <p className="eyebrow">Para quién es</p>
            <h2>Para dealers que quieren vender con más claridad y menos ruido.</h2>
            <p>
              oX NEXMOV está pensado para agencias, concesionarias y vendedores
              profesionales que necesitan una presencia digital más ordenada,
              trazabilidad de consultas y una plataforma que acompañe la
              decisión del comprador sin saturarlo de publicidad.
            </p>
          </div>

          <div className="join-network-benefits-list">
            {dealerTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </section>

        <section className="join-network-final">
          <div>
            <p className="eyebrow">Próximo paso</p>
            <h2>Solicitá el alta y prepará tu operación dentro de la red.</h2>
            <p>
              El alta de dealers está sujeta a revisión administrativa,
              validación de datos comerciales y activación del plan
              correspondiente.
            </p>
          </div>

          <button type="button" onClick={() => onNavigate?.("login")}>
            Solicitar alta de dealer
          </button>
        </section>
      </div>
    </section>
  );
}
