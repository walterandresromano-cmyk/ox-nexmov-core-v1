export default function Footer({ onNavigate }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand-block">
          <button
            type="button"
            className="footer-brand-button"
            onClick={() => onNavigate("home")}
            aria-label="Ir al inicio de oX NEXMOV"
          >
            <img className="footer-logo-img" src="/logo.svg" alt="oX NEXMOV" />
          </button>

          <p>
            Claridad en cada decisión. Vehículos reales, dealers verificados y
            contexto para comprar mejor.
          </p>
        </div>

        <div className="footer-links">
          <button type="button" onClick={() => onNavigate("search")}>
            Buscar
          </button>
          <button type="button" onClick={() => onNavigate("zeroKm")}>
            Financiación 0km
          </button>
          <button type="button" onClick={() => onNavigate("joinNetwork")}>
            Sumate a la red
          </button>
          <button type="button" onClick={() => onNavigate("faq")}>
            Preguntas frecuentes
          </button>
        </div>
      </div>
    </footer>
  );
}