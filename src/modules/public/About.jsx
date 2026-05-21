import "../../styles/about.css";

const aboutPillars = [
  {
    eyebrow: "Comprador primero",
    title: "Claridad",
    text: "La plataforma prioriza información útil, comparación real y contacto trazable antes que publicidad invasiva o publicaciones confusas.",
  },
  {
    eyebrow: "Dealers verificados",
    title: "Red",
    text: "Trabajamos con agencias, concesionarias y vendedores profesionales que buscan operar con datos, orden y responsabilidad comercial.",
  },
  {
    eyebrow: "Datos para decidir",
    title: "Contexto",
    text: "El vehículo no se muestra aislado: se acompaña con señales, comparación, referencias y herramientas para entender mejor cada oportunidad.",
  },
  {
    eyebrow: "Operación trazable",
    title: "Confianza",
    text: "Las consultas, leads, solicitudes y contactos comerciales quedan ordenados para reducir pérdidas de información y mejorar el seguimiento.",
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
    text: "El contacto comercial se registra para mejorar la trazabilidad y evitar consultas anónimas o desordenadas.",
  },
  {
    title: "Red profesional",
    text: "El dealer cuenta con panel, cupos, leads, tickets y herramientas para gestionar su operación dentro de la red.",
  },
];

const differences = [
  "Vehículos reales",
  "Dealers identificados",
  "Leads trazables",
  "Comparador integrado",
  "Financiación 0km",
  "Solicitudes de venta",
  "Paneles operativos",
  "Soporte interno",
];

export default function About({ onNavigate }) {
  return (
    <section className="page-section about-page">
      <div className="container panel about-panel">
        <section className="about-hero">
          <div className="about-hero-copy">
            <p className="eyebrow">Sobre oX NEXMOV</p>

            <h1>
              Una plataforma creada para decidir con <span>más claridad.</span>
            </h1>

            <p>
              Ordenamos información, dealers, publicaciones y herramientas de
              comparación para que comprar o vender un vehículo sea una
              experiencia más clara, trazable y confiable.
            </p>
          </div>

          <aside className="about-hero-card">
            <span>Red automotriz inteligente</span>
            <strong>Claridad en cada decisión</strong>
            <p>
              Tecnología, trazabilidad y criterio comercial al servicio de una
              experiencia más confiable para compradores y dealers.
            </p>
          </aside>
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
              Comprar un vehículo implica comparar precios, estado,
              financiación, ubicación, confianza del vendedor y oportunidad real.
              oX NEXMOV busca reunir esos elementos en una experiencia clara,
              moderna y pensada para que cada paso tenga sentido.
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
              oX NEXMOV busca convertirse en una nueva forma de trabajar en el
              rubro automotriz: más clara para el comprador, más ordenada para el
              dealer y más inteligente para toda la red.
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
