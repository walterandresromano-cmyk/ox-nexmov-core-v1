import "../../styles/dealerPresentation.css";

/* ── SVG placeholder para el auto — sin emoji ── */
function CarOutlineSVG() {
  return (
    <svg width="180" height="72" viewBox="0 0 180 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M28 48H152M28 48C22 48 16 44 16 38V34L28 24H60L72 12H108L120 24H152L164 34V38C164 44 158 48 152 48M28 48C28 52.4 31.6 56 36 56C40.4 56 44 52.4 44 48C44 43.6 40.4 40 36 40C31.6 40 28 43.6 28 48ZM152 48C152 52.4 148.4 56 144 56C139.6 56 136 52.4 136 48C136 43.6 139.6 40 144 40C148.4 40 152 43.6 152 48Z"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M72 24H108" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M60 24L68 14H112L120 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="36" cy="48" r="7" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="144" cy="48" r="7" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M16 34H164" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}

const rankBorder = {
  elite:    "#f5c542",
  pro:      "#38bdf8",
  inicio:   "#b88746",
  platinum: "#e5e7eb",
};

const mockVehicles = [
  { name: "Toyota Corolla 2022", price: "USD 22.500", leads: 12, rank: "elite" },
  { name: "VW Tiguan 2023",      price: "USD 34.900", leads: 8,  rank: "pro"   },
  { name: "Ford Ranger 2022",    price: "USD 28.900", leads: 6,  rank: "inicio"},
];

const mockLeads = [
  { name: "Carlos M.",    vehicle: "Toyota Corolla 2022", chip: "new",  label: "NUEVO" },
  { name: "Valentina R.", vehicle: "VW Tiguan 2023",      chip: "hot",  label: "EN GESTIÓN" },
  { name: "Diego S.",     vehicle: "Ford Ranger 2022",    chip: "done", label: "VENDIDO ✓" },
];

const benefits = [
  {
    stat: "+40%",
    statLabel: "más consultas en los primeros 3 meses",
    title: "Leads trazables",
    text: "Cada consulta queda registrada antes de abrir el canal de contacto. Seguís cada lead desde que entra hasta que se cierra, sin perder nada.",
  },
  {
    stat: "−30%",
    statLabel: "reducción en tiempo de gestión operativa",
    title: "Panel completo",
    text: "Inventario, métricas, leads y soporte desde un único dashboard. Sin planillas, sin apps separadas, sin copiar datos entre sistemas.",
  },
  {
    stat: "100%",
    statLabel: "datos actualizados en tiempo real",
    title: "Inteligencia de mercado",
    text: "Benchmarking de precio vs. mercado, score de calidad por publicación y recomendaciones accionables para mejorar cada vehículo.",
  },
];

const panelFeatures = [
  { label: "Inventario activo",  desc: "Estado de cada publicación, score de calidad, vistas y leads recibidos." },
  { label: "CRM de leads",       desc: "Cada consulta entra trazada: nombre, vehículo, fecha, estado y próxima acción." },
  { label: "Métricas del período", desc: "Conversión, tiempo de respuesta, cupo y alertas críticas del plan." },
  { label: "Qué hacer hoy",     desc: "Resumen de leads sin responder, vencimientos y stock que necesita atención." },
];

const offerItems = [
  { label: "Publicaciones ilimitadas", detail: "durante el período de lanzamiento" },
  { label: "Todos los leads",          detail: "sin filtros ni topes" },
  { label: "Panel dealer completo",    detail: "métricas, inventario y soporte" },
  { label: "Benchmarking de mercado",  detail: "precio vs. competencia en tiempo real" },
  { label: "Soporte prioritario",      detail: "canal directo con el equipo de oX" },
  { label: "Onboarding guiado",        detail: "primer vehículo publicado en menos de 24 hs" },
];

export default function DealerPresentation({ onNavigate }) {
  return (
    <div className="dp-page">

      {/* ═══════════════════════ HERO ═══════════════════════ */}
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

        {/* ═══════════════════════ VEHICLE CARD ═══════════════════════ */}
        <div className="dp-section">
          <div className="dp-two-col">

            {/* left */}
            <div>
              <div className="dp-section-label">Tus publicaciones</div>
              <h2 className="dp-section-title">
                Tu inventario frente a compradores que ya están buscando
              </h2>
              <p className="dp-section-sub">
                Cada vehículo publicado en oX NEXMOV tiene ficha completa, galería, precio comparado con el mercado y datos de financiación. Los compradores llegan con información — vos cerrás la venta.
              </p>

              <div className="dp-feature-list">
                {[
                  { label: "Score de calidad por publicación", desc: "Recomendaciones accionables para mejorar fotos, precio y descripción." },
                  { label: "Benchmarking automático de precio", desc: "Tu publicación vs. el mercado en tiempo real. El comprador lo ve antes de consultar." },
                  { label: "Badge de plan visible en cada card", desc: "Inicio / Pro / Elite / Platinum — señal de confianza para el comprador." },
                  { label: "Señal de financiación integrada", desc: "Filtra compradores calificados que ya tienen intención de financiar." },
                ].map(({ label, desc }) => (
                  <div key={label} className="dp-feature-item">
                    <span className="dp-feature-check" />
                    <div>
                      <div className="dp-feature-label">{label}</div>
                      <div className="dp-feature-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dp-callout" style={{ marginTop: 20 }}>
                El comprador compara, duda y vuelve. <em>Tu publicación tiene que convencerlo antes de que abra WhatsApp.</em>
              </div>
            </div>

            {/* right — sticky, vehicle card real */}
            <div className="dp-col-sticky">
              <div className="dp-card-showcase-label">Así ve el comprador tu publicación</div>

              <div className="vehicle-card dealer-rank-elite dp-card-showcase">
                {/* media — placeholder con SVG, sin emoji */}
                <div className="vehicle-card-media">
                  <div className="dp-veh-media-placeholder">
                    <svg width="200" height="80" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32 54H168M32 54C25 54 18 49 18 42V37L32 26H66L80 13H120L134 26H168L182 37V42C182 49 175 54 168 54M32 54C32 59.5 36.5 64 42 64C47.5 64 52 59.5 52 54C52 48.5 47.5 44 42 44C36.5 44 32 48.5 32 54ZM168 54C168 59.5 163.5 64 158 64C152.5 64 148 59.5 148 54C148 48.5 152.5 44 158 44C163.5 44 168 48.5 168 54Z" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25"/>
                      <path d="M80 26H120" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.25"/>
                      <path d="M66 26L76 15H124L134 26" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25"/>
                      <circle cx="42" cy="54" r="8" stroke="#38bdf8" strokeWidth="2.5" opacity="0.25"/>
                      <circle cx="158" cy="54" r="8" stroke="#38bdf8" strokeWidth="2.5" opacity="0.25"/>
                      <path d="M18 38H182" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.1"/>
                    </svg>
                  </div>
                </div>

                <div className="dp-card-showcase">
                  <div className="vehicle-card-body" style={{ padding: "14px 16px 16px" }}>
                    {/* head */}
                    <div className="vehicle-card-head">
                      <span style={{ color: "#f5c542", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        ELITE
                      </span>
                      <span style={{ fontSize: 10, color: "var(--ox-muted)" }}>Buenos Aires</span>
                    </div>

                    {/* title */}
                    <h3 style={{ margin: "10px 0 3px", fontSize: "0.97rem", fontFamily: "var(--ox-font-display)", fontWeight: 700, color: "var(--ox-text)", lineHeight: 1.2 }}>
                      Toyota Corolla 2022
                    </h3>

                    <div style={{ fontSize: "0.8rem", color: "var(--ox-muted)" }}>XEi CVT</div>

                    <div style={{ fontSize: "0.78rem", color: "var(--ox-muted)", marginTop: 5, display: "flex", gap: 10 }}>
                      <span>48.000 km</span>
                      <span>Nafta</span>
                      <span>Automática</span>
                    </div>

                    {/* price + market badge */}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontFamily: "var(--ox-font-display)", fontSize: "1.05rem", fontWeight: 700, color: "var(--ox-text)" }}>
                        USD 22.500
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5, background: "rgba(34,197,94,0.10)", color: "var(--ox-green)", border: "1px solid rgba(34,197,94,0.20)", whiteSpace: "nowrap" }}>
                        3.2% debajo del mercado
                      </span>
                    </div>

                    {/* tags */}
                    <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {["Financiación", "Mantenimiento"].map((tag) => (
                        <span key={tag} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999, border: "1px solid var(--ox-border)", color: "var(--ox-muted)", background: "var(--ox-card-2)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* actions */}
                    <div className="vehicle-actions">
                      <button style={{ border: "1px solid var(--ox-border-accent)", background: "rgba(56,189,248,0.07)", color: "var(--ox-cyan)", borderRadius: 10, padding: "9px 12px", fontSize: 11, fontWeight: 700, cursor: "default" }}>
                        Consultar
                      </button>
                      <button style={{ border: "1px solid var(--ox-border)", background: "var(--ox-card-2)", color: "var(--ox-text-soft)", borderRadius: 10, padding: "9px 12px", fontSize: 11, fontWeight: 600, cursor: "default" }}>
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 10, color: "var(--ox-muted-2)", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                Badge Elite · score y benchmarking activos
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ PANEL DEALER ═══════════════════════ */}
        <div className="dp-section" id="dp-panel">
          <div className="dp-two-col">

            {/* left */}
            <div>
              <div className="dp-section-label">Panel Dealer</div>
              <h2 className="dp-section-title">
                Tu negocio, desde una sola pantalla
              </h2>
              <p className="dp-section-sub">
                Inventario, leads y métricas en tiempo real. Sin saltar entre apps ni planillas separadas.
              </p>

              <div className="dp-feature-list">
                {panelFeatures.map(({ label, desc }) => (
                  <div key={label} className="dp-feature-item">
                    <span className="dp-feature-check" />
                    <div>
                      <div className="dp-feature-label">{label}</div>
                      <div className="dp-feature-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* right — sticky panel mockup */}
            <div className="dp-col-sticky">
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
                      <p>24.4 por publicación</p>
                    </article>
                    <article className="dealer-status-card">
                      <span>Conversión</span>
                      <strong style={{ color: "var(--ox-green)" }}>4.1%</strong>
                      <p>vista → consulta</p>
                    </article>
                  </div>

                  {/* mini vehicles */}
                  <div className="dp-panel-vehicle-label">Inventario destacado</div>
                  <div className="dp-panel-vehicle-grid">
                    {mockVehicles.map((v) => (
                      <div key={v.name} className="dp-mini-veh" style={{ borderTop: `2px solid ${rankBorder[v.rank]}` }}>
                        <div className="dp-mini-veh-img">
                          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" style={{ opacity: 0.3 }}>
                            <path d="M6 12H30M6 12C4 12 2 11 2 9V7.5L6 5H13L16 2H20L23 5H30L34 7.5V9C34 11 32 12 30 12M6 12C6 13.1 6.9 14 8 14C9.1 14 10 13.1 10 12C10 10.9 9.1 10 8 10C6.9 10 6 10.9 6 12ZM30 12C30 13.1 29.1 14 28 14C26.9 14 26 13.1 26 12C26 10.9 26.9 10 28 10C29.1 10 30 10.9 30 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div className="dp-mini-veh-body">
                          <div className="dp-mini-veh-name">{v.name}</div>
                          <div className="dp-mini-veh-price">{v.price}</div>
                          <div className="dp-mini-veh-status">{v.leads} leads</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* leads */}
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
              <div className="dp-panel-mock-caption">Vista representativa del Panel de Control Dealer</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ BENEFICIOS ═══════════════════════ */}
        <div className="dp-section">
          <div className="dp-section-label">Por qué oX NEXMOV</div>
          <h2 className="dp-section-title">Tres razones concretas para sumarte ahora</h2>
          <p className="dp-section-sub" style={{ marginBottom: 28 }}>
            No es una plataforma más de publicaciones. Es la operación comercial de tu agencia, digitalizada.
          </p>

          <div className="dp-benefits">
            {benefits.map((b) => (
              <div key={b.title} className="dp-benefit-card">
                <div className="dp-benefit-stat">{b.stat}</div>
                <div className="dp-benefit-stat-label">{b.statLabel}</div>
                <div className="dp-benefit-divider" />
                <div className="dp-benefit-title">{b.title}</div>
                <div className="dp-benefit-text">{b.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════ OFERTA ═══════════════════════ */}
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
                    <strong>{item.label}</strong>{" "}{item.detail}
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

      {/* ═══════════════════════ CTA FINAL ═══════════════════════ */}
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
