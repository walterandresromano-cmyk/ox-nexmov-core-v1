export default function Home({ onNavigate }) {
  return (
    <section className="page-section">
      <div className="container hero-panel">
        <p className="eyebrow">Red automotriz inteligente</p>
        <h1>
          Claridad en cada <span>decisión.</span>
        </h1>
        <p className="lead">
          Buscá, compará y consultá vehículos reales de dealers verificados,
          con señales comerciales y contexto de mercado.
        </p>

        <div className="hero-search">
          <input placeholder="Ej: SUV financiada hasta 20 millones" />
          <button onClick={() => onNavigate("search")}>Buscar</button>
        </div>
      </div>
    </section>
  );
}