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
            <img className="footer-logo-img" src="/logo.svg" alt="oX NEXMOV" width="180" height="34" />
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

      <div className="container footer-legal">
        <p className="footer-support">
          © 2026 oX NEXMOV. Todos los derechos reservados. Soporte:{" "}
          <a href="mailto:soporte@oxnexmov.com.ar">
            soporte@oxnexmov.com.ar
          </a>
        </p>

        <p className="footer-legal-note">
          oX NEXMOV es una plataforma digital de búsqueda, comparación y
          contacto comercial entre compradores y dealers verificados. La
          información publicada sobre vehículos, precios, disponibilidad,
          financiación y condiciones comerciales es declarada por cada
          anunciante y puede estar sujeta a modificaciones.
        </p>

        <p className="footer-legal-note">
          oX NEXMOV no es titular de los vehículos publicados. Las operaciones
          comerciales, documentación, precios finales, disponibilidad y
          condiciones de financiación son responsabilidad del dealer,
          concesionaria o anunciante correspondiente. La plataforma no garantiza
          leads, ventas, aprobaciones crediticias ni condiciones finales.
        </p>

        <p className="footer-legal-note footer-security-note">
          Consultá nuestras recomendaciones de seguridad y publicaciones
          sospechosas antes de avanzar con una operación.
        </p>

        <nav className="footer-legal-links" aria-label="Links legales">
          <button type="button" onClick={() => onNavigate("terms")}>
            Términos y condiciones
          </button>
          <button type="button" onClick={() => onNavigate("faq")}>
            Seguridad y publicaciones sospechosas
          </button>
        </nav>
      </div>
    </footer>
  );
}
