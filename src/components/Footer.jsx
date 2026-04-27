export default function Footer({ onNavigate }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <strong className="footer-brand">oX NEXMOV</strong>
          <p>
            Claridad en cada decisión. Vehículos reales, dealers verificados y
            contexto para comprar mejor.
          </p>
        </div>

        <div className="footer-links">
          <button onClick={() => onNavigate("search")}>Buscar</button>
          <button onClick={() => onNavigate("zeroKm")}>Financiación 0km</button>
          <button onClick={() => onNavigate("joinNetwork")}>Sumate a la red</button>
          <button onClick={() => onNavigate("faq")}>Preguntas frecuentes</button>
        </div>
      </div>
    </footer>
  );
}