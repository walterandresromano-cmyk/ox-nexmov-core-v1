import "../../styles/joinNetwork.css";
import { DEALER_PLANS } from "../../config/plans.js";

import { useEffect, useMemo, useState } from "react";
import { listPublicActiveDealers } from "../../services/dealers.service.js";

const dealerSignals = [
  "Dealers verificados",
  "Leads trazables",
  "Publicaciones con contexto",
];

const dealerChallenges = [
  {
    title: "Publicar no alcanza",
    text: "El comprador compara, duda, vuelve y necesita señales claras antes de avanzar con una consulta real.",
  },
  {
    title: "La confianza define el contacto",
    text: "Una publicación ordenada, con datos coherentes y trazabilidad comercial, mejora la percepción del dealer.",
  },
  {
    title: "Cada consulta tiene valor",
    text: "Registrar el lead antes del WhatsApp ayuda a cuidar el seguimiento y evita perder oportunidades comerciales.",
  },
];

const proposalCards = [
  {
    title: "Publicaciones premium",
    text: "Vehículos presentados con datos clave, fotos, precio, ubicación y contexto para decidir mejor.",
  },
  {
    title: "Leads trazables",
    text: "Cada consulta queda registrada antes de abrir el canal de contacto.",
  },
  {
    title: "Comparador para compradores",
    text: "El usuario puede comparar opciones y llegar al contacto con mayor claridad.",
  },
  {
    title: "Señales comerciales",
    text: "Badges, ranking y presencia visual ayudan a diferenciar la operación del dealer.",
  },
  {
    title: "Panel dealer mobile",
    text: "Una experiencia tipo app para revisar publicaciones, leads, tickets, plan y cupos.",
  },
  {
    title: "Soporte interno",
    text: "Tickets y comunicación con administración para ordenar correcciones y consultas.",
  },
];

const planCommercial = {
  inicio: {
    badge: "Entrada",
    badgeVariant: "entry",
    headline: "Presencia básica para empezar.",
    cup: "10 publicaciones",
    price: "$70.000",
    promoPrice: "$56.000",
    features: [
      "10 publicaciones por período.",
      "Panel dealer operativo.",
      "Leads trazables.",
      "Métricas esenciales.",
      "Soporte por ticket.",
    ],
    decoyNote: null,
    ctaLabel: "Solicitar Inicio",
    recommended: false,
  },
  pro: {
    badge: "Más cupo",
    badgeVariant: "capacity",
    headline: "Más cupo, sin herramientas avanzadas.",
    cup: "30 publicaciones",
    price: "$210.000",
    promoPrice: "$168.000",
    features: [
      "30 publicaciones por período.",
      "CRM de leads.",
      "Métricas esenciales.",
      "Mayor presencia visual.",
      "Cupo adicional con costo.",
    ],
    decoyNote: "Por poca diferencia, Elite suma 20 publicaciones más, Radar oX, Kit de redes y métricas avanzadas.",
    ctaLabel: "Solicitar Pro",
    recommended: false,
  },
  elite: {
    badge: "Recomendado",
    badgeVariant: "recommended",
    headline: "El plan más conveniente para aprovechar oX.",
    cup: "50 publicaciones",
    price: "$250.000",
    promoPrice: "$200.000",
    features: [
      "50 publicaciones por período.",
      "Radar oX Dealer.",
      "Métricas avanzadas.",
      "Kit de redes.",
      "Card promocional.",
      "Señales premium.",
      "Ranking inteligente de stock.",
      "Cupo adicional con costo.",
    ],
    decoyNote: null,
    ctaLabel: "Solicitar Elite",
    recommended: true,
  },
  platinum: {
    badge: "Alto volumen",
    badgeVariant: "premium",
    headline: "Para dealers grandes con operación intensiva.",
    cup: "Publicaciones ilimitadas",
    price: "$390.000",
    promoPrice: "$312.000",
    features: [
      "Publicaciones ilimitadas.",
      "Todo lo de Elite incluido.",
      "Soporte prioritario.",
      "Máxima presencia en la red.",
      "Prioridad en nuevas herramientas.",
    ],
    decoyNote: null,
    ctaLabel: "Solicitar Platinum",
    recommended: false,
  },
};

const workflowSteps = [
  "Solicitás el alta.",
  "Revisamos la agencia.",
  "Activamos tu plan.",
  "Cargás publicaciones.",
  "Recibís consultas trazables.",
  "Gestionás desde tu panel.",
];

const planOrder = ["inicio", "pro", "elite", "platinum"];

const publicDealerPlanLabels = {
  inicio: "Dealer verificado",
  pro: "Dealer Pro",
  elite: "Dealer Elite",
  platinum: "Dealer Platinum",
};

const publicDealerPlanClass = {
  inicio: "verified",
  pro: "pro",
  elite: "elite",
  platinum: "platinum",
};

function getDealerInitials(name) {
  return String(name || "oX")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDealerLocation(dealer) {
  return [dealer.city, dealer.province].filter(Boolean).join(", ");
}

function mapPublicDealerCard(dealer) {
  const plan = publicDealerPlanLabels[dealer.plan] ? dealer.plan : "inicio";
  const name = dealer.commercialName || dealer.name || "Dealer verificado";

  return {
    id: dealer.id,
    name,
    initials: getDealerInitials(name),
    location: formatDealerLocation(dealer),
    logo: dealer.logo || dealer.logoUrl || dealer.imageUrl || null,
    planClass: publicDealerPlanClass[plan],
    badge: publicDealerPlanLabels[plan],
    activeVehiclesCount: Number(dealer.activeVehiclesCount || 0),
  };
}

const PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
];

const initialRequestForm = {
  commercialName: "",
  contactName: "",
  email: "",
  whatsapp: "",
  province: "",
  city: "",
  plan: "",
  vehicleCount: "",
  message: "",
};

export default function JoinNetwork({ onNavigate }) {
  const [networkDealers, setNetworkDealers] = useState([]);
  const [isLoadingNetworkDealers, setIsLoadingNetworkDealers] = useState(true);
  const [requestPlan, setRequestPlan] = useState(null);
  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");

  const plans = planOrder
    .map((planId) => {
      const plan = DEALER_PLANS[planId];
      const commercial = planCommercial[planId];
      return plan && commercial ? { ...plan, ...commercial } : null;
    })
    .filter(Boolean);

  function openRequestForm(planId) {
    setRequestForm({ ...initialRequestForm, plan: planId });
    setRequestSent(false);
    setRequestPlan(planId);
    setTimeout(() => {
      document.getElementById("dealer-request-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function updateRequest(field, value) {
    setRequestForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();
    setRequestError("");
    setRequestLoading(true);

    const pid = requestForm.plan;
    const planName = pid ? `${pid.charAt(0).toUpperCase()}${pid.slice(1)}` : pid;
    const planInfo = planCommercial[pid];
    const planLine = planInfo
      ? `Dealer ${planName} — ${planInfo.cup} — Promo ${planInfo.promoPrice} / mes — Lista ${planInfo.price} / mes`
      : planName;

    try {
      const res = await fetch("/api/dealer-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercialName: requestForm.commercialName,
          contactName: requestForm.contactName,
          email: requestForm.email,
          whatsapp: requestForm.whatsapp,
          province: requestForm.province,
          city: requestForm.city,
          plan: planLine,
          vehicleCount: requestForm.vehicleCount || "No especificado",
          message: requestForm.message || "",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${res.status}`);
      }

      setRequestSent(true);
    } catch (err) {
      setRequestError(err.message || "No se pudo enviar la solicitud. Intentá nuevamente.");
    } finally {
      setRequestLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadPublicDealers() {
      setIsLoadingNetworkDealers(true);

      let dealers = [];

      try {
        const response = await listPublicActiveDealers();
        dealers = response.dealers || [];
      } catch {
        dealers = [];
      }

      if (!isMounted) return;

      setNetworkDealers(
        (dealers || [])
          .map(mapPublicDealerCard)
          .filter((dealer) => dealer.id && dealer.name)
          .slice(0, 8)
      );
      setIsLoadingNetworkDealers(false);
    }

    loadPublicDealers();

    return () => {
      isMounted = false;
    };
  }, []);

  const publicDealers = useMemo(() => networkDealers, [networkDealers]);

  return (
    <section className="page-section join-network-page">
      <div className="container panel join-network-panel">
        <section className="join-network-hero">
          <div className="join-network-hero-road" aria-hidden="true" />
          <div className="join-network-hero-copy">
            <p className="eyebrow ox-public-eyebrow">Red de dealers</p>

            <h1 className="ox-public-title">
              Sumá tu agencia a una nueva forma de{" "}
              <span>comercializar vehículos.</span>
            </h1>

            <p className="ox-public-lead">
              oX NEXMOV reúne publicaciones, consultas, herramientas
              comerciales y señales de confianza para que cada dealer trabaje
              con más claridad.
            </p>

            <div className="join-network-actions">
              <button type="button" onClick={() => onNavigate?.("login")}>
                Quiero sumar mi agencia
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => onNavigate?.("search")}
              >
                Ver publicaciones
              </button>
            </div>
          </div>

          <div className="join-network-hero-brand" aria-hidden="true">
            <img
              className="join-network-hero-logo"
              src="/hero-car.svg"
              alt=""
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        </section>

        <section className="join-network-problem">
          <div className="join-network-section-head">
            <p className="eyebrow">Contexto comercial</p>
            <h2>Una red pensada para vender con más claridad.</h2>
            <p>
              Presencia, señales comerciales y trazabilidad reunidas en una
              experiencia que mejora la percepción de cada agencia.
            </p>
          </div>

          <div className="join-network-values">
            {dealerChallenges.map((item) => (
              <article key={item.title} className="join-network-value-card">
                <span>Desafío</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="join-network-section join-network-proposal">
          <div className="join-network-section-head">
            <p className="eyebrow">Propuesta oX NEXMOV</p>
            <h2>
              Una red donde el comprador decide con claridad y el dealer trabaja
              con mejores herramientas.
            </h2>
            <p>
              Publicaciones claras, leads trazables y herramientas comerciales
              para convertir mejor cada oportunidad.
            </p>
          </div>

          <div className="join-network-proposal-grid">
            {proposalCards.map((item) => (
              <article key={item.title} className="join-network-proposal-card">
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <p className="join-network-commercial-note">
            oX NEXMOV no garantiza volumen de consultas ni ventas. Las
            herramientas disponibles dependen del plan contratado, beneficios
            habilitados y estado de la beta comercial.
          </p>
        </section>


        <section className="join-network-section join-network-plan-section">
          <div className="join-network-section-head">
            <p className="eyebrow">Planes dealer</p>
            <h2>Elegí cómo querés vender dentro de oX.</h2>
            <p>
              Planes pensados para publicar, gestionar leads y acceder a
              herramientas comerciales según el nivel de operación de tu dealer.
            </p>
            <p className="jnp-pilot-note">
              Durante la etapa piloto, la activación se realiza con validación
              administrativa previa.
            </p>
          </div>

          <div className="join-network-plans jnp-grid">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`join-network-plan-card join-network-plan-${plan.rankTheme}${plan.recommended ? " jnp-card--recommended" : ""}`}
              >
                {/* Badge */}
                <div className={`jnp-badge jnp-badge--${plan.badgeVariant}`}>
                  {plan.badge}
                </div>

                {/* Plan name + headline */}
                <div className="jnp-head">
                  <strong className="jnp-plan-name">{plan.rankLabel}</strong>
                  <p className="jnp-headline">{plan.headline}</p>
                </div>

                {/* Price block */}
                <div className="jnp-price">
                  <div className="jnp-price-top">
                    <span className="jnp-price-list">{plan.price}</span>
                    <span className="jnp-price-promo-badge">20% OFF piloto</span>
                  </div>
                  <div className="jnp-price-main">
                    <span className="jnp-price-amount">{plan.promoPrice}</span>
                    <span className="jnp-price-period">/ mes</span>
                  </div>
                  <span className="jnp-price-promo-note">Promoción válida durante la etapa piloto.</span>
                </div>

                {/* Cup summary */}
                <div className="jnp-cup">
                  <span>{plan.cup}</span>
                </div>

                {/* Feature list */}
                <ul className="jnp-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                {/* Decoy nudge (Pro only) */}
                {plan.decoyNote && (
                  <p className="jnp-decoy-note">{plan.decoyNote}</p>
                )}

                {/* CTA */}
                <button
                  type="button"
                  className={plan.recommended ? "jnp-cta jnp-cta--primary" : "jnp-cta"}
                  onClick={() => openRequestForm(plan.id)}
                >
                  {plan.ctaLabel}
                </button>
              </article>
            ))}
          </div>

          {/* ── Cupos adicionales ── */}
          <div className="jnp-extras">
            <div className="jnp-extras-head">
              <strong>Cupos adicionales</strong>
              <p>
                Inicio, Pro y Elite pueden solicitar cupo extra con costo. La
                aprobación queda sujeta a validación administrativa de oX.
              </p>
            </div>
            <div className="jnp-extras-grid">
              <div className="jnp-extras-item">
                <span>Publicación suelta</span>
                <strong>$10.000</strong>
              </div>
              <div className="jnp-extras-item">
                <span>Pack +5 publicaciones</span>
                <strong>$45.000</strong>
              </div>
              <div className="jnp-extras-item">
                <span>Pack +10 publicaciones</span>
                <strong>$80.000</strong>
              </div>
            </div>
            <p className="jnp-extras-note">
              Los cupos adicionales aplican al período comercial vigente y no se
              acumulan automáticamente.
            </p>
          </div>

          {/* ── Formulario de solicitud ── */}
          {requestPlan && (
            <div id="dealer-request-form" className="jnp-request-wrap">
              {requestSent ? (
                <div className="jnp-request-sent">
                  <strong>Solicitud recibida</strong>
                  <p>
                    El equipo de oX revisará los datos comerciales y se
                    comunicará para avanzar con la activación del plan.
                  </p>
                  <button
                    type="button"
                    className="jnp-cta"
                    onClick={() => { setRequestPlan(null); setRequestSent(false); }}
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form className="jnp-request-form" onSubmit={handleRequestSubmit}>
                  <div className="jnp-request-head">
                    <div>
                      <strong>Solicitud de alta dealer</strong>
                      <p>
                        Completá los datos y te contactamos para avanzar con
                        la activación.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="jnp-request-close"
                      aria-label="Cerrar formulario"
                      onClick={() => setRequestPlan(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="jnp-request-grid">
                    <label className="jnp-request-label">
                      Nombre comercial *
                      <input
                        required
                        value={requestForm.commercialName}
                        onChange={(e) => updateRequest("commercialName", e.target.value)}
                        placeholder="Nombre de la agencia"
                      />
                    </label>

                    <label className="jnp-request-label">
                      Responsable *
                      <input
                        required
                        value={requestForm.contactName}
                        onChange={(e) => updateRequest("contactName", e.target.value)}
                        placeholder="Tu nombre"
                      />
                    </label>

                    <label className="jnp-request-label">
                      Email *
                      <input
                        required
                        type="email"
                        value={requestForm.email}
                        onChange={(e) => updateRequest("email", e.target.value)}
                        placeholder="contacto@agencia.com"
                      />
                    </label>

                    <label className="jnp-request-label">
                      WhatsApp *
                      <input
                        required
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        value={requestForm.whatsapp}
                        onChange={(e) => updateRequest("whatsapp", e.target.value)}
                        placeholder="11 3806 2294"
                      />
                    </label>

                    <label className="jnp-request-label">
                      Provincia *
                      <select
                        required
                        value={requestForm.province}
                        onChange={(e) => updateRequest("province", e.target.value)}
                      >
                        <option value="">Seleccioná</option>
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </label>

                    <label className="jnp-request-label">
                      Ciudad *
                      <input
                        required
                        value={requestForm.city}
                        onChange={(e) => updateRequest("city", e.target.value)}
                        placeholder="Tu ciudad"
                      />
                    </label>

                    <label className="jnp-request-label">
                      Plan de interés *
                      <select
                        required
                        value={requestForm.plan}
                        onChange={(e) => updateRequest("plan", e.target.value)}
                      >
                        <option value="">Seleccioná</option>
                        {planOrder.map((id) => (
                          <option key={id} value={id}>
                            {planCommercial[id]
                              ? `Dealer ${id.charAt(0).toUpperCase()}${id.slice(1)} — ${planCommercial[id].cup} — ${planCommercial[id].promoPrice}/mes (promo 20%)`
                              : id}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="jnp-request-label">
                      Vehículos aprox.
                      <input
                        value={requestForm.vehicleCount}
                        onChange={(e) => updateRequest("vehicleCount", e.target.value)}
                        placeholder="Ej: 15"
                        type="number"
                        min="1"
                      />
                    </label>
                  </div>

                  <label className="jnp-request-label jnp-request-label--full">
                    Mensaje (opcional)
                    <textarea
                      value={requestForm.message}
                      onChange={(e) => updateRequest("message", e.target.value)}
                      placeholder="Algo que quieras contarnos sobre tu operación"
                      rows={3}
                    />
                  </label>

                  <p className="jnp-request-note">
                    Tu solicitud llegará al equipo de oX NEXMOV. Te contactaremos
                    para validar los datos y activar el plan.
                  </p>

                  {requestError && (
                    <div className="auth-warning">{requestError}</div>
                  )}

                  <button
                    type="submit"
                    className="jnp-cta jnp-cta--primary jnp-request-submit"
                    disabled={requestLoading}
                  >
                    {requestLoading ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="join-network-commercial-note">
            Los valores promocionales corresponden a la etapa piloto y pueden
            actualizarse al finalizar el período comercial acordado. Los planes
            definen cupos, visibilidad y herramientas de trabajo. La contratación
            no garantiza resultados comerciales, leads ni ventas. La activación
            queda sujeta a validación administrativa de oX.
          </p>
        </section>

        <section className="join-network-section join-network-difference">
          <div className="join-network-section-head">
            <p className="eyebrow">Diferenciación por plan</p>
            <h2>Más herramientas comerciales, sin confundir al comprador.</h2>
            <p>
              Todos los planes permiten que el comprador compare vehículos. La
              diferencia entre planes no bloquea funciones útiles al comprador:
              se expresa en cupos, señales, prioridad visual, métricas y
              herramientas comerciales.
            </p>
          </div>
        </section>

        <section className="join-network-section">
          <div className="join-network-section-head">
            <p className="eyebrow">Alta dealer</p>
            <h2>Un ingreso simple a una operación más ordenada.</h2>
          </div>

          <div className="join-network-steps">
            {workflowSteps.map((step, index) => (
              <article key={step} className="join-network-step-card">
                <strong>{index + 1}</strong>
                <div>
                  <h3>{step}</h3>
                  <p>
                    {index === 0
                      ? "La agencia inicia el alta desde el acceso operativo."
                      : "Cada etapa suma contexto para trabajar mejor dentro de la red."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="join-network-final">
          <div>
            <p className="eyebrow">Próximo paso</p>
            <h2>Convertí tu stock en una experiencia de compra más clara.</h2>
            <p>
              Solicitá el alta como dealer y prepará tu operación para trabajar
              con publicaciones premium, leads trazables y una red diseñada para
              vender con más confianza.
            </p>
          </div>

          <div className="join-network-final-actions">
            <button type="button" onClick={() => onNavigate?.("login")}>
              Solicitar alta como dealer
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate?.("search")}
            >
              Ver publicaciones
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
