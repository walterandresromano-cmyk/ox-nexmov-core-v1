import "../../styles/dealerPresentation.css";

/* ── datos del mock ── */
const mockVehicle = {
  brand: "Toyota", model: "Corolla", version: "XEi CVT", year: 2022,
  km: "48.000 km", location: "Buenos Aires", price: "USD 22.500",
  financing: true, transmission: "Automática", fuel: "Nafta",
  delta: { below: true, pct: "3.2% debajo del mercado" },
};

const mockLeads = [
  { name: "Carlos M.", vehicle: "Toyota Corolla 2022", chip: "new", label: "NUEVO" },
  { name: "Valentina R.", vehicle: "VW Tiguan 2023", chip: "hot", label: "EN GESTIÓN" },
  { name: "Diego S.", vehicle: "Ford Ranger 2022", chip: "done", label: "VENDIDO ✓" },
];

const mockVehicles = [
  { icon: "🚗", name: "Toyota Corolla 2022", price: "USD 22.500", leads: 12, rank: "elite" },
  { icon: "🚙", name: "VW Tiguan 2023", price: "USD 34.900", leads: 8, rank: "pro" },
  { icon: "🏎️", name: "Ford Ranger 2022", price: "USD 28.900", leads: 6, rank: "inicio" },
];

const rankBorder = {
  elite: "#f5c542",
  pro: "#38bdf8",
  inicio: "#b88746",
  platinum: "#e5e7eb",
};

const benefits = [
  {
    icon: "💬",
    title: "Leads trazables",
    text: "Cada consulta queda registrada antes de abrir el canal de contacto. Seguí cada lead desde que entra hasta que se cierra.",
    stat: "+40%",
    statLabel: "más consultas en los primeros 3 meses",
  },
  {
    icon: "📊",
    title: "Panel completo",
    text: "Inventario, métricas, leads y soporte desde un único dashboard. Sin planillas ni apps separadas.",
    stat: "−30%",
    statLabel: "reducción en tiempo de gestión operativa",
  },
  {
    icon: "📈",
    title: "Inteligencia de mercado",
    text: "Benchmarking de precio vs. mercado, score de publicación y recomendaciones accionables para cada vehículo.",
    stat: "100%",
    statLabel: "datos en tiempo real, sin delay",
  },
];

const offerItems = [
  { label: "Publicaciones ilimitadas", detail: "durante el período de lanzamiento" },
  { label: "Todos los leads", detail: "sin filtros ni topes" },
  { label: "Panel dealer completo", detail: "con métricas, inventario y soporte" },
  { label: "Benchmarking de mercado", detail: "precio vs. competencia en tiempo real" },
  { label: "Soporte prioritario", detail: "canal directo con el equipo de oX" },
  { label: "Onboarding guiado", detail: "primer vehículo publicado en menos de 24 hs" },
];

export default function DealerPresentation({ onNavigate }) {
  return (
    <div className="dp-page">

      {/* ══════════ HERO ══════════ */}
      <div className="dp-hero">
        <div className="dp-eyebrow">Para Dealers</div>

        <h1 className="dp-hero-title">
          Más compradores.<br />
          Menos gestión.<br />
          <em>Más ventas.</em>
        </h1>

        <p className="dp-hero-sub">
          oX NEXMOV conecta tu inventario con compradores calificados y le da a tu agencia las herramientas para operar sin fricción.
        </p>

        <div className="dp-hero-badge">
          <span className="dp-badge-dot" />
          Acceso 100% gratuito por período de lanzamiento
        </div>

        <div className="dp-cta-row">
          <button className="dp-btn-primary" onClick={() => onNavigate?.("joinNetwork")}>
            Quiero sumarme →
          </button>
          <button
            className="dp-btn-ghost"
            onClick={() => document.getElementById("dp-panel")?.scrollIntoView({ behavior: "smooth" })}
          >
            Ver el panel
          </button>
        </div>
      </div>

      <div className="dp-shell">

        {/* ══════════ VEHICLE CARD + COPY ══════════ */}
        <div className="dp-section">
          <div className="dp-two-col">

            {/* left — copy */}
            <div className="dp-two-col-left">
              <div className="dp-section-label">Tus publicaciones</div>
              <h2 className="dp-section-title">
                Tu inventario al frente de compradores que ya están buscando
              </h2>
              <p className="dp-section-sub">
                Cada vehículo publicado en oX NEXMOV tiene ficha completa, galería, precio de mercado comparado y datos de financiación. Los compradores llegan con información — vos cerrás la venta.
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Score de calidad de publicación con recomendaciones accionables",
                  "Benchmarking automático: precio vs. mercado en tiempo real",
                  "Badge de plan visible en cada card (Inicio / Pro / Elite / Platinum)",
                  "Señal de financiación integrada para filtrar compradores calificados",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: "var(--ox-fs-body-sm)",
                      color: "var(--ox-muted)",
                      padding: "7px 0 7px 18px",
                      position: "relative",
                      borderBottom: "1px solid var(--ox-border)",
                      lineHeight: "var(--ox-lh-body)",
                    }}
                  >
                    <span style={{ position: "absolute", left: 0, color: "var(--ox-cyan)", fontWeight: 700, fontSize: 11 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="dp-callout" style={{ marginTop: 20 }}>
                El comprador compara, duda y vuelve. <em>Tu publicación tiene que ganarlo antes de que abra WhatsApp.</em>
              </div>
            </div>

            {/* right — vehicle card real */}
            <div>
              <div className="dp-card-showcase-label">Así ve el comprador tu publicación</div>

              {/* Real vehicle card using actual app classes */}
              <div className="vehicle-card dealer-rank-elite">
                <div className="vehicle-card-media">
                  <div
                    style={{
                      width: "100%", height: "100%",
                      background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(56,189,248,0.06))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 64,
                    }}
                  >
                    🚗
                  </div>
                </div>

                <div className="vehicle-card-body" style={{ padding: "14px 16px 16px" }}>
                  <div className="vehicle-card-head">
                    <span className="dealer-rank dealer-rank-elite" style={{ color: "#f5c542", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>
                      ELITE
                    </span>
                    <span style={{ fontSize: 10, color: "var(--ox-muted)" }}>Buenos Aires</span>
                  </div>

                  <h3 style={{ margin: "10px 0 3px", fontSize: "0.97rem", fontFamily: "var(--ox-font-display)", fontWeight: 700, color: "var(--ox-text)" }}>
                    {mockVehicle.brand} {mockVehicle.model} {mockVehicle.year}
                  </h3>

                  <div className="vehicle-version" style={{ fontSize: "0.8rem", color: "var(--ox-muted)" }}>
                    {mockVehicle.version}
                  </div>

                  <div className="vehicle-meta" style={{ fontSize: "0.8rem", color: "var(--ox-muted)", marginTop: 5, display: "flex", gap: 10 }}>
                    <span>{mockVehicle.km}</span>
                    <span>{mockVehicle.fuel}</span>
                    <span>{mockVehicle.transmission}</span>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "var(--ox-font-display)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ox-text)" }}>
                      {mockVehicle.price}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 7px",
                      borderRadius: 5, background: "rgba(34,197,94,0.10)",
                      color: "var(--ox-green)", border: "1px solid rgba(34,197,94,0.20)",
                    }}>
                      3.2% debajo del mercado
                    </span>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["Financiación", "Mantenimiento", "48.000 km"].map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 9.5, fontWeight: 600, padding: "3px 8px",
                          borderRadius: "var(--ox-radius-pill)", border: "1px solid var(--ox-border)",
                          color: "var(--ox-muted)", background: "var(--ox-card-2)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="vehicle-actions">
                    <button style={{
                      border: "1px solid var(--ox-border-accent)", background: "rgba(56,189,248,0.07)",
                      color: "var(--ox-cyan)", borderRadius: 10, padding: "9px 12px",
                      fontSize: 11, fontWeight: 700, cursor: "default",
                    }}>
                      Consultar
                    </button>
                    <button style={{
                      border: "1px solid var(--ox-border)", background: "var(--ox-card-2)",
                      color: "var(--ox-text-soft)", borderRadius: 10, padding: "9px 12px",
                      fontSize: 11, fontWeight: 600, cursor: "default",
                    }}>
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 10, color: "var(--ox-muted-2)", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                Publicación real de la plataforma — badge Elite · score y benchmarking activos
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ PANEL DEALER ══════════ */}
        <div className="dp-section" id="dp-panel">
          <div className="dp-section-label">Panel Dealer</div>
          <div className="dp-two-col">
            <div className="dp-two-col-left">
              <h2 className="dp-section-title">
                Tu negocio, desde una sola pantalla
              </h2>
              <p className="dp-section-sub">
                Inventario, leads y métricas en tiempo real. El panel dealer te da visibilidad completa de tu operación sin saltar entre apps.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Inventario activo", desc: "Estado de cada publicación, score de calidad, vistas y leads recibidos." },
                  { label: "CRM de leads", desc: "Cada consulta entra trazada: nombre, vehículo, fecha, estado y seguimiento." },
                  { label: "Métricas del período", desc: "Tasa de conversión, tiempo de respuesta, publicaciones por cupo y alertas." },
                  { label: "Qué hacer hoy", desc: "Resumen diario con leads sin responder, vencimientos y stock a atender." },
                ].map(({ label, desc }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--ox-card)", border: "1px solid var(--ox-border)",
                      borderRadius: "var(--ox-radius-md)", padding: "13px 16px",
                      display: "flex", gap: 12, alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: "var(--ox-cyan)", fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <div>
                      <div style={{ fontSize: "var(--ox-fs-body-sm)", fontWeight: 700, color: "var(--ox-text)", marginBottom: 3 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: "var(--ox-fs-caption)", color: "var(--ox-muted)", lineHeight: "var(--ox-lh-body)" }}>
                        {desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel mockup using real dealer CSS classes */}
            <div>
              <div className="dp-panel-mock">
                {/* topbar */}
                <div className="dp-panel-mock-bar">
                  <div className="dp-panel-mock-logo">
                    <img src="/logo.svg" alt="oX NEXMOV" />
                    <span className="dp-panel-mock-logo-sep">/ Panel Dealer</span>
                  </div>
                  <div className="dp-panel-mock-tabs">
                    <div className="dp-panel-mock-tab active">Resumen</div>
                    <div className="dp-panel-mock-tab">Publicaciones</div>
                    <div className="dp-panel-mock-tab">Leads</div>
                    <div className="dp-panel-mock-tab">Métricas</div>
                  </div>
                  <button className="dp-panel-mock-publish">+ Publicar</button>
                </div>

                <div className="dp-panel-mock-body">
                  {/* KPI cards — real dealer-status-card class */}
                  <div className="dp-panel-kpi-grid">
                    <article className="dealer-status-card rank-elite">
                      <span>Publicaciones</span>
                      <strong>14</strong>
                      <p>activas · 2 en revisión</p>
                    </article>
                    <article className="dealer-status-card">
                      <span>Leads nuevos</span>
                      <strong style={{ color: "var(--ox-cyan)" }}>7</strong>
                      <p>sin responder</p>
                    </article>
                    <article className="dealer-status-card">
                      <span>Vistas totales</span>
                      <strong>342</strong>
                      <p>24.4 promedio/pub.</p>
                    </article>
                    <article className="dealer-status-card">
                      <span>Conversión</span>
                      <strong style={{ color: "var(--ox-green)" }}>4.1%</strong>
                      <p>vista → consulta</p>
                    </article>
                  </div>

                  {/* mini vehicles */}
                  <div className="dp-panel-vehicle-row">
                    <div className="dp-panel-vehicle-label">Inventario destacado</div>
                    <div className="dp-panel-vehicle-grid">
                      {mockVehicles.map((v) => (
                        <div
                          key={v.name}
                          className="dp-mini-veh"
                          style={{ borderTop: `2px solid ${rankBorder[v.rank]}` }}
                        >
                          <div className="dp-mini-veh-img">{v.icon}</div>
                          <div className="dp-mini-veh-body">
                            <div className="dp-mini-veh-name">{v.name}</div>
                            <div className="dp-mini-veh-price">{v.price}</div>
                            <div className="dp-mini-veh-status">{v.leads} leads</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* leads */}
                  <div className="dp-leads-mini">
                    <div className="dp-leads-mini-title">Últimos leads</div>
                    {mockLeads.map((l) => (
                      <div key={l.name} className="dp-lead-row">
                        <div>
                          <div className="dp-lead-name">{l.name}</div>
                          <div className="dp-lead-vehicle">{l.vehicle}</div>
                        </div>
                        <div className={`dp-lead-chip ${l.chip}`}>{l.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="dp-panel-mock-caption">Vista representativa del Panel de Control Dealer</div>
            </div>
          </div>
        </div>

        {/* ══════════ BENEFICIOS ══════════ */}
        <div className="dp-section">
          <div className="dp-section-label">Por qué oX NEXMOV</div>
          <h2 className="dp-section-title">Tres razones concretas para sumarte ahora</h2>
          <p className="dp-section-sub">
            No es una plataforma más de publicaciones. Es la operación comercial de tu agencia, digitalizada.
          </p>

          <div className="dp-benefits">
            {benefits.map((b) => (
              <div key={b.title} className="dp-benefit-card">
                <span className="dp-benefit-icon">{b.icon}</span>
                <div className="dp-benefit-title">{b.title}</div>
                <div className="dp-benefit-text">{b.text}</div>
                <div className="dp-benefit-stat">{b.stat}</div>
                <div className="dp-benefit-stat-label">{b.statLabel}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ OFERTA ══════════ */}
        <div className="dp-section">
          <div className="dp-section-label">Período de lanzamiento</div>
          <div className="dp-offer">
            <div className="dp-offer-left">
              <span className="dp-offer-num">90</span>
              <span className="dp-offer-unit">días</span>
              <div className="dp-offer-caption">Acceso completo gratuito</div>
            </div>

            <div>
              <div className="dp-offer-title">
                Sin riesgo. Sin letra chica.<br />Con todo incluido.
              </div>

              <ul className="dp-offer-list">
                {offerItems.map((item) => (
                  <li key={item.label}>
                    <strong>{item.label}</strong> {item.detail}
                  </li>
                ))}
              </ul>

              <div className="dp-offer-note">
                <strong>⭐ Primeros dealers aliados</strong> — quienes ingresen durante el período de lanzamiento tendrán condiciones comerciales preferenciales permanentes, incluso después de que la plataforma sea paga.
              </div>
            </div>
          </div>
        </div>

      </div>{/* /dp-shell */}

      {/* ══════════ CTA FINAL ══════════ */}
      <div className="dp-bottom-cta">
        <div className="dp-bottom-cta-title">¿Listo para sumarte?</div>
        <p className="dp-bottom-cta-sub">
          Los cupos del período gratuito son limitados. Hablemos hoy.
        </p>
        <div className="dp-cta-row">
          <button className="dp-btn-primary" onClick={() => onNavigate?.("joinNetwork")}>
            Comenzar ahora →
          </button>
          <button className="dp-btn-ghost" onClick={() => onNavigate?.("home")}>
            Ver la plataforma
          </button>
        </div>
      </div>

    </div>
  );
}
