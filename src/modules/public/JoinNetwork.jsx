const networkValues = [
  {
    eyebrow: "Más visibilidad útil",
    title: "Red",
    text: "Tus vehículos se muestran dentro de una experiencia pensada para que el comprador compare, consulte y avance con más confianza.",
  },
  {
    eyebrow: "Leads trazables",
    title: "Control",
    text: "Cada consulta queda registrada dentro de la plataforma para mejorar el seguimiento comercial y evitar contactos perdidos.",
  },
  {
    eyebrow: "Planes por escala",
    title: "Cupos",
    text: "Cada dealer trabaja con un plan acorde a su volumen, con cupos, beneficios y herramientas habilitadas según su operación.",
  },
  {
    eyebrow: "Comprador primero",
    title: "Confianza",
    text: "La plataforma prioriza claridad, comparación y datos útiles. Eso mejora la experiencia del comprador y fortalece al dealer serio.",
  },
];

const steps = [
  {
    title: "Alta del dealer",
    text: "Administración registra los datos comerciales principales, asigna el plan y deja preparada la cuenta de acceso.",
  },
  {
    title: "Activación del plan",
    text: "El dealer queda operativo durante su período vigente. Si el plan vence, las publicaciones se pausan hasta renovar.",
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
              Sumate a una red pensada para dealers que quieren{" "}
              <span>competir mejor.</span>
            </h1>

            <p>
              oX NEXMOV conecta agencias, concesionarias y vendedores
              profesionales con compradores que buscan vehículos reales,
              información clara y una experiencia de compra más ordenada.
            </p>

            <div className="join-network-actions">
              <button type="button" onClick={() => onNavigate?.("login")}>
                Iniciar contacto
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
              Menos ruido, más trazabilidad y una operación comercial diseñada
              para generar confianza real.
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
            <h2>Un alta simple, con control comercial desde administración.</h2>
            <p>
              El dealer se incorpora a la red, se le asigna un plan, se activa
              su período comercial y desde su panel puede cargar vehículos,
              recibir leads, responder consultas y gestionar oportunidades.
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
              El alta se realiza con revisión administrativa para mantener una
              red seria, con dealers identificados, publicaciones claras y
              contactos comerciales trazables.
            </p>
          </div>

          <button type="button" onClick={() => onNavigate?.("login")}>
            Iniciar contacto
          </button>
        </section>
      </div>
    </section>
  );
}