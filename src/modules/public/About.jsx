import "../../styles/about.css";

const aboutPillars = [
  {
    eyebrow: "Comprador primero",
    title: "Claridad",
    text: "La plataforma prioriza información útil, comparación real y contacto seguro antes que publicidad invasiva o publicaciones confusas.",
  },
  {
    eyebrow: "Vendedores verificados",
    title: "Red",
    text: "Trabajamos con agencias y vendedores profesionales que buscan operar con datos, orden y responsabilidad comercial.",
  },
  {
    eyebrow: "Datos para decidir",
    title: "Contexto",
    text: "Cada vehículo se acompaña con precio de referencia, comparador, financiación y datos del vendedor para que tengas todo el contexto antes de consultar.",
  },
  {
    eyebrow: "Contactos ordenados",
    title: "Confianza",
    text: "Las consultas, solicitudes y contactos quedan ordenados para reducir pérdidas de información y mejorar el seguimiento.",
  },
];

const visionItems = [
  {
    title: "Búsqueda simple",
    text: "El comprador puede explorar, filtrar, comparar y consultar sin perderse entre información innecesaria.",
  },
  {
    title: "Comparación real",
    text: "La plataforma permite evaluar vehículos lado a lado para entender diferencias de precio, año, kilometraje y propuesta comercial.",
  },
  {
    title: "Contactos cuidados",
    text: "El contacto se registra para evitar consultas anónimas o desordenadas y mantener un historial claro.",
  },
  {
    title: "Red profesional",
    text: "El vendedor tiene un panel propio con herramientas para gestionar publicaciones, consultas y su presencia dentro de la red.",
  },
];

const differences = [
  "Vehículos reales",
  "Vendedores verificados",
  "Sin comisión",
  "Consultas registradas",
  "Comparador integrado",
  "Financiación 0km",
  "Solicitudes de venta",
  "Panel del vendedor",
  "Soporte disponible",
];

export default function About({ onNavigate }) {
  return (
    <section className="page-section about-page">
      <div className="container panel about-panel">
        <section className="about-hero">
          <div className="about-hero-road" aria-hidden="true" />
          <div className="about-hero-copy">
            <p className="eyebrow ox-public-eyebrow">Sobre oX NEXMOV</p>

            <h1 className="ox-public-title">
              Una plataforma creada para decidir con <span>más claridad.</span>
            </h1>

            <p className="ox-public-lead">
              En Argentina, comprar un vehículo puede ser confuso: publicaciones
              incompletas, vendedores anónimos y precios que no se sostienen.
              oX NEXMOV ordena todo eso para que puedas comparar, consultar y
              decidir con la información que necesitás.
            </p>
          </div>

          <div className="about-hero-brand" aria-hidden="true">
            <img
              className="about-hero-logo"
              src="/hero-car.svg"
              alt=""
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        </section>

        <section className="about-pillars">
          {aboutPillars.map((item) => (
            <article key={item.title} className="about-pillar-card">
              <span>{item.eyebrow}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="about-section">
          <div className="about-section-head">
            <p className="eyebrow">Nuestra mirada</p>
            <h2>No queremos sumar ruido. Queremos ordenar la decisión.</h2>
            <p>
              Comprar un vehículo implica comparar precios, estado, financiación,
              ubicación y confianza del vendedor — todo al mismo tiempo.
              oX NEXMOV reúne esos elementos para que cada paso tenga sentido
              y cada decisión esté respaldada por información real.
            </p>
          </div>

          <div className="about-vision-grid">
            {visionItems.map((item) => (
              <article key={item.title} className="about-vision-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="about-section-head">
            <p className="eyebrow">Qué nos diferencia</p>
            <h2>Una plataforma construida alrededor de la confianza.</h2>
            <p>
              La diferencia no está solo en publicar vehículos. Está en ordenar
              la relación entre quien busca, quien vende y la información que
              permite tomar una buena decisión.
            </p>
          </div>

          <div className="about-benefits-list">
            {differences.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="about-final">
          <div>
            <p className="eyebrow">Nuestra promesa</p>
            <h2>No buscamos que decidas más rápido. Buscamos que decidas mejor.</h2>
            <p>
              oX NEXMOV nació para que comprar o vender un vehículo en Argentina
              sea una experiencia más clara, más honesta y con menos incertidumbre
              en cada paso.
            </p>
          </div>

          <div className="about-final-actions">
            <button type="button" onClick={() => onNavigate?.("search")}>
              Buscar vehículos
            </button>
            <button type="button" onClick={() => onNavigate?.("joinNetwork")}>
              Sumate a la red
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
