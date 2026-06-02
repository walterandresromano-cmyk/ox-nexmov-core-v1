import { useEffect, useMemo, useRef, useState } from "react";

import CreateVehicleModal from "../../components/CreateVehicleModal.jsx";

import DealerInventoryModule from "./DealerInventoryModule.jsx";
import DealerLeadsModule from "./DealerLeadsModule.jsx";
import DealerSupportModule from "./DealerSupportModule.jsx";
import DealerSellVehicleModule from "./DealerSellVehicleModule.jsx";
import DealerMetricsModule from "./DealerMetricsModule.jsx";
import DealerUrgentModule from "./DealerUrgentModule.jsx";
import DealerRadarModule from "./DealerRadarModule.jsx";

import {
  canDealerPublish,
  getEffectiveDealerPermissions,
} from "../../lib/permissions.js";
import { normalizeWhatsAppArgentina, formatRelativeTime } from "../../lib/formatters.js";
import { getPublicationScore } from "../../lib/publicationScore.js";
import { formatLimit, getPlanAlertClass, getPlanAlertLabel } from "../../lib/dealerPlan.js";

import {
  listDealersForCurrentUser,
  uploadCurrentDealerLogo,
  updateDealerWhatsappById,
  updateDealerProfileById,
} from "../../services/dealers.service.js";
import { listVehiclesForCurrentDealer } from "../../services/dealerVehicles.service.js";
import { listVehicleLeadsForCurrentUser } from "../../services/leads.service.js";
import { listSupportTicketsForCurrentUser } from "../../services/tickets.service.js";
import { listSellVehicleLeadsForCurrentDealer } from "../../services/sellVehicle.service.js";
import { listDealerNotifications, markDealerNotificationsRead } from "../../services/dealerNotifications.service.js";

const PLAN_TIERS = [
  {
    id: "inicio",
    label: "Inicio",
    quota: "5 publicaciones",
    features: [
      "5 publicaciones por período",
      "Señales básicas en publicaciones",
      "Métricas de vistas",
      "Financiación informativa",
    ],
    locked: [
      "Financiación completa",
      "Señales premium",
      "Métricas de conversión",
      "Oportunidades VMV",
      "Soporte prioritario",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    quota: "15 publicaciones",
    features: [
      "15 publicaciones por período",
      "Señales avanzadas",
      "Métricas de conversión",
      "Financiación completa",
      "Datos de mantenimiento",
    ],
    locked: [
      "Señales premium",
      "Métricas de respuesta",
      "Oportunidades VMV",
      "Soporte prioritario",
    ],
  },
  {
    id: "elite",
    label: "Elite",
    quota: "30 publicaciones",
    features: [
      "30 publicaciones por período",
      "Señales premium en todas las cards",
      "Métricas completas",
      "Financiación completa",
      "Oportunidades Vender mi vehículo",
      "Badge Elite visible",
    ],
    locked: [
      "Publicaciones ilimitadas",
      "Soporte prioritario",
    ],
  },
  {
    id: "platinum",
    label: "Platinum",
    quota: "Ilimitadas",
    features: [
      "Publicaciones ilimitadas",
      "Señales completas con badge Platinum",
      "Métricas completas y avanzadas",
      "Financiación completa",
      "Oportunidades Vender mi vehículo",
      "Soporte con prioridad Platinum",
    ],
    locked: [],
  },
];

const PLAN_ORDER = ["inicio", "pro", "elite", "platinum"];

const DEALER_MOBILE_SECTIONS = [
  { id: "home", label: "Resumen" },
  { id: "vehicles", label: "Publicaciones" },
  { id: "leads", label: "Leads" },
  { id: "tickets", label: "Soporte" },
  { id: "publish", label: "Publicar" },
  { id: "metrics", label: "Métricas" },
  { id: "plan", label: "Ajustes" },
];

const DEALER_FEATURE_PREVIEWS = [
  {
    id: "financing",
    title: "Financiación avanzada",
    requiredPlan: "Pro",
    description:
      "Mejora la lectura comercial de publicaciones con condiciones de financiación más claras.",
  },
  {
    id: "metrics",
    title: "Métricas comerciales",
    requiredPlan: "Elite",
    description:
      "Entendé rendimiento, consultas y oportunidades para priorizar mejor tu stock.",
  },
  {
    id: "premiumSignals",
    title: "Señales premium",
    requiredPlan: "Elite",
    description:
      "Destacá publicaciones con señales de confianza, precio y calidad del dato.",
  },
  {
    id: "sellVehicle",
    title: "Oportunidades Vender mi vehículo",
    requiredPlan: "Elite",
    description:
      "Recibí oportunidades comerciales asignadas por administración para evaluar unidades.",
  },
  {
    id: "visibility",
    title: "Visibilidad destacada",
    requiredPlan: "Elite",
    description:
      "Aumentá presencia dentro de la red con beneficios de posicionamiento y lectura premium.",
  },
  {
    id: "maintenance",
    title: "Mantenimiento orientativo",
    requiredPlan: "Pro",
    description:
      "Sumá contexto útil sobre mantenimiento para mejorar confianza en cada publicación.",
  },
  {
    id: "extraQuota",
    title: "Cupos extra / beneficios",
    requiredPlan: "Admin",
    description:
      "Solicitá cupos temporales o beneficios comerciales especiales para campañas puntuales.",
  },
  {
    id: "prioritySupport",
    title: "Soporte prioritario",
    requiredPlan: "Platinum",
    description:
      "Gestioná consultas operativas con prioridad superior en cuentas de mayor volumen.",
  },
];


function getPlanStatusLabel(status) {
  const labels = {
    active: "Activo",
    expiring: "Por vencer",
    expired: "Vencido",
    expired_grace: "Período de gracia",
    pending_activation: "Pendiente de activación",
    suspended: "Suspendido",
    inactive: "Inactivo",
  };

  return labels[status] || status || "Sin estado";
}

function getPlanStatusDescription(status, expiresInDays) {
  if (status === "expiring") {
    return `Tu plan está por vencer en ${expiresInDays} días. Podés seguir publicando hasta que termine el período activo.`;
  }

  if (status === "expired_grace") {
    return "Tu plan venció y estás dentro del período de gracia. Podés consultar información existente, pero no crear nuevas publicaciones hasta reactivar tu plan.";
  }

  if (status === "expired") {
    return "Tu plan comercial venció. Contactá a administración para reactivarlo.";
  }

  if (status === "suspended") {
    return "Tu cuenta se encuentra suspendida operativamente. Contactá a administración para reactivar el servicio.";
  }

  if (status === "pending_activation") {
    return "Tu plan está pendiente de activación por administración.";
  }

  if (status === "inactive") {
    return "No hay un plan comercial activo para este dealer.";
  }

  return "Estado del plan normal. Si tenés dudas, consultá con administración.";
}

function getPlanStatusAlertClass(status, expiresInDays) {
  if (status === "expired" || status === "expired_grace") {
    return "plan-alert expired";
  }

  if (status === "suspended") {
    return "plan-alert critical";
  }

  if (status === "pending_activation") {
    return "plan-alert warning";
  }

  return getPlanAlertClass(expiresInDays);
}

function getPublishBlockReason(status, allowed, remaining) {
  if (allowed) {
    return "";
  }

  if (remaining <= 0) {
    return "No tenés cupo disponible para este período comercial.";
  }

  if (status === "expired_grace") {
    return "Plan vencido y en período de gracia. No podés crear nuevas publicaciones hasta reactivar el plan.";
  }

  if (status === "expired") {
    return "Plan vencido. Contactá a administración para reactivarlo.";
  }

  if (status === "suspended") {
    return "Cuenta suspendida. Contactá a administración.";
  }

  if (status === "pending_activation") {
    return "Plan pendiente de activación por administración.";
  }

  if (status === "inactive") {
    return "No hay plan comercial activo. Contactá a administración.";
  }

  return "No podés publicar con el estado actual del plan. Contactá a administración si necesitás ayuda.";
}

function getPublishBlockDetail(status, remaining) {
  if (remaining <= 0) {
    return "Ya utilizaste el cupo de publicaciones de este período. Podés solicitar cupo extra a administración.";
  }

  if (status === "expired_grace" || status === "expired") {
    return "Tu plan venció. Podés consultar tus publicaciones y leads, pero necesitás reactivar el plan para volver a publicar.";
  }

  if (status === "suspended") {
    return "Tu cuenta está suspendida operativamente. Contactá a administración para revisar la situación.";
  }

  if (status === "pending_activation") {
    return "Tu cuenta está pendiente de activación. Administración debe habilitar tu plan para comenzar a publicar.";
  }

  if (status === "inactive") {
    return "No detectamos un plan comercial activo. Contactá a administración para revisar la cuenta.";
  }

  return "Contactá a administración para revisar el estado comercial y recuperar la posibilidad de publicar.";
}

function getRemainingQuota(limit, used) {
  if (limit === Infinity) return "Ilimitado";
  return Math.max(limit - used, 0);
}

function getPlanCapacityLabel({ isPlatinum, used, limit }) {
  if (isPlatinum) return "Publicaciones ilimitadas";
  return `${used} / ${formatLimit(limit)}`;
}

function getPlanSecondaryCapacityLabel({ isPlatinum, used, remaining }) {
  if (isPlatinum) {
    return `${used} publicaciones creadas en este período`;
  }

  return `Disponibles: ${remaining}.`;
}

function getPlanBenefitBadges(permissions, isPlatinum) {
  if (isPlatinum) {
    return [
      "Publicaciones ilimitadas",
      "Señales completas",
      "Métricas completas incluidas",
      "Financiación completa",
      "Oportunidades comerciales",
      "Soporte prioritario",
    ];
  }

  const badges = [
    `${formatLimit(permissions.vehicleLimit)} publicaciones`,
    `Señales ${permissions.badgeVisibility}`,
    `Métricas ${permissions.metricsLevel}`,
  ];

  if (permissions.fullFinancingTools) {
    badges.push("Financiación completa");
  }

  if (permissions.sellVehicleLeads) {
    badges.push("Oportunidades comerciales");
  }

  return badges;
}

export default function DealerPanel({ authProfile, onNavigate }) {
  const [activeDealerModule, setActiveDealerModule] = useState("summary");
  const [activeDealerMobileSection, setActiveDealerMobileSection] =
    useState("home");

  const [dealers, setDealers] = useState([]);
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [dealersError, setDealersError] = useState("");

  const [sellVehicleLeads, setSellVehicleLeads] = useState([]);
  const [loadingSellVehicleLeads, setLoadingSellVehicleLeads] = useState(true);
  const [sellVehicleLeadsError, setSellVehicleLeadsError] = useState("");

  const [dealerVehicles, setDealerVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");

  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState("");

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [markingRead, setMarkingRead] = useState(false);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [leadsInitialContext, setLeadsInitialContext] = useState(null);
  const [inventoryInitialContext, setInventoryInitialContext] = useState(null);

  const [whatsappForm, setWhatsappForm] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState("");
  const [whatsappSuccess, setWhatsappSuccess] = useState("");
  const [uploadingDealerLogo, setUploadingDealerLogo] = useState(false);
  const [dealerLogoError, setDealerLogoError] = useState("");
  const [dealerLogoSuccess, setDealerLogoSuccess] = useState("");
  const dealerLogoInputRef = useRef(null);

  const [profileForm, setProfileForm] = useState({ name: "", city: "", province: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  async function loadDealers() {
    setLoadingDealers(true);
    setDealersError("");

    const { dealers: supabaseDealers, error } =
      await listDealersForCurrentUser();

    if (error) {
      setDealers([]);
      setSelectedDealerId(null);
      setDealersError(
        error.message ||
          "No pudimos cargar tu cuenta dealer. Reintentá o contactá a soporte."
      );
      setLoadingDealers(false);
      return;
    }

    if (!supabaseDealers.length) {
      setDealers([]);
      setSelectedDealerId(null);
      setDealersError(
        "No tenés un dealer asociado a este usuario. Contactá a soporte para revisar la vinculación de la cuenta."
      );
      setLoadingDealers(false);
      return;
    }

    setDealers(supabaseDealers);

    setSelectedDealerId((current) => {
      const stillExists = supabaseDealers.some(
        (dealer) => dealer.id === current
      );

      return stillExists ? current : supabaseDealers[0]?.id;
    });

    setLoadingDealers(false);
  }

  async function loadDealerVehicles() {
    setLoadingVehicles(true);
    setVehiclesError("");

    const { vehicles, error } = await listVehiclesForCurrentDealer();

    if (error) {
      setDealerVehicles([]);
      setVehiclesError(error.message || "No se pudieron cargar los vehículos.");
      setLoadingVehicles(false);
      return;
    }

    setDealerVehicles(vehicles || []);
    setLoadingVehicles(false);
  }

  async function loadSellVehicleLeads() {
    setLoadingSellVehicleLeads(true);
    setSellVehicleLeadsError("");

    const { leads: supabaseLeads, error } =
      await listSellVehicleLeadsForCurrentDealer();

    if (error) {
      setSellVehicleLeads([]);
      setSellVehicleLeadsError(
        error.message || "No se pudieron cargar oportunidades de venta."
      );
      setLoadingSellVehicleLeads(false);
      return;
    }

    setSellVehicleLeads(supabaseLeads || []);
    setLoadingSellVehicleLeads(false);
  }

  async function loadLeads() {
    setLoadingLeads(true);
    setLeadsError("");

    const { leads: supabaseLeads, error } =
      await listVehicleLeadsForCurrentUser();

    if (error) {
      setLeads([]);
      setLeadsError(error.message || "No se pudieron cargar los leads.");
      setLoadingLeads(false);
      return;
    }

    setLeads(supabaseLeads || []);
    setLoadingLeads(false);
  }

  async function loadTickets() {
    setLoadingTickets(true);
    setTicketsError("");

    const { tickets: supabaseTickets, error } =
      await listSupportTicketsForCurrentUser();

    if (error) {
      setTickets([]);
      setTicketsError(error.message || "No se pudieron cargar los tickets.");
      setLoadingTickets(false);
      return;
    }

    setTickets(supabaseTickets || []);
    setLoadingTickets(false);
  }

  async function loadNotifications() {
    const { notifications: data } = await listDealerNotifications();
    setNotifications(data || []);
  }

  async function handleMarkAllRead() {
    setMarkingRead(true);
    await markDealerNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingRead(false);
  }

  async function refreshDealerPanel() {
    await Promise.all([
      loadDealers(),
      loadDealerVehicles(),
      loadLeads(),
      loadTickets(),
      loadSellVehicleLeads(),
      loadNotifications(),
    ]);
  }

  function handleModuleBack() {
    setActiveDealerMobileSection("home");
    setActiveDealerModule("summary");
  }

  function openModule(moduleName) {
    const nextMobileSection = {
      summary: "home",
      inventory: "vehicles",
      leads: "leads",
      support: "tickets",
      publish: "publish",
      sellVehicle: "leads",
      urgent: "vehicles",
      financing: "plan",
      metrics: "metrics",
      radar: "radar",
    }[moduleName];

    setActiveDealerMobileSection(nextMobileSection || "home");
    setActiveDealerModule(moduleName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToLeads(ctx = null) {
    setLeadsInitialContext(ctx ?? null);
    openModule("leads");
  }

  function navigateToInventory(ctx = null) {
    setInventoryInitialContext(ctx ?? null);
    openModule("inventory");
  }

  function handleDealerMobileSectionChange(sectionId) {
    setActiveDealerMobileSection(sectionId);

    if (sectionId === "home" || sectionId === "plan") {
      setActiveDealerModule("summary");
      return;
    }

    if (sectionId === "publish") {
      setActiveDealerModule("publish");
      return;
    }

    if (sectionId === "vehicles") {
      navigateToInventory();
      return;
    }

    if (sectionId === "leads") {
      navigateToLeads();
      return;
    }

    if (sectionId === "tickets") {
      setActiveDealerModule("support");
      return;
    }

    if (sectionId === "metrics") {
      setActiveDealerModule("metrics");
      return;
    }

    if (sectionId === "radar") {
      setActiveDealerModule("radar");
    }
  }

  function ModuleBackButton({ title, description, onRefresh }) {
    return (
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button
            className="table-action-btn"
            type="button"
            onClick={() => {
              setActiveDealerMobileSection("home");
              setActiveDealerModule("summary");
            }}
          >
            ← Volver al resumen
          </button>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>

        {onRefresh && (
          <button className="admin-refresh-btn" onClick={onRefresh}>
            Actualizar
          </button>
        )}
      </div>
    );
  }

  useEffect(() => {
    refreshDealerPanel();
  }, []);

  const dealer = useMemo(() => {
    return dealers.find((item) => item.id === selectedDealerId) || dealers[0];
  }, [dealers, selectedDealerId]);

  useEffect(() => {
    if (!dealer?.id) return;

    setWhatsappForm(dealer.contactPhone || dealer.phoneWhatsapp || dealer.phone || "");
    setWhatsappError("");
    setWhatsappSuccess("");
  }, [dealer?.id, dealer?.contactPhone, dealer?.phoneWhatsapp, dealer?.phone]);

  useEffect(() => {
    if (!dealer?.id) return;

    setDealerLogoError("");
    setDealerLogoSuccess("");
  }, [dealer?.id, dealer?.logo, dealer?.raw?.logo_url]);

  useEffect(() => {
    if (!dealer?.id) return;
    setProfileForm({
      name: dealer.commercialName || dealer.name || "",
      city: dealer.city || "",
      province: dealer.province || "",
    });
    setProfileError("");
    setProfileSuccess("");
  }, [dealer?.id]);

  // todayActions must be before any early return to satisfy Rules of Hooks.
  // Uses raw state (dealer, leads, dealerVehicles, tickets) — not derived vars
  // computed after the early return — to avoid TDZ errors.
  const todayActions = useMemo(() => {
    if (!dealer) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = [];

    const planStatus = dealer.planStatus;
    const days = dealer.currentPeriod?.expiresInDays ?? 0;

    if (planStatus === "expired" || planStatus === "expired_grace") {
      items.push({ level: "urgent", key: "plan_expired", label: "Tu plan comercial venció", sub: "Reactivá tu plan para seguir publicando.", action: null });
    } else if (typeof days === "number" && days >= 0 && days <= 7) {
      items.push({ level: "urgent", key: "plan_expiring", label: `Tu plan vence en ${days} día${days !== 1 ? "s" : ""}`, sub: "Contactá a administración para renovar.", action: null });
    } else if (typeof days === "number" && days > 7 && days <= 14) {
      items.push({ level: "info", key: "plan_soon", label: `Tu plan vence en ${days} días`, sub: "Planificá la renovación.", action: null });
    }

    const newLeads = leads.filter((l) => l.crm_status === "new").length;
    if (newLeads > 0) {
      items.push({ level: "urgent", key: "new_leads", label: `Responder ${newLeads} lead${newLeads !== 1 ? "s" : ""} nuevo${newLeads !== 1 ? "s" : ""}`, sub: "Sin respuesta aún.", action: () => navigateToLeads() });
    }

    const overdueLeads = leads.filter((l) => l.next_action_date && new Date(l.next_action_date + "T00:00:00") < today).length;
    if (overdueLeads > 0) {
      items.push({ level: "urgent", key: "overdue", label: `${overdueLeads} seguimiento${overdueLeads !== 1 ? "s" : ""} vencido${overdueLeads !== 1 ? "s" : ""}`, sub: "Acción requerida.", action: () => navigateToLeads() });
    }

    const todayStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
    const todayLeads = leads.filter((l) => l.next_action_date === todayStr).length;
    if (todayLeads > 0) {
      items.push({ level: "attention", key: "today_leads", label: `${todayLeads} seguimiento${todayLeads !== 1 ? "s" : ""} programado${todayLeads !== 1 ? "s" : ""} para hoy`, sub: "Revisá tu agenda.", action: () => navigateToLeads() });
    }

    const inReview = dealerVehicles.filter((v) => v.review_status === "needs_review").length;
    if (inReview > 0) {
      items.push({ level: "attention", key: "review", label: `${inReview} publicación${inReview !== 1 ? "es" : ""} en revisión`, sub: "Requieren corrección.", action: () => navigateToInventory() });
    }

    const openTickets = tickets.filter((t) => ["new", "open", "in_progress", "waiting_dealer"].includes(t.status)).length;
    if (openTickets > 0) {
      items.push({ level: "attention", key: "tickets", label: `${openTickets} ticket${openTickets !== 1 ? "s" : ""} de soporte abierto${openTickets !== 1 ? "s" : ""}`, sub: "Pendiente de respuesta.", action: () => openModule("support") });
    }

    const lowScore = dealerVehicles.filter((v) => {
      if (!v.is_active) return false;
      const { score } = getPublicationScore(v);
      return score < 50;
    }).length;
    if (lowScore > 0) {
      items.push({ level: "info", key: "low_score", label: `Mejorar ${lowScore} publicación${lowScore !== 1 ? "es" : ""} con calidad baja`, sub: "Completá fotos, precio y descripción.", action: () => navigateToInventory() });
    }

    return items;
  }, [dealer, leads, dealerVehicles, tickets]);

  if (!dealer) {
    return (
      <section className="page-section">
        <div className="container panel dealer-panel">
          <p className="eyebrow">Panel dealer único</p>
          <h1>Panel dealer</h1>

          {authProfile && (
            <p className="admin-session-note">
              Sesión actual: {authProfile.email} · rol {authProfile.role}
            </p>
          )}

          {dealersError && <div className="auth-warning">{dealersError}</div>}

          <div className="empty-state">No hay dealer operativo disponible.</div>
        </div>
      </section>
    );
  }

  const permissions = getEffectiveDealerPermissions(dealer);
  const publishCheck = canDealerPublish(dealer);
  const used = dealer.currentPeriod?.publicationsUsed || 0;
  const limit = permissions.vehicleLimit;
  const isPlatinum = permissions?.planId === "platinum";
  const remaining = getRemainingQuota(limit, used);
  const expiresInDays = dealer.currentPeriod?.expiresInDays ?? 0;
  const planStatusDescription = getPlanStatusDescription(dealer.planStatus);
  const publishBlockReason = getPublishBlockReason(dealer.planStatus, publishCheck.allowed, remaining);
  const publishBlockDetail = getPublishBlockDetail(dealer.planStatus, remaining);
  const extraQuota = Number(dealer.benefits?.extraPublicationQuota || 0);
  const capacityLabel = getPlanCapacityLabel({ isPlatinum, used, limit });
  const secondaryCapacityLabel = getPlanSecondaryCapacityLabel({
    isPlatinum,
    used,
    remaining,
  });
  const quotaDescription = isPlatinum
    ? `${capacityLabel}. ${secondaryCapacityLabel}.`
    : `${used} de ${formatLimit(limit)} publicaciones usadas en este período.`;
  const dealerLogo = dealer.logo || dealer.raw?.logo_url || "";
  const planBenefitBadges = getPlanBenefitBadges(permissions, isPlatinum);

  async function handleSaveDealerWhatsapp(event) {
    event?.preventDefault?.();

    if (savingWhatsapp) return;

    setWhatsappError("");
    setWhatsappSuccess("");

    const dealerId = dealer?.id;

    if (!dealerId) {
      setWhatsappError("No pudimos identificar tu perfil comercial.");
      return;
    }

    const normalizedWhatsapp = normalizeWhatsAppArgentina(whatsappForm);

    if (!normalizedWhatsapp) {
      setWhatsappError("Ingresá un WhatsApp válido con característica.");
      return;
    }

    setSavingWhatsapp(true);

    const { dealer: updatedDealer, error } =
      await updateDealerWhatsappById(dealerId, normalizedWhatsapp);

    if (error) {
      setWhatsappError(
        error.message || "No pudimos actualizar el WhatsApp. Intentá nuevamente."
      );
      setSavingWhatsapp(false);
      return;
    }

    setDealers((currentDealers) =>
      currentDealers.map((item) =>
        item.id === dealerId
          ? {
              ...item,
              ...updatedDealer,
              phone: normalizedWhatsapp,
              phoneWhatsapp: normalizedWhatsapp,
              contactPhone: normalizedWhatsapp,
              raw: {
                ...(item.raw || {}),
                phone_whatsapp: normalizedWhatsapp,
                contact_phone: normalizedWhatsapp,
              },
            }
          : item
      )
    );
    setWhatsappForm(normalizedWhatsapp);
    setWhatsappSuccess("WhatsApp actualizado correctamente.");
    setSavingWhatsapp(false);
  }

  async function handleDealerLogoFile(file) {
    if (uploadingDealerLogo) return;

    const dealerId = dealer?.id;

    setDealerLogoError("");
    setDealerLogoSuccess("");

    if (!dealerId) {
      setDealerLogoError("No pudimos identificar tu perfil comercial.");
      return;
    }

    setUploadingDealerLogo(true);

    const { logoUrl, error } = await uploadCurrentDealerLogo({
      dealerId,
      file,
    });

    if (error) {
      setDealerLogoError(
        error.message || "No pudimos actualizar la imagen institucional."
      );
      setUploadingDealerLogo(false);
      return;
    }

    setDealers((currentDealers) =>
      currentDealers.map((item) =>
        item.id === dealerId
          ? {
              ...item,
              logo: logoUrl,
              raw: {
                ...(item.raw || {}),
                logo_url: logoUrl,
              },
            }
          : item
      )
    );

    setDealerLogoSuccess("Imagen institucional actualizada.");
    setUploadingDealerLogo(false);
  }

  function handleDealerLogoInputChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    handleDealerLogoFile(file);
  }

  function renderDealerWhatsappContactCard({ compact = false } = {}) {
    const normalizedPreview = normalizeWhatsAppArgentina(whatsappForm);

    return (
      <div
        className={`dealer-mobile-plan-card dealer-profile-contact-block dealer-contact-card${
          compact ? " dealer-contact-card--compact" : ""
        }`}
      >
        <div className="dealer-profile-contact-head">
          <p className="eyebrow">Perfil comercial</p>
          <h3>{compact ? "Contacto comercial" : "WhatsApp de contacto"}</h3>
          {compact && (
            <p className="dealer-contact-compact-copy">
              Número principal para consultas.
            </p>
          )}
          <p>Este número se usará en tus publicaciones.</p>
        </div>

        <form className="dealer-contact-form" onSubmit={handleSaveDealerWhatsapp}>
          <label>
            Número de contacto
            <input
              value={whatsappForm}
              onChange={(event) => {
                setWhatsappForm(event.target.value);
                setWhatsappError("");
                setWhatsappSuccess("");
              }}
              placeholder="Ej. 11 3806 2294"
            />
          </label>

          {normalizedPreview && (
            <small>Formato: +{normalizedPreview}</small>
          )}

          {whatsappError && <div className="auth-warning">{whatsappError}</div>}
          {whatsappSuccess && (
            <div className="auth-message">{whatsappSuccess}</div>
          )}

          <button
            type="submit"
            className="table-action-btn"
            disabled={savingWhatsapp}
          >
            {savingWhatsapp ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    );
  }

  function getDealerFeatureState(featureId) {
    if (featureId === "financing") {
      const available = permissions.fullFinancingTools;

      return {
        available,
        tone: available ? "available" : "locked",
        module: available ? "inventory" : "support",
        status: available ? "Disponible" : "Disponible en Pro",
        ctaLabel: available ? "Gestionar publicaciones" : "Solicitar upgrade",
      };
    }

    if (featureId === "sellVehicle") {
      const available = permissions.sellVehicleLeads;

      return {
        available,
        tone: available ? "available" : "admin",
        module: available ? "sellVehicle" : "support",
        status: available
          ? "Disponible"
          : "Disponible con habilitacion de administracion",
        ctaLabel: available ? "Abrir oportunidades" : "Contactar administracion",
      };
    }

    if (featureId === "metrics") {
      return {
        available: true,
        tone: "active",
        module: "metrics",
        status: "Activo",
        ctaLabel: "Ver métricas",
        disabled: false,
      };
    }

    if (featureId === "premiumSignals") {
      const available =
        permissions.badgeVisibility === "premium" ||
        permissions.badgeVisibility === "full";

      return {
        available,
        tone: available ? "available" : "locked",
        module: available ? "inventory" : "support",
        status: available ? "Disponible" : "Disponible en Elite",
        ctaLabel: available ? "Ver publicaciones" : "Solicitar upgrade",
      };
    }

    if (featureId === "visibility") {
      const available =
        permissions.marketIntelligence ||
        permissions.badgeVisibility === "premium" ||
        permissions.badgeVisibility === "full";

      return {
        available,
        tone: available ? "available" : "locked",
        module: available ? "inventory" : "support",
        status: available ? "Disponible" : "Disponible en Elite",
        ctaLabel: available ? "Ver publicaciones" : "Solicitar upgrade",
      };
    }

    if (featureId === "maintenance") {
      const available = permissions.planId !== "inicio";

      return {
        available,
        tone: available ? "available" : "locked",
        module: available ? "inventory" : "support",
        status: available ? "Disponible" : "Disponible en Pro",
        ctaLabel: available ? "Gestionar publicaciones" : "Solicitar upgrade",
      };
    }

    if (featureId === "extraQuota") {
      const available = extraQuota > 0;

      return {
        available,
        tone: available ? "admin" : "limited",
        module: "support",
        status: available
          ? "Habilitado por admin"
          : "Disponible con habilitacion de administracion",
        ctaLabel: available ? "Ver soporte" : "Contactar administracion",
      };
    }

    if (featureId === "prioritySupport") {
      return {
        available: isPlatinum,
        tone: isPlatinum ? "available" : "locked",
        module: "support",
        status: isPlatinum ? "Disponible" : "Disponible en Platinum",
        ctaLabel: isPlatinum ? "Abrir soporte" : "Solicitar upgrade",
      };
    }

    return {
      available: false,
      tone: "locked",
      module: "support",
      status: "Disponible en planes superiores",
      ctaLabel: "Solicitar upgrade",
    };
  }

  function renderDealerFeaturePreview() {
    return (
      <section
        className="dealer-feature-preview"
        aria-label="Herramientas y beneficios disponibles"
      >
        <div className="dealer-feature-preview-head">
          <div>
            <span>Herramientas de crecimiento</span>
            <h2>Funciones visibles para todos los planes</h2>
            <p>
              Cada herramienta queda visible con su alcance actual. Para
              habilitar funciones superiores, solicitá upgrade desde soporte.
            </p>
          </div>

          <button
            type="button"
            className="table-action-btn"
            onClick={() => openModule("support")}
          >
            Solicitar upgrade
          </button>
        </div>

        <div className="dealer-feature-preview-grid">
          {DEALER_FEATURE_PREVIEWS.map((feature) => {
            const state = getDealerFeatureState(feature.id);
            const isLocked = state.tone === "locked" || state.tone === "limited";

            return (
              <article
                key={feature.id}
                className={`dealer-feature-preview-card is-${state.tone}`}
              >
                <div className="dealer-feature-preview-card-head">
                  <span
                    className={`dealer-feature-status-badge is-${state.tone}`}
                  >
                    {state.status}
                  </span>
                  {isLocked && (
                    <span className="dealer-feature-lock-icon" aria-hidden="true">
                      ◻
                    </span>
                  )}
                </div>
                <strong>{feature.title}</strong>
                <p>{feature.description}</p>
                {isLocked && (
                  <p className="dealer-feature-upgrade-note">
                    Requerido: <strong>{feature.requiredPlan}</strong> — abrí un
                    ticket de soporte para solicitar el upgrade.
                  </p>
                )}
                <button
                  type="button"
                  disabled={state.disabled}
                  onClick={() =>
                    !state.disabled && openModule(state.module || "support")
                  }
                >
                  {state.ctaLabel}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  async function handleSaveDealerProfile(event) {
    event?.preventDefault?.();
    if (savingProfile) return;
    setProfileError("");
    setProfileSuccess("");
    if (!profileForm.name.trim()) {
      setProfileError("El nombre comercial no puede estar vacío.");
      return;
    }
    setSavingProfile(true);
    const { error } = await updateDealerProfileById(dealer.id, profileForm);
    if (error) {
      setProfileError(error.message || "No se pudo actualizar el perfil.");
      setSavingProfile(false);
      return;
    }
    setDealers((prev) =>
      prev.map((d) =>
        d.id === dealer.id
          ? { ...d, commercialName: profileForm.name, name: profileForm.name, city: profileForm.city, province: profileForm.province }
          : d
      )
    );
    setProfileSuccess("Perfil actualizado correctamente.");
    setSavingProfile(false);
  }

  function renderDealerProfileEditor() {
    const locationPreview = [dealer.city, dealer.province].filter(Boolean).join(", ");

    return (
      <div className="dealer-profile-editor">
        {/* Preview strip */}
        <div className="dealer-profile-editor__preview">
          {dealerLogo ? (
            <img
              src={dealerLogo}
              alt={dealer.commercialName}
              className="dealer-profile-editor__logo"
            />
          ) : (
            <div className="dealer-profile-editor__logo-placeholder">
              {dealer.commercialName?.[0] ?? "D"}
            </div>
          )}
          <div className="dealer-profile-editor__preview-info">
            <strong>{dealer.commercialName}</strong>
            {locationPreview && <span>{locationPreview}</span>}
            {dealer.phoneWhatsapp && (
              <span>+{dealer.phoneWhatsapp}</span>
            )}
          </div>
          {onNavigate && dealer?.id && (
            <button
              type="button"
              className="dealer-profile-editor__preview-link"
              onClick={() => onNavigate("dealerProfile", { dealerId: dealer.id })}
            >
              Ver perfil público →
            </button>
          )}
        </div>

        <form className="dealer-profile-editor__form" onSubmit={handleSaveDealerProfile}>
          {/* A — Identidad comercial */}
          <div className="dealer-settings-section">
            <p className="dealer-settings-section__title">Identidad comercial</p>
            <label className="dealer-settings-section__field">
              <span>Nombre comercial</span>
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Automotores Rodríguez"
              />
            </label>
          </div>

          {/* C — Ubicación */}
          <div className="dealer-settings-section">
            <p className="dealer-settings-section__title">Ubicación</p>
            <div className="dealer-settings-section__grid">
              <label className="dealer-settings-section__field">
                <span>Ciudad</span>
                <input
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Ej: San Miguel"
                />
              </label>
              <label className="dealer-settings-section__field">
                <span>Provincia</span>
                <input
                  value={profileForm.province}
                  onChange={(e) => setProfileForm((f) => ({ ...f, province: e.target.value }))}
                  placeholder="Ej: Buenos Aires"
                />
              </label>
            </div>
          </div>

          {profileError   && <div className="auth-warning">{profileError}</div>}
          {profileSuccess && <div className="auth-message">{profileSuccess}</div>}

          <button type="submit" className="primary-action" disabled={savingProfile}>
            {savingProfile ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        {/* Próximamente */}
        <div className="dealer-settings-coming-soon">
          <p className="dealer-settings-coming-soon__label">Próximamente en configuración</p>
          <ul>
            <li>Descripción de la agencia</li>
            <li>Horario de atención</li>
            <li>Sitio web</li>
            <li>Instagram / redes sociales</li>
            <li>Dirección comercial</li>
            <li>Email de contacto</li>
          </ul>
        </div>
      </div>
    );
  }

  function renderPlanComparison() {
    const currentPlanKey = String(permissions.planId || "inicio").toLowerCase();
    const currentIdx = PLAN_ORDER.indexOf(currentPlanKey);

    return (
      <div className="dealer-plan-comparison">
        <div className="dealer-plan-comparison-head">
          <h3>Comparativa de planes</h3>
          <p>
            Tu plan actual está resaltado. Solicitá upgrade desde soporte para
            acceder a funciones de planes superiores.
          </p>
        </div>
        <div className="dealer-plan-comparison-grid">
          {PLAN_TIERS.map((tier) => {
            const tierIdx = PLAN_ORDER.indexOf(tier.id);
            const isCurrent = tier.id === currentPlanKey;
            const isUpgrade = tierIdx > currentIdx;
            const cardClass = isCurrent
              ? "dealer-plan-comparison-card is-current"
              : isUpgrade
              ? "dealer-plan-comparison-card is-upgrade"
              : "dealer-plan-comparison-card is-lower";

            return (
              <article key={tier.id} className={cardClass}>
                <div className="dealer-plan-comparison-card-head">
                  <strong className={`dealer-plan-comparison-label rank-${tier.id}`}>
                    {tier.label}
                  </strong>
                  <span className="dealer-plan-comparison-quota">{tier.quota}</span>
                  {isCurrent && (
                    <span className="dealer-plan-comparison-current-badge">
                      Tu plan actual
                    </span>
                  )}
                </div>
                <ul className="dealer-plan-comparison-features">
                  {tier.features.map((f) => (
                    <li key={f} className="is-included">
                      <span aria-hidden="true">✓</span> {f}
                    </li>
                  ))}
                  {tier.locked.map((f) => (
                    <li key={f} className="is-locked">
                      <span aria-hidden="true">—</span> {f}
                    </li>
                  ))}
                </ul>
                {isUpgrade && (
                  <button
                    type="button"
                    className="dealer-plan-comparison-upgrade-btn"
                    onClick={() => openModule("support")}
                  >
                    Solicitar upgrade a {tier.label}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  const activeVehiclesCount = dealerVehicles.filter(
    (vehicle) => vehicle.is_active
  ).length;

  const totalDetailViews = dealerVehicles.reduce(
    (sum, vehicle) => sum + Number(vehicle.views ?? 0),
    0
  );

  const mostViewedVehicle = dealerVehicles.length > 0
    ? dealerVehicles.reduce(
        (best, vehicle) =>
          Number(vehicle.views ?? 0) > Number(best.views ?? 0) ? vehicle : best,
        dealerVehicles[0]
      )
    : null;

  const reviewVehiclesCount = dealerVehicles.filter(
    (vehicle) => vehicle.review_status === "needs_review"
  ).length;

  const newLeadsCount = leads.filter((lead) => lead.crm_status === "new").length;

  const openTicketsCount = tickets.filter((ticket) =>
    ["new", "open", "in_progress", "waiting_dealer"].includes(ticket.status)
  ).length;

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  function renderDealerMobileTabs() {
    if (activeDealerMobileSection === "home") return null;
    return (
      <nav className="dealer-mobile-tabs dealer-nav-grid" aria-label="Secciones dealer mobile">
        {DEALER_MOBILE_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`dealer-mobile-tab${
              activeDealerMobileSection === section.id ? " is-active" : ""
            }`}
            onClick={() => handleDealerMobileSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
    );
  }

  function renderDealerMobileHome() {
    return (
      <>
        <div className="dealer-mobile-home">
          <div className="dealer-mobile-home-head">
            <div>
              <span>{dealer.commercialName}</span>
              <strong>{permissions.rankLabel}</strong>
              <p>{getPlanStatusLabel(dealer.planStatus)}</p>
              {isPlatinum && (
                <span className="dealer-mobile-platinum-pill">
                  Platinum · publicaciones ilimitadas
                </span>
              )}
            </div>
          </div>

          {!publishCheck.allowed && (
            <div className="auth-warning dealer-mobile-warning">
              <strong>{publishBlockReason || "No podés publicar ahora."}</strong>
              <button
                type="button"
                className="table-action-btn"
                onClick={() => openModule("support")}
              >
                Contactar admin
              </button>
            </div>
          )}

          <div className="dealer-mobile-kpi-grid">
            <article className="dealer-mobile-kpi-card">
              <span>Activas</span>
              <strong>{activeVehiclesCount}</strong>
              <p>publicaciones</p>
            </article>

            <article className="dealer-mobile-kpi-card">
              <span>Plan</span>
              <strong>{isPlatinum ? "Ilimitado" : `${used}/${formatLimit(limit)}`}</strong>
              <p>{isPlatinum ? `${used} creadas` : `${remaining} disponibles`}</p>
            </article>

            <article className="dealer-mobile-kpi-card">
              <span>Leads</span>
              <strong>{newLeadsCount}</strong>
              <p>Nuevos</p>
            </article>

            <article className="dealer-mobile-kpi-card">
              <span>Tickets</span>
              <strong>{openTicketsCount}</strong>
              <p>Abiertos</p>
            </article>

            <article className="dealer-mobile-kpi-card">
              <span>Revisión</span>
              <strong>{reviewVehiclesCount}</strong>
              <p>Observadas</p>
            </article>

            <article className="dealer-mobile-kpi-card">
              <span>Vence</span>
              <strong>{expiresInDays}</strong>
              <p>Días</p>
            </article>
          </div>
        </div>

        <div className="dealer-mobile-quicknav">
          <span className="dealer-mobile-quicknav-label">Accesos rápidos</span>
          {DEALER_MOBILE_SECTIONS.filter((s) => s.id !== "home").map((section) => (
            <button
              key={section.id}
              type="button"
              className="dealer-mobile-quicknav-btn"
              onClick={() => handleDealerMobileSectionChange(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderDealerOnboarding() {
    if (loadingVehicles || loadingLeads) return null;

    const step1Done = Boolean(
      dealer.contactPhone || dealer.phone || dealer.phoneWhatsapp
    );
    const step2Done = Boolean(dealerLogo);
    const step3Done = dealerVehicles.length > 0;

    if (step1Done && step2Done && step3Done) return null;

    const completedCount = [step1Done, step2Done, step3Done].filter(Boolean).length;

    return (
      <section className="dealer-onboarding" aria-label="Primeros pasos">
        <div className="dealer-onboarding-head">
          <div>
            <p className="eyebrow">Primeros pasos</p>
            <h2>Bienvenido a tu panel, {dealer.commercialName}.</h2>
            <p>
              Completá estos pasos para operar dentro de la red oX NEXMOV.
            </p>
          </div>
          <div className="dealer-onboarding-progress">
            <span>{completedCount} de 3 completados</span>
            <div className="dealer-onboarding-bar">
              <div
                className="dealer-onboarding-bar-fill"
                style={{ width: `${Math.round((completedCount / 3) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="dealer-onboarding-steps">
          <article
            className={`dealer-onboarding-step${step1Done ? " is-done" : ""}`}
          >
            <div className="dealer-onboarding-step-marker" aria-hidden="true">
              {step1Done ? "✓" : "1"}
            </div>
            <div className="dealer-onboarding-step-body">
              <strong>Configurá tu WhatsApp de contacto</strong>
              <p>
                Número que aparece en tus publicaciones para recibir consultas.
                Lo encontrás en el panel de contacto de arriba a la derecha.
              </p>
              {step1Done && (
                <span className="dealer-onboarding-done-label">Completado</span>
              )}
            </div>
          </article>

          <article
            className={`dealer-onboarding-step${step2Done ? " is-done" : ""}`}
          >
            <div className="dealer-onboarding-step-marker" aria-hidden="true">
              {step2Done ? "✓" : "2"}
            </div>
            <div className="dealer-onboarding-step-body">
              <strong>Subí tu imagen institucional</strong>
              <p>
                Tu logo aparece en las cards de la red y genera más confianza en
                compradores.
              </p>
              {step2Done ? (
                <span className="dealer-onboarding-done-label">Completado</span>
              ) : (
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={() => dealerLogoInputRef.current?.click()}
                  disabled={uploadingDealerLogo}
                >
                  {uploadingDealerLogo ? "Subiendo..." : "Subir imagen"}
                </button>
              )}
            </div>
          </article>

          <article
            className={`dealer-onboarding-step${step3Done ? " is-done" : ""}`}
          >
            <div className="dealer-onboarding-step-marker" aria-hidden="true">
              {step3Done ? "✓" : "3"}
            </div>
            <div className="dealer-onboarding-step-body">
              <strong>Publicá tu primer vehículo</strong>
              <p>
                Una publicación real activa te da presencia inmediata en la red
                y habilita el flujo de leads.
              </p>
              {step3Done ? (
                <span className="dealer-onboarding-done-label">Completado</span>
              ) : (
                <button
                  type="button"
                  className="primary-action"
                  disabled={!publishCheck.allowed}
                  title={
                    !publishCheck.allowed
                      ? publishBlockReason || "Plan no disponible"
                      : undefined
                  }
                  onClick={() => {
                    if (publishCheck.allowed) setShowVehicleModal(true);
                  }}
                >
                  Publicar primer vehículo
                </button>
              )}
              {!step3Done && !publishCheck.allowed && (
                <small className="dealer-module-lock-reason">
                  {publishBlockReason}
                </small>
              )}
            </div>
          </article>
        </div>
      </section>
    );
  }

  function renderDealerMobilePlan() {
    return (
      <div className="dealer-mobile-plan">
        <div className="buyer-section-head">
          <div>
            <h2>Mi plan</h2>
            <p>Estado comercial, cupo y vencimiento del período actual.</p>
          </div>
        </div>

        <div className="dealer-mobile-plan-grid">
          <article
            className={`dealer-mobile-plan-card rank-${permissions.rankTheme}${
              isPlatinum ? " dealer-plan-platinum-card" : ""
            }`}
          >
            <span>Plan actual</span>
            <strong>{permissions.rankLabel}</strong>
            <p>
              {dealer.city}, {dealer.province}
            </p>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Estado</span>
            <strong>{getPlanStatusLabel(dealer.planStatus)}</strong>
            <p>{planStatusDescription}</p>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Cupo usado</span>
            <strong>{capacityLabel}</strong>
            <p>{secondaryCapacityLabel}</p>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Vencimiento</span>
            <strong>{expiresInDays} días</strong>
            <p>{getPlanAlertLabel(expiresInDays)}</p>
          </article>

          {extraQuota > 0 && (
            <article className="dealer-mobile-plan-card">
              <span>Cupo extra</span>
              <strong>{extraQuota}</strong>
              <p>Temporal del período actual.</p>
            </article>
          )}

          <article
            className={`dealer-mobile-plan-card dealer-plan-benefits-card${
              isPlatinum ? " dealer-plan-platinum-card" : ""
            }`}
          >
            <span>Beneficios de tu plan</span>
            <strong>{isPlatinum ? "Nivel máximo" : permissions.planLabel}</strong>
            <p>
              {isPlatinum
                ? "Máxima presencia para operaciones de alto volumen."
                : "Herramientas comerciales disponibles según tu plan."}
            </p>
            <div className="dealer-plan-benefits-grid">
              {planBenefitBadges.map((badge) => (
                <span key={badge} className="dealer-plan-benefit-chip">
                  {badge}
                </span>
              ))}
            </div>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Soporte</span>
            <strong>Admin</strong>
            <p>Tickets para plan, cupo, leads o publicaciones.</p>
            {isPlatinum && (
              <span className="dealer-platinum-priority-badge">
                Prioridad Platinum
              </span>
            )}
            <button
              type="button"
              className="table-action-btn"
              onClick={() => openModule("support")}
            >
              Abrir soporte
            </button>
          </article>
        </div>

        {renderPlanComparison()}
        {renderDealerProfileEditor()}
      </div>
    );
  }

  function renderDealerMobileSettings() {
    return (
      <div className="dealer-mobile-plan">
        <div className="buyer-section-head">
          <div>
            <h2>Ajustes</h2>
            <p>Imagen institucional, contacto y configuración del dealer.</p>
          </div>
        </div>

        <div className="dealer-mobile-plan-grid">
          <article className="dealer-mobile-plan-card dealer-settings-logo-card">
            <span>Imagen institucional</span>
            {dealerLogo ? (
              <img
                src={dealerLogo}
                alt={`Imagen de ${dealer.commercialName}`}
                className="dealer-settings-logo-img"
              />
            ) : (
              <p>Sin imagen institucional cargada.</p>
            )}
            <button
              type="button"
              className="table-action-btn"
              onClick={() => dealerLogoInputRef.current?.click()}
              disabled={uploadingDealerLogo}
            >
              {uploadingDealerLogo ? "Subiendo..." : "Actualizar imagen"}
            </button>
            {dealerLogoError && (
              <div className="auth-warning">{dealerLogoError}</div>
            )}
            {dealerLogoSuccess && (
              <div className="auth-message">{dealerLogoSuccess}</div>
            )}
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Dealer operativo</span>
            <select
              value={dealer.id}
              onChange={(event) => setSelectedDealerId(event.target.value)}
            >
              {dealers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.commercialName} · {item.plan}
                </option>
              ))}
            </select>
            <button className="admin-refresh-btn" onClick={refreshDealerPanel}>
              Actualizar panel
            </button>
            {unreadNotificationsCount > 0 && (
              <span className="dealer-notifications-header-chip">
                {unreadNotificationsCount} aviso{unreadNotificationsCount !== 1 ? "s" : ""} sin leer
              </span>
            )}
          </article>
        </div>

        {renderDealerWhatsappContactCard()}
        {renderDealerProfileEditor()}

        <div className="dealer-mobile-plan-grid">
          <article
            className={`dealer-mobile-plan-card rank-${permissions.rankTheme}${
              isPlatinum ? " dealer-plan-platinum-card" : ""
            }`}
          >
            <span>Plan actual</span>
            <strong>{permissions.rankLabel}</strong>
            <p>
              {dealer.city}, {dealer.province}
            </p>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Estado</span>
            <strong>{getPlanStatusLabel(dealer.planStatus)}</strong>
            <p>{planStatusDescription}</p>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Cupo usado</span>
            <strong>{capacityLabel}</strong>
            <p>{secondaryCapacityLabel}</p>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Vencimiento</span>
            <strong>{expiresInDays} días</strong>
            <p>{getPlanAlertLabel(expiresInDays)}</p>
          </article>

          {extraQuota > 0 && (
            <article className="dealer-mobile-plan-card">
              <span>Cupo extra</span>
              <strong>{extraQuota}</strong>
              <p>Temporal del período actual.</p>
            </article>
          )}

          <article
            className={`dealer-mobile-plan-card dealer-plan-benefits-card${
              isPlatinum ? " dealer-plan-platinum-card" : ""
            }`}
          >
            <span>Beneficios de tu plan</span>
            <strong>{isPlatinum ? "Nivel máximo" : permissions.planLabel}</strong>
            <p>
              {isPlatinum
                ? "Máxima presencia para operaciones de alto volumen."
                : "Herramientas comerciales disponibles según tu plan."}
            </p>
            <div className="dealer-plan-benefits-grid">
              {planBenefitBadges.map((badge) => (
                <span key={badge} className="dealer-plan-benefit-chip">
                  {badge}
                </span>
              ))}
            </div>
          </article>

          <article className="dealer-mobile-plan-card">
            <span>Soporte</span>
            <strong>Admin</strong>
            <p>Tickets para plan, cupo, leads o publicaciones.</p>
            {isPlatinum && (
              <span className="dealer-platinum-priority-badge">
                Prioridad Platinum
              </span>
            )}
            <button
              type="button"
              className="table-action-btn"
              onClick={() => openModule("support")}
            >
              Abrir soporte
            </button>
          </article>
        </div>

        {renderPlanComparison()}
      </div>
    );
  }

  return (
    <section className="page-section">
      <div className="container panel dealer-panel">
        <div className="panel-head-row dealer-header-control">
          <div className="dealer-header-intro">
    <p className="eyebrow">{isPlatinum ? "Dealer Platinum" : "Panel dealer"}</p>
    <h1>{dealer.commercialName || "Panel dealer"}</h1>
    <p>
      {isPlatinum
        ? "Máxima presencia para operaciones de alto volumen."
        : "Identidad comercial, operación y contacto en un solo centro de control."}
    </p>

    <div className="dealer-header-chips">
      <span>{permissions.rankLabel}</span>
      <span>{getPlanStatusLabel(dealer.planStatus)}</span>
      <span>{capacityLabel}</span>
    </div>

    {isPlatinum && (
      <div className="dealer-platinum-header-badges">
        <span className="dealer-platinum-badge">PLATINUM</span>
        <span className="dealer-platinum-badge dealer-platinum-badge--soft">
          Publicaciones ilimitadas
        </span>
      </div>
    )}

    {authProfile && (
      <p className="admin-session-note">
        Sesión actual: {authProfile.email} · rol {authProfile.role}
      </p>
    )}
  </div>

          <div className="dealer-header-identity">
  <div className="dealer-institutional-card">
    <div className="dealer-institutional-media">
      {dealerLogo ? (
        <img
          src={dealerLogo}
          alt={`Imagen institucional de ${dealer.commercialName}`}
        />
      ) : (
        <div className="dealer-institutional-empty">
          <strong>Sin imagen institucional</strong>
          <span>Cargá una imagen clara.</span>
        </div>
      )}
    </div>

    <div className="dealer-institutional-actions">
      <p>
        Imagen institucional de tu agencia.
      </p>

      <button
        type="button"
        className="table-action-btn dealer-institutional-upload-btn"
        onClick={() => dealerLogoInputRef.current?.click()}
        disabled={uploadingDealerLogo}
      >
        {uploadingDealerLogo ? "Subiendo imagen..." : "Actualizar imagen"}
      </button>

      <input
        ref={dealerLogoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleDealerLogoInputChange}
        disabled={uploadingDealerLogo}
        className="dealer-institutional-file-input"
      />

      {dealerLogoError && (
        <div className="auth-warning dealer-institutional-feedback">
          {dealerLogoError}
        </div>
      )}
      {dealerLogoSuccess && (
        <div className="auth-message dealer-institutional-feedback">
          {dealerLogoSuccess}
        </div>
      )}
    </div>
  </div>
          </div>

          <div className="dealer-header-ops">
  <div className="dealer-switcher">
            <div className="dealer-switcher-row">
              {dealers.length > 1 && (
                <select
                  value={dealer.id}
                  onChange={(event) => setSelectedDealerId(event.target.value)}
                >
                  {dealers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.commercialName} · {item.plan}
                    </option>
                  ))}
                </select>
              )}

              <button className="admin-refresh-btn" onClick={refreshDealerPanel}>
                Actualizar panel
              </button>
            </div>

            {unreadNotificationsCount > 0 && (
              <span className="dealer-notifications-header-chip">
                {unreadNotificationsCount} aviso{unreadNotificationsCount !== 1 ? "s" : ""} sin leer
              </span>
            )}
          </div>

            {renderDealerWhatsappContactCard({ compact: true })}

            <button
              type="button"
              className="table-action-btn dealer-header-mobile-primary"
              disabled={!publishCheck.allowed}
              title={
                !publishCheck.allowed
                  ? publishBlockReason ||
                    "No podés crear publicaciones hasta regularizar tu plan comercial."
                  : undefined
              }
              onClick={() => {
                if (publishCheck.allowed) {
                  setShowVehicleModal(true);
                }
              }}
            >
              Publicar vehículo
            </button>
          </div>
        </div>

        {dealersError && <div className="auth-warning">{dealersError}</div>}
        {vehiclesError && <div className="auth-warning">{vehiclesError}</div>}
        {leadsError && <div className="auth-warning">{leadsError}</div>}
        {ticketsError && <div className="auth-warning">{ticketsError}</div>}
        {sellVehicleLeadsError && (
          <div className="auth-warning">{sellVehicleLeadsError}</div>
        )}

        {loadingDealers && <div className="auth-message">Cargando dealer...</div>}
        {loadingVehicles && (
          <div className="auth-message">Cargando vehículos...</div>
        )}
        {loadingLeads && <div className="auth-message">Cargando leads...</div>}
        {loadingTickets && (
          <div className="auth-message">Cargando tickets...</div>
        )}
        {loadingSellVehicleLeads && (
          <div className="auth-message">
            Cargando oportunidades Vender mi vehículo...
          </div>
        )}

        {activeDealerMobileSection === "home" &&
          activeDealerModule === "summary" &&
          renderDealerMobileHome()}

        {renderDealerMobileTabs()}

        {activeDealerMobileSection === "plan" &&
          activeDealerModule === "summary" &&
          renderDealerMobileSettings()}

        {activeDealerModule === "summary" && activeDealerMobileSection !== "plan" && (
          <>
          {renderDealerOnboarding()}

          <div className="dealer-summary-stats-bar">
            <div className="dealer-summary-stat">
              <span>Publicaciones activas</span>
              <strong>{activeVehiclesCount}</strong>
              <p>{dealerVehicles.length} cargadas · {reviewVehiclesCount} en revisión</p>
            </div>
            <div className="dealer-summary-stat">
              <span>Leads nuevos</span>
              <strong>{newLeadsCount}</strong>
              <p>{leads.length} consultas totales</p>
            </div>
            <div className="dealer-summary-stat">
              <span>Soporte</span>
              <strong>{openTicketsCount}</strong>
              <p>{isPlatinum ? "Prioridad Platinum" : "Tickets abiertos"}</p>
            </div>
            <div className={`dealer-summary-stat${isPlatinum ? " is-platinum" : ""}`}>
              <span>{isPlatinum ? "Platinum · ilimitado" : "Cupo del período"}</span>
              <strong>{isPlatinum ? `${used}` : capacityLabel}</strong>
              <p>{isPlatinum ? `${used} publicadas · sin límite` : secondaryCapacityLabel}</p>
            </div>
            <div className="dealer-summary-stat">
              <span>Vencimiento</span>
              <strong>{expiresInDays}d</strong>
              <p>{getPlanAlertLabel(expiresInDays)}</p>
            </div>
          </div>

          </>
        )}

        {activeDealerModule === "summary" && activeDealerMobileSection !== "plan" && (
          <section className="dealer-today-block">
            <h3 className="dealer-today-block__title">Qué hacer hoy</h3>
            {todayActions.length === 0 ? (
              <div className="dealer-today-block__all-clear">
                <span className="dealer-today-block__all-clear-icon">✓</span>
                <div>
                  <strong>Todo al día</strong>
                  <p>Tu panel no tiene acciones urgentes por ahora.</p>
                </div>
              </div>
            ) : (
              <ul className="dealer-today-block__list">
                {todayActions.map((item) => (
                  <li key={item.key} className={`dealer-today-item dealer-today-item--${item.level}`}>
                    <div className="dealer-today-item__dot" />
                    <div className="dealer-today-item__content">
                      <strong>{item.label}</strong>
                      <span>{item.sub}</span>
                    </div>
                    {item.action && (
                      <button
                        type="button"
                        className="dealer-today-item__btn"
                        onClick={item.action}
                      >
                        Ver →
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeDealerModule === "summary" && activeDealerMobileSection !== "plan" && notifications.length > 0 && (
          <div className="dealer-notifications-section">
            <div className="dealer-notifications-head">
              <div>
                <span>Avisos del administrador</span>
                {unreadNotificationsCount > 0 && (
                  <strong className="dealer-notifications-badge">
                    {unreadNotificationsCount} sin leer
                  </strong>
                )}
              </div>
              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={handleMarkAllRead}
                  disabled={markingRead}
                >
                  {markingRead ? "Marcando..." : "Marcar como leídas"}
                </button>
              )}
            </div>
            <ul className="dealer-notifications-list">
              {notifications.slice(0, 8).map((notification) => (
                <li
                  key={notification.id}
                  className={`dealer-notification-item${notification.is_read ? "" : " is-unread"}`}
                >
                  <span className="dealer-notification-msg">{notification.message}</span>
                  <time
                    className="dealer-notification-time"
                    title={new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(notification.created_at))}
                  >
                    {formatRelativeTime(notification.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeDealerModule === "summary" && activeDealerMobileSection !== "plan" && (
          <div className="dealer-modules-grid">

            <article
              data-module="inventory"
              className="dealer-module-card clickable-module-card"
              onClick={() => navigateToInventory()}
            >
              <div className="dealer-mc-kpi">
                <strong>{activeVehiclesCount}</strong>
                <span>activas{reviewVehiclesCount > 0 ? ` · ${reviewVehiclesCount} en revisión` : ""}</span>
              </div>
              <h3>Inventario</h3>
              <p>Publicaciones activas, pausadas y stock disponible.</p>
              <button type="button">Abrir inventario</button>
            </article>

            <article
              data-module="publish"
              className={publishCheck.allowed ? "dealer-module-card clickable-module-card" : "dealer-module-card dealer-module-card--locked"}
              onClick={() => { if (publishCheck.allowed) openModule("publish"); }}
            >
              <div className="dealer-mc-kpi">
                <strong>{isPlatinum ? "∞" : remaining}</strong>
                <span>{isPlatinum ? "sin límite" : `disponibles de ${formatLimit(limit)}`}</span>
              </div>
              <h3>Publicar vehículo</h3>
              <p>Carga guiada con validación automática de cupo y catálogo.</p>
              {!publishCheck.allowed && (
                <small className="dealer-module-lock-reason">{publishBlockReason}</small>
              )}
              <button type="button" disabled={!publishCheck.allowed}>Publicar vehículo</button>
            </article>

            <article
              data-module="leads"
              className="dealer-module-card clickable-module-card"
              onClick={() => navigateToLeads()}
            >
              <div className="dealer-mc-kpi">
                <strong>{newLeadsCount}</strong>
                <span>nuevos · {leads.length} total</span>
              </div>
              <h3>Leads recibidos</h3>
              <p>Consultas de compradores sobre tus publicaciones.</p>
              <button type="button">Gestionar leads</button>
            </article>

            <article
              data-module="metrics"
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule("metrics")}
            >
              <div className="dealer-mc-kpi">
                <strong>{totalDetailViews}</strong>
                <span>vistas totales</span>
              </div>
              <h3>Métricas</h3>
              <p>Vistas, conversión y calidad de publicaciones.</p>
              <button type="button">Ver métricas</button>
            </article>

            <article
              data-module="radar"
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule("radar")}
            >
              <div className="dealer-mc-kpi">
                <strong>Radar</strong>
                <span>oX</span>
              </div>
              <h3>Radar oX</h3>
              <p>Señales de búsquedas activas sin vehículo disponible.</p>
              <button type="button">Ver señales</button>
            </article>

            <article
              data-module="sellVehicle"
              className={`dealer-module-card${permissions.sellVehicleLeads ? " clickable-module-card" : " dealer-module-card--locked"}`}
              onClick={() => { if (permissions.sellVehicleLeads) openModule("sellVehicle"); }}
            >
              <div className="dealer-mc-kpi">
                <strong>{sellVehicleLeads.length}</strong>
                <span>asignadas</span>
              </div>
              <h3>Vender mi vehículo</h3>
              <p>{permissions.sellVehicleLeads ? "Oportunidades comerciales asignadas por administración." : "Requiere habilitación por administración."}</p>
              <button type="button" disabled={!permissions.sellVehicleLeads}>Ver oportunidades</button>
            </article>

            <article
              data-module="urgent"
              className={reviewVehiclesCount > 0 ? "dealer-module-card clickable-module-card" : "dealer-module-card dealer-module-card--locked"}
              onClick={() => { if (reviewVehiclesCount > 0) openModule("urgent"); }}
            >
              <div className="dealer-mc-kpi">
                <strong>{reviewVehiclesCount}</strong>
                <span>observadas</span>
              </div>
              <h3>Urgencias</h3>
              <p>Publicaciones que requieren corrección o revisión urgente.</p>
              <button type="button" disabled={reviewVehiclesCount === 0}>Ver urgencias</button>
            </article>

            <article
              data-module="support"
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule("support")}
            >
              <div className="dealer-mc-kpi">
                <strong>{openTicketsCount}</strong>
                <span>abiertos</span>
              </div>
              <h3>Soporte</h3>
              <p>{isPlatinum ? "Atención con prioridad Platinum incluida." : "Tickets y consultas a administración."}</p>
              {isPlatinum && <span className="dealer-platinum-priority-badge">Prioridad Platinum</span>}
              <button type="button">Abrir soporte</button>
            </article>

            <article
              data-module="financing"
              className="dealer-module-card dealer-module-card--locked"
            >
              <div className="dealer-mc-kpi">
                <strong>—</strong>
                <span>próximamente</span>
              </div>
              <h3>Financiación</h3>
              <p>{permissions.fullFinancingTools ? "Herramientas de financiación disponibles en tu plan." : "Disponible en planes Pro y superiores."}</p>
              <button type="button" disabled>{isPlatinum ? "Incluido en Platinum" : "Disponible en plan Pro"}</button>
            </article>

          </div>
        )}

        {activeDealerModule === "inventory" && (
          <DealerInventoryModule
            dealerVehicles={dealerVehicles}
            dealerLeads={leads}
            dealerName={dealer?.commercialName ?? ""}
            onRefresh={loadDealerVehicles}
            onBack={handleModuleBack}
            initialFilterScore={inventoryInitialContext?.filterScore ?? ""}
            initialFilterStatus={inventoryInitialContext?.filterStatus ?? ""}
            initialSortBy={inventoryInitialContext?.sortBy ?? "default"}
          />
        )}

        {activeDealerModule === "publish" && (
          <div className="dealer-leads-section">
            <ModuleBackButton
              title="Alta de vehículo"
              description="Carga guiada por catálogo, validación automática y control del cupo comercial del período."
            />

            <div className="dealer-module-card dealer-module-card-open">
              <h3>Publicar nueva unidad</h3>
              <p>
                {quotaDescription}
              </p>
              {extraQuota > 0 && (
                <p>Cupo extra temporal: {extraQuota} publicaciones.</p>
              )}

              {!publishCheck.allowed && (
                <div className="auth-warning">
                  <strong>
                    {publishBlockReason ||
                      "No podés publicar en este momento."}
                  </strong>
                  <span>{publishBlockDetail}</span>
                </div>
              )}

              <button
                className="primary-action"
                disabled={!publishCheck.allowed}
                title={
                  !publishCheck.allowed
                    ? publishBlockReason ||
                      "No podés crear publicaciones hasta regularizar tu plan comercial."
                    : undefined
                }
                onClick={() => setShowVehicleModal(true)}
              >
                Publicar vehículo
              </button>
              {!publishCheck.allowed && (
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={() => openModule("support")}
                >
                  Contactar administración
                </button>
              )}
            </div>
          </div>
        )}

        {activeDealerModule === "leads" && (
          <DealerLeadsModule
            leads={leads}
            onRefresh={loadLeads}
            onBack={handleModuleBack}
            initialStage={leadsInitialContext?.stage ?? "all"}
            initialViewMode={leadsInitialContext?.viewMode ?? "pipeline"}
            initialAgendaGroup={leadsInitialContext?.agendaGroup ?? null}
          />
        )}

        {activeDealerModule === "sellVehicle" && (
          <DealerSellVehicleModule
            sellVehicleLeads={sellVehicleLeads}
            isPlatinum={isPlatinum}
            onRefresh={loadSellVehicleLeads}
            onBack={handleModuleBack}
          />
        )}

        {activeDealerModule === "support" && (
          <DealerSupportModule
            tickets={tickets}
            dealer={dealer}
            isPlatinum={isPlatinum}
            authProfile={authProfile}
            onRefresh={loadTickets}
            onBack={handleModuleBack}
          />
        )}

        {activeDealerModule === "financing" && (
          <div className="dealer-leads-section">
            <ModuleBackButton
              title="Financiación"
              description="Módulo de financiación propia, bancaria y simulador visible para el comprador."
            />

            <div className="empty-state">
              El módulo de configuración avanzada de financiación queda
              preparado para la siguiente fase. Las condiciones actuales se
              cargan desde cada publicación.
            </div>
          </div>
        )}

        {activeDealerModule === "metrics" && (
          <DealerMetricsModule
            dealerVehicles={dealerVehicles}
            leads={leads}
            activeVehiclesCount={activeVehiclesCount}
            totalDetailViews={totalDetailViews}
            mostViewedVehicle={mostViewedVehicle}
            newLeadsCount={newLeadsCount}
            expiresInDays={expiresInDays}
            used={used}
            limit={limit}
            remaining={remaining}
            extraQuota={extraQuota}
            isPlatinum={isPlatinum}
            rankLabel={permissions.rankLabel}
            planId={permissions.planId}
            planStatus={dealer.planStatus}
            permissions={permissions}
            reviewVehiclesCount={reviewVehiclesCount}
            onRefresh={loadDealerVehicles}
            onBack={handleModuleBack}
            onOpenInventory={navigateToInventory}
            onOpenLeads={navigateToLeads}
            onOpenSupport={() => openModule("support")}
            onOpenPublish={() => openModule("publish")}
          />
        )}

        {activeDealerModule === "urgent" && (
          <DealerUrgentModule
            dealerVehicles={dealerVehicles}
            onRefresh={loadDealerVehicles}
            onBack={handleModuleBack}
          />
        )}

        {activeDealerModule === "radar" && (
          <DealerRadarModule
            onBack={handleModuleBack}
          />
        )}

        {showVehicleModal && (
          <CreateVehicleModal
            dealer={dealer}
            dealerVehicles={dealerVehicles}
            onClose={() => setShowVehicleModal(false)}
            onCreated={refreshDealerPanel}
          />
        )}
      </div>
    </section>
  );
}
