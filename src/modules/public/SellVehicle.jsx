import "../../styles/sellVehicle.css";

const GARAGE_FEATURES = [
  {
    id: "passport",
    label: "Pasaporte digital",
    title: "De publicación a vehículo dentro de tu Garage.",
    text: "Cuando una unidad se concreta dentro de oX, el dealer puede transferir la card al comprador para continuar su recorrido.",
    icon: "◈",
    featured: true,
  },
  {
    id: "fleet",
    label: "Flota familiar",
    title: "Cargá otros vehículos propios.",
    text: "Sumá autos de tu familia, registrá kilometraje, datos principales, seguro, VTV y notas de mantenimiento.",
    icon: "⊕",
  },
  {
    id: "services",
    label: "Servicios",
    title: "Historial simple y ordenado.",
    text: "Guardá cambios de aceite, frenos, cubiertas, batería, reparaciones y controles importantes en un solo lugar.",
    icon: "≡",
  },
  {
    id: "resale",
    label: "Reventa futura",
    title: "Prepará mejor una futura publicación.",
    text: "Cuando quieras vender, el historial del Garage puede convertirse en contexto comercial para una evaluación más clara.",
    icon: "↑",
    wide: true,
  },
];

export default function SellVehicle({ authUser, onNavigate }) {
  const isLoggedIn = Boolean(authUser?.id);

  return (
    <section className="page-section sell-vehicle-page garage-public-page">
      <div className="container panel sell-vehicle-panel garage-public-panel">

        <div className="garage-public-hero">
          <div className="garage-public-hero-text">
            <p className="eyebrow">Garage oX</p>
            <h1>Tu vehículo empieza a tener historia propia.</h1>
            <p>
              Garage oX organiza unidades compradas en la plataforma, vehículos de
              tu familia, servicios, vencimientos y datos útiles para conservar valor
              antes de una futura reventa.
            </p>
            <div className="garage-public-actions">
              <button
                className="primary-action"
                type="button"
                onClick={() => onNavigate?.(isLoggedIn ? "buyer" : "login")}
              >
                {isLoggedIn ? "Abrir mi Garage oX" : "Crear mi Garage oX"}
              </button>
              <button
                className="admin-refresh-btn"
                type="button"
                onClick={() => onNavigate?.("search")}
              >
                Buscar vehículos
              </button>
            </div>
          </div>

          <div className="garage-public-hero-deco" aria-hidden="true">
            <div className="garage-deco-card">
              <div className="garage-deco-card-thumb">
                <div className="garage-deco-card-thumb-inner" />
              </div>
              <div className="garage-deco-card-body">
                <p className="garage-deco-card-title">Toyota Corolla</p>
                <p className="garage-deco-card-sub">2021 · 48,500 km</p>
                <div className="garage-deco-card-tag">Pasaporte Digital</div>
              </div>
            </div>
            <div className="garage-deco-log">
              <div className="garage-deco-log-entry">
                <span className="garage-deco-dot" />
                <span>Cambio de aceite — mayo 2025</span>
              </div>
              <div className="garage-deco-log-entry">
                <span className="garage-deco-dot garage-deco-dot--amber" />
                <span>VTV vence — dic. 2025</span>
              </div>
              <div className="garage-deco-log-entry">
                <span className="garage-deco-dot garage-deco-dot--dim" />
                <span>Seguro al día</span>
              </div>
            </div>
          </div>
        </div>

        <div className="garage-public-grid">
          {GARAGE_FEATURES.map((feat) => (
            <article
              key={feat.id}
              className={[
                "sell-vehicle-info-card",
                "garage-public-card",
                feat.featured ? "garage-public-card--featured" : "",
                feat.wide ? "garage-public-card--wide" : "",
              ].filter(Boolean).join(" ")}
            >
              <div className="garage-public-card-icon">{feat.icon}</div>
              <span>{feat.label}</span>
              <h2>{feat.title}</h2>
              <p>{feat.text}</p>
            </article>
          ))}
        </div>

        <div className="garage-public-note">
          <strong>Garage oX no reemplaza documentación oficial.</strong>
          <span>
            Los datos cargados por el usuario son informativos y deben
            verificarse antes de cualquier operación.
          </span>
        </div>
      </div>
    </section>
  );
}
