import "../../styles/sellVehicle.css";

const GARAGE_FEATURES = [
  {
    id: "passport",
    label: "Pasaporte digital",
    title: "Pasaporte digital.",
    text: "Cada unidad puede conservar identidad, recorrido y contexto propio.",
    icon: "◈",
    featured: true,
  },
  {
    id: "fleet",
    label: "Flota familiar",
    title: "Flota familiar.",
    text: "Tus vehículos propios reunidos en una colección privada.",
    icon: "⊕",
  },
  {
    id: "services",
    label: "Servicios",
    title: "Servicios y vencimientos.",
    text: "Controles, VTV, seguro y notas importantes siempre a mano.",
    icon: "≡",
  },
  {
    id: "resale",
    label: "Reventa futura",
    title: "Valor futuro.",
    text: "Un historial cuidado puede sumar confianza en una futura reventa.",
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
          <div className="garage-public-hero-bg" aria-hidden="true" />
          <div className="garage-public-hero-text">
            <p className="eyebrow">Garage oX</p>
            <h1>Garage oX</h1>
            <p>
              Tu historial automotriz privado: vehículos, servicios,
              vencimientos y valor futuro en un solo lugar.
            </p>
            <div className="garage-public-actions">
              <button
                className="primary-action"
                type="button"
                onClick={() => onNavigate?.(isLoggedIn ? "buyer" : "login")}
              >
                {isLoggedIn ? "Ingresar a mi Garage" : "Ingresar a Garage oX"}
              </button>
              <button
                className="admin-refresh-btn"
                type="button"
                onClick={() => onNavigate?.("search")}
              >
                Explorar vehículos
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

          <div className="garage-public-hero-brand" aria-hidden="true">
            <img
              className="garage-public-hero-logo"
              src="/hero-car.svg"
              alt=""
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
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
              <div className="garage-public-card-kicker">
                <span className="garage-public-card-icon">{feat.icon}</span>
                <span>{feat.label}</span>
              </div>
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
