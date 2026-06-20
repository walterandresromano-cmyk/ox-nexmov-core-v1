import "../../styles/joinNetwork.css";
import { DEALER_PLANS } from "../../config/plans.js";

import { useEffect, useMemo, useRef, useState } from "react";
import { listPublicActiveDealers } from "../../services/dealers.service.js";
import { checkPromoCodeAvailable, claimPromoCode } from "../../services/promoCodes.service.js";

const dealerSignals = [
  "Vendedores verificados",
  "Consultas registradas",
  "Publicaciones con contexto",
];

const dealerChallenges = [
  {
    title: "Publicar no alcanza",
    text: "El comprador compara, duda, vuelve y necesita señales claras antes de avanzar con una consulta real.",
  },
  {
    title: "La confianza define el contacto",
    text: "Una publicación ordenada, con datos coherentes y claros, mejora la percepción del vendedor.",
  },
  {
    title: "Cada consulta tiene valor",
    text: "Registrar la consulta antes del WhatsApp ayuda a cuidar el seguimiento y evita perder oportunidades.",
  },
];

const proposalCards = [
  {
    title: "Publicaciones premium",
    text: "Vehículos presentados con datos clave, fotos, precio, ubicación y contexto para decidir mejor.",
  },
  {
    title: "Consultas registradas",
    text: "Cada consulta queda registrada antes de abrir el canal de contacto.",
  },
  {
    title: "Comparador para compradores",
    text: "El usuario puede comparar opciones y llegar al contacto con mayor claridad.",
  },
  {
    title: "Señales comerciales",
    text: "Badges, ranking y presencia visual ayudan a diferenciar la operación del vendedor.",
  },
  {
    title: "Panel del vendedor",
    text: "Una experiencia tipo app para revisar publicaciones, consultas, tickets, plan y cupos.",
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
      "Panel del vendedor.",
      "Consultas registradas.",
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
      "Gestión de consultas.",
      "Métricas esenciales.",
      "Mayor presencia visual.",
      "Cupo adicional con costo.",
    ],
    decoyNote: null,
    ctaLabel: "Solicitar Pro",
    recommended: false,
  },
  elite: {
    badge: "Más funciones",
    badgeVariant: "capacity",
    headline: "Herramientas avanzadas para operar con oX.",
    cup: "50 publicaciones",
    price: "$250.000",
    promoPrice: "$200.000",
    features: [
      "50 publicaciones por período.",
      "Radar oX.",
      "Métricas avanzadas.",
      "Kit de redes.",
      "Card promocional.",
      "Señales premium.",
      "Ranking inteligente de stock.",
      "Cupo adicional con costo.",
    ],
    decoyNote: null,
    ctaLabel: "Solicitar Elite",
    recommended: false,
  },
  platinum: {
    badge: "Alto volumen",
    badgeVariant: "premium",
    headline: "Para agencias grandes con operación intensiva.",
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
  "Recibís consultas registradas.",
  "Gestionás desde tu panel.",
];

const planOrder = ["inicio", "pro", "elite", "platinum"];

const publicDealerPlanLabels = {
  inicio: "Vendedor verificado",
  pro: "Vendedor Pro",
  elite: "Vendedor Elite",
  platinum: "Vendedor Platinum",
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
  const name = dealer.commercialName || dealer.name || "Vendedor verificado";

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
  activationCode: "",
  message: "",
};

export default function JoinNetwork({ onNavigate, routeParams }) {
  const [networkDealers, setNetworkDealers] = useState([]);
  const [isLoadingNetworkDealers, setIsLoadingNetworkDealers] = useState(true);
  const [requestPlan, setRequestPlan] = useState(null);
  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [promoStatus, setPromoStatus] = useState(null); // null | "checking" | "valid" | "invalid" | "exhausted"
  const [fieldErrors, setFieldErrors] = useState({});
  const promoDebounceRef = useRef(null);

  useEffect(() => {
    if (routeParams?.openForm) {
      openRequestForm("inicio");
    }
  }, []);

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

  function validateField(field, value) {
    let error = "";
    if (field === "email") {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRe.test(value)) error = "El email no parece válido.";
    }
    if (field === "whatsapp") {
      const digits = String(value || "").replace(/\D/g, "");
      if (value && digits.length < 10) error = "Ingresá al menos 10 dígitos.";
    }
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  }

  function updateRequest(field, value) {
    setRequestForm((prev) => ({ ...prev, [field]: value }));

    if (field === "activationCode") {
      const code = String(value || "").trim().toUpperCase();
      clearTimeout(promoDebounceRef.current);
      if (!code) { setPromoStatus(null); return; }
      setPromoStatus("checking");
      promoDebounceRef.current = setTimeout(async () => {
        const result = await checkPromoCodeAvailable(code);
        if (!result.available && result.reason === "invalid") setPromoStatus("invalid");
        else if (!result.available && result.reason === "exhausted") setPromoStatus("exhausted");
        else if (result.available) setPromoStatus("valid");
      }, 400);
    }
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
          activationCode: requestForm.activationCode || "",
          message: requestForm.message || "",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${res.status}`);
      }

      if (requestForm.activationCode) {
        const claim = await claimPromoCode(requestForm.activationCode, requestForm.email);
        if (!claim.ok) {
          setRequestError(
            claim.reason === "exhausted"
              ? "Este código ya alcanzó su límite de activaciones. No se pudo aplicar el beneficio."
              : "El código de activación no es válido."
          );
          setPromoStatus(claim.reason === "exhausted" ? "exhausted" : "invalid");
          setRequestLoading(false);
          return;
        }
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
            <p className="eyebrow ox-public-eyebrow">Red de vendedores</p>

            <h1 className="ox-public-title">
              Sumá tu agencia a una nueva forma de{" "}
              <span>comercializar vehículos.</span>
            </h1>

            <p className="ox-public-lead">
              oX NEXMOV reúne publicaciones, consultas, herramientas
              comerciales y señales de confianza para que cada vendedor trabaje
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
              Presencia, señales comerciales y consultas ordenadas reunidas en una
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
              Una red donde el comprador decide con claridad y el vendedor trabaja
              con mejores herramientas.
            </h2>
            <p>
              Publicaciones claras, consultas registradas y herramientas comerciales
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
            herramientas disponibles dependen del plan contratado y los
            beneficios habilitados.
          </p>
        </section>


        <section className="join-network-section join-network-plan-section">
          <div className="join-network-section-head">
            <p className="eyebrow">Planes de vendedor</p>
            <h2>Elegí cómo querés vender dentro de oX.</h2>
            <p>
              Planes pensados para publicar, gestionar consultas y acceder a
              herramientas comerciales según el nivel de operación de tu agencia.
            </p>
            <p className="jnp-pilot-note">
              La activación se realiza con validación administrativa previa.
            </p>
          </div>

          <div className="join-network-plans jnp-grid jnp-grid-enter">
            {plans.map((plan, idx) => (
              <article
                key={plan.id}
                className={`join-network-plan-card join-network-plan-${plan.rankTheme} jnp-plan-tilt`}
                style={{ "--jnp-enter-delay": `${idx * 80}ms` }}
                onMouseMove={(e) => {
                  const card = e.currentTarget;
                  const { left, top, width, height } = card.getBoundingClientRect();
                  const x = (e.clientX - left) / width  - 0.5;
                  const y = (e.clientY - top)  / height - 0.5;
                  card.style.transform = `perspective(800px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) scale3d(1.02,1.02,1.02)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
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
                    <span className="jnp-price-promo-badge">20% OFF</span>
                  </div>
                  <div className="jnp-price-main">
                    <span className="jnp-price-amount">{plan.promoPrice}</span>
                    <span className="jnp-price-period">/ mes</span>
                  </div>
                  <span className="jnp-price-promo-note">Promoción por tiempo limitado.</span>
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

                {/* CTA + WhatsApp */}
                <div className="jnp-card-actions">
                  <button
                    type="button"
                    className="jnp-cta"
                    onClick={() => openRequestForm(plan.id)}
                  >
                    {plan.ctaLabel}
                  </button>
                  <button
                    type="button"
                    className="jnp-wa-btn"
                    onClick={() => window.open(`https://wa.me/${import.meta.env.VITE_CONTACT_WA}?text=${encodeURIComponent(`Hola oX NEXMOV, quiero consultar sobre el plan ${plan.rankLabel}.`)}`, "_blank", "noopener,noreferrer")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Consultar por WhatsApp
                  </button>
                </div>
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
                <span>Cupo extra (x1)</span>
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

          <aside className="jnp-nocomision-note">
            <strong>Sin comisión por operación.</strong>
            <span>El plan mensual es tu único costo fijo. oX no cobra ningún porcentaje sobre las ventas que cerrás.</span>
          </aside>

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
                      <strong>Solicitud de alta</strong>
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

                  {planCommercial[requestPlan] && (
                    <div className="jnp-form-plan-summary">
                      <div className="jnp-fps-info">
                        <strong className="jnp-fps-name">
                          {requestPlan.charAt(0).toUpperCase() + requestPlan.slice(1)}
                        </strong>
                        <span className="jnp-fps-cup">{planCommercial[requestPlan].cup}</span>
                      </div>
                      <div className="jnp-fps-price">
                        <s>{planCommercial[requestPlan].price}</s>
                        <strong>
                          {planCommercial[requestPlan].promoPrice}
                          <span>/mes</span>
                        </strong>
                        <span className="jnp-fps-promo">20% OFF · Promo por tiempo limitado</span>
                      </div>
                    </div>
                  )}

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
                        onBlur={(e) => validateField("email", e.target.value)}
                        placeholder="contacto@agencia.com"
                        className={fieldErrors.email ? "jnp-input--error" : ""}
                      />
                      {fieldErrors.email && (
                        <span className="jnp-field-error">{fieldErrors.email}</span>
                      )}
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
                        onBlur={(e) => validateField("whatsapp", e.target.value)}
                        placeholder="11 XXXX XXXX"
                        className={fieldErrors.whatsapp ? "jnp-input--error" : ""}
                      />
                      {fieldErrors.whatsapp && (
                        <span className="jnp-field-error">{fieldErrors.whatsapp}</span>
                      )}
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
                              ? `Vendedor ${id.charAt(0).toUpperCase()}${id.slice(1)} — ${planCommercial[id].cup} — ${planCommercial[id].promoPrice}/mes (promo 20%)`
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
                    Código de activación (opcional)
                    <input
                      value={requestForm.activationCode}
                      onChange={(e) =>
                        updateRequest("activationCode", e.target.value.toUpperCase())
                      }
                      placeholder="Ingresá tu código"
                      autoComplete="off"
                    />
                  </label>

                  {promoStatus === "checking" && (
                    <div className="auth-message">Verificando código…</div>
                  )}
                  {promoStatus === "valid" && (
                    <div className="auth-message">
                      Código válido — 60 días de activación gratuita a partir del alta.
                    </div>
                  )}
                  {promoStatus === "exhausted" && (
                    <div className="auth-warning">
                      Este código ya alcanzó su límite de activaciones disponibles.
                    </div>
                  )}
                  {promoStatus === "invalid" && (
                    <div className="auth-warning">
                      Código no reconocido. Verificá que esté bien escrito.
                    </div>
                  )}

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
            Los valores promocionales pueden actualizarse al finalizar el
            período comercial acordado. Los planes definen cupos, visibilidad
            y herramientas de trabajo. La contratación no garantiza resultados
            comerciales, consultas ni ventas. La activación queda sujeta a
            validación administrativa de oX.
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
            <p className="eyebrow">Solicitar alta</p>
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
                      : "Cada paso suma herramientas para trabajar mejor dentro de la red."}
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
              Solicitá el alta como vendedor y prepará tu operación para trabajar
              con publicaciones premium, consultas registradas y una red diseñada para
              vender con más confianza.
            </p>
          </div>

          <div className="join-network-final-actions">
            <button type="button" onClick={() => onNavigate?.("login")}>
              Solicitar alta como vendedor
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate?.("search")}
            >
              Ver publicaciones
            </button>

            <button
              type="button"
              className="jnp-wa-btn"
              onClick={() => window.open(`https://wa.me/${import.meta.env.VITE_CONTACT_WA}?text=${encodeURIComponent("Hola oX NEXMOV, quiero consultar sobre los planes de vendedor.")}`, "_blank", "noopener,noreferrer")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Consultar por WhatsApp
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
