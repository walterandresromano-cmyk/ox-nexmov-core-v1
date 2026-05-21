export default function NotFound({ onNavigate }) {
  return (
    <section className="page-section not-found-page">
      <div className="container not-found-shell">
        <div className="not-found-copy">
          <p className="eyebrow">404</p>
          <h1>
            Esta página no existe<span>.</span>
          </h1>
          <p>
            La sección que buscás no está disponible o requiere permisos
            distintos al nivel de acceso actual.
          </p>
        </div>

        <div className="not-found-actions">
          <button
            type="button"
            className="primary-action"
            onClick={() => onNavigate?.("home")}
          >
            Volver al inicio
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("search")}
          >
            Buscar vehículos
          </button>
        </div>
      </div>
    </section>
  );
}
