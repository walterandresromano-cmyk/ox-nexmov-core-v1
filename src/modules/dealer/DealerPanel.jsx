import { useEffect, useMemo, useRef, useState } from "react";

import CreateVehicleModal from "../../components/CreateVehicleModal.jsx";

import DealerInventoryModule from "./DealerInventoryModule.jsx";
import DealerLeadsModule from "./DealerLeadsModule.jsx";
import DealerSupportModule from "./DealerSupportModule.jsx";
import DealerSellVehicleModule from "./DealerSellVehicleModule.jsx";
import DealerMetricsModule from "./DealerMetricsModule.jsx";
import DealerUrgentModule from "./DealerUrgentModule.jsx";

import {
  canDealerPublish,
  getEffectiveDealerPermissions,
} from "../../lib/permissions.js";
import { normalizeWhatsAppArgentina, formatRelativeTime } from "../../lib/formatters.js";

import {
  listDealersForCurrentUser,
  uploadCurrentDealerLogo,
  updateDealerWhatsappById,
} from "../../services/dealers.service.js";
import { listVehiclesForCurrentDealer } from "../../services/dealerVehicles.service.js";
import { listVehicleLeadsForCurrentUser } from "../../services/leads.service.js";
import { listSupportTicketsForCurrentUser } from "../../services/tickets.service.js";
import { listSellVehicleLeadsForCurrentDealer } from "../../services/sellVehicle.service.js";
import { listDealerNotifications, markDealerNotificationsRead } from "../../services/dealerNotifications.service.js";

const DEALER_MOBILE_SECTIONS = [
  { id: "home", label: "Inicio" },
  { id: "publish", label: "Publicar" },
  { id: "vehicles", label: "Inventario" },
  { id: "leads", label: "Leads" },
  { id: "tickets", label: "Soporte" },
  { id: "plan", label: "Mi plan" },
];

const DEALER_FEATURE_PREVIEWS = [
  {
    id: "financing",
    title: "Financiacion avanzada",
    requiredPlan: "Pro",
    description:
      "Mejora la lectura comercial de publicaciones con condiciones de financiacion mas claras.",
  },
  {
    id: "metrics",
    title: "Metricas comerciales",
    requiredPlan: "Elite",
    description:
      "Entende rendimiento, consultas y oportunidades para priorizar mejor tu stock.",
  },
  {
    id: "premiumSignals",
    title: "Senales premium",
    requiredPlan: "Elite",
    description:
      "Destaca publicaciones con senales de confianza, precio y calidad del dato.",
  },
  {
    id: "sellVehicle",
    title: "Oportunidades Vender mi vehiculo",
    requiredPlan: "Elite",
    description:
      "Recibi oportunidades comerciales asignadas por administracion para evaluar unidades.",
  },
  {
    id: "visibility",
    title: "Visibilidad destacada",
    requiredPlan: "Elite",
    description:
      "Aumenta presencia dentro de la red con beneficios de posicionamiento y lectura premium.",
  },
  {
    id: "maintenance",
    title: "Mantenimiento orientativo",
    requiredPlan: "Pro",
    description:
      "Suma contexto util sobre mantenimiento para mejorar confianza en cada publicacion.",
  },
  {
    id: "extraQuota",
    title: "Cupos extra / beneficios",
    requiredPlan: "Admin",
    description:
      "Solicita cupos temporales o beneficios comerciales especiales para campanas puntuales.",
  },
  {
    id: "prioritySupport",
    title: "Soporte prioritario",
    requiredPlan: "Platinum",
    description:
      "Gestiona consultas operativas con prioridad superior en cuentas de mayor volumen.",
  },
];

function formatLimit(limit) {
  return limit === Infinity ? "Ilimitado" : limit;
}

function getPlanAlertClass(days) {
  if (days <= 0) return "plan-alert expired";
  if (days <= 2) return "plan-alert critical";
  if (days <= 6) return "plan-alert urgent";
  if (days <= 14) return "plan-alert warning";
  return "plan-alert healthy";
}

function getPlanAlertLabel(days) {
  if (days <= 0) return "Período vencido";
  if (days <= 2) return `Vence en ${days} días`;
  if (days <= 6) return `Vencimiento cercano · ${days} días`;
  if (days <= 14) return `Próximo a vencer · ${days} días`;
  return `Activo · ${days} días restantes`;
}

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

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatARS(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "Sin precio";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatKm(value) {
  return `${Number(value || 0).toLocaleString("es-AR")} km`;
}

export default function DealerPanel({ authProfile }) {
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

  const [whatsappForm, setWhatsappForm] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState("");
  const [whatsappSuccess, setWhatsappSuccess] = useState("");
  const [uploadingDealerLogo, setUploadingDealerLogo] = useState(false);
  const [dealerLogoError, setDealerLogoError] = useState("");
  const [dealerLogoSuccess, setDealerLogoSuccess] = useState("");
  const dealerLogoInputRef = useRef(null);

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
      metrics: "plan",
    }[moduleName];

    setActiveDealerMobileSection(nextMobileSection || "home");
    setActiveDealerModule(moduleName);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      setActiveDealerModule("inventory");
      return;
    }

    if (sectionId === "leads") {
      setActiveDealerModule("leads");
      return;
    }

    if (sectionId === "tickets") {
      setActiveDealerModule("support");
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
      const hasStandardMetrics = permissions.metricsLevel !== "basic";
      const hasAdvancedMetrics =
        permissions.metricsLevel === "advanced" || permissions.metricsLevel === "full";

      return {
        available: false,
        tone: hasAdvancedMetrics ? "soon" : hasStandardMetrics ? "limited" : "locked",
        module: "support",
        status: hasAdvancedMetrics
          ? "Proximamente"
          : hasStandardMetrics
          ? `Nivel ${permissions.metricsLevel}`
          : "Disponible en Pro",
        ctaLabel: hasAdvancedMetrics ? "Proximamente" : "Solicitar upgrade",
        disabled: hasAdvancedMetrics,
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

  const financingVehiclesCount = dealerVehicles.filter(
    (vehicle) => vehicle.financing || vehicle.hasFinancing
  ).length;

  const marketReferenceVehiclesCount = dealerVehicles.filter(
    (vehicle) =>
      Number(
        vehicle.marketReferencePrice ||
          vehicle.market_reference_price ||
          vehicle.avg ||
          0
      ) > 0
  ).length;

  const photoReadyVehiclesCount = dealerVehicles.filter((vehicle) => {
    const images = vehicle.images || vehicle.images_json || [];
    return Boolean(
      vehicle.mainImageUrl ||
        vehicle.main_image_url ||
        vehicle.imageUrl ||
        vehicle.image_url ||
        (Array.isArray(images) && images.length > 0)
    );
  }).length;

  const newLeadsCount = leads.filter((lead) => lead.crm_status === "new").length;

  const negotiationLeadsCount = leads.filter(
    (lead) => lead.crm_status === "negotiation"
  ).length;

  const openTicketsCount = tickets.filter((ticket) =>
    ["new", "open", "in_progress", "waiting_dealer"].includes(ticket.status)
  ).length;

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  function renderDealerMobileTabs() {
    return (
      <nav className="dealer-mobile-tabs" aria-label="Secciones dealer mobile">
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

          <button
            type="button"
            className="primary-action"
            disabled={!publishCheck.allowed}
            onClick={() => {
              if (publishCheck.allowed) {
                setShowVehicleModal(true);
              }
            }}
          >
            Alta de vehículo
          </button>
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
            <p>{activeVehiclesCount} activas</p>
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
      </div>
    );
  }

  return (
    <section className="page-section">
      <div className="container panel dealer-panel">
        <div className="panel-head-row dealer-header-control">
          <div className="dealer-header-intro">
    <p className="eyebrow">Panel dealer único</p>
    <h1>{isPlatinum ? "Panel Dealer Platinum" : "Panel dealer"}</h1>
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

        
            <label>Dealer operativo</label>
            <div className="dealer-switcher-row">
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
              className="primary-action dealer-header-mobile-primary"
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

        {renderDealerMobileTabs()}

        {activeDealerMobileSection === "home" &&
          activeDealerModule === "summary" &&
          renderDealerMobileHome()}

        {activeDealerMobileSection === "plan" &&
          activeDealerModule === "summary" &&
          renderDealerMobilePlan()}

        {activeDealerModule === "summary" && (
          <>
          {renderDealerOnboarding()}
          <section className="dealer-dashboard-shell" aria-label="Resumen operativo dealer">
            <article className="dealer-dashboard-primary-card">
              <span>Acción principal</span>
              <h2>Alta de vehículo</h2>
              <p>Cargá una unidad con fotos, precio, financiación y datos comerciales.</p>
              <div className="dealer-dashboard-primary-meta">
                <strong>{activeVehiclesCount} activas</strong>
                <span>{dealerVehicles.length} publicaciones cargadas</span>
              </div>
              <button
                type="button"
                className="primary-action"
                disabled={!publishCheck.allowed}
                onClick={() => {
                  if (publishCheck.allowed) openModule("publish");
                }}
              >
                Publicar vehículo
              </button>
              {!publishCheck.allowed && (
                <small className="dealer-module-lock-reason">
                  {publishBlockReason || "No disponible por el estado del plan."}
                </small>
              )}
            </article>

            <div className="dealer-dashboard-ops">
              <article className="dealer-dashboard-mini-card">
                <span>Inventario</span>
                <strong>{activeVehiclesCount} activas</strong>
                <p>{reviewVehiclesCount} en revisión</p>
                <button type="button" onClick={() => openModule("inventory")}>
                  Abrir inventario
                </button>
              </article>

              <article className="dealer-dashboard-mini-card">
                <span>Leads</span>
                <strong>{newLeadsCount} nuevos</strong>
                <p>{leads.length} consultas totales</p>
                <button type="button" onClick={() => openModule("leads")}>
                  Abrir leads
                </button>
              </article>

              <article className="dealer-dashboard-mini-card">
                <span>Soporte</span>
                <strong>{openTicketsCount} abiertos</strong>
                <p>{isPlatinum ? "Prioridad Platinum visible" : "Seguimiento interno"}</p>
                <button type="button" onClick={() => openModule("support")}>
                  Abrir soporte
                </button>
              </article>

              <article className="dealer-dashboard-mini-card">
                <span>Oportunidades</span>
                <strong>{sellVehicleLeads.length}</strong>
                <p>Vender mi vehículo asignadas</p>
                <button
                  type="button"
                  disabled={!permissions.sellVehicleLeads}
                  onClick={() => {
                    if (permissions.sellVehicleLeads) openModule("sellVehicle");
                  }}
                >
                  Ver oportunidades
                </button>
              </article>
            </div>

            <aside className="dealer-dashboard-account">
              <article
                className={`dealer-dashboard-plan-card${
                  isPlatinum ? " dealer-dashboard-plan-card--platinum" : ""
                }`}
              >
                <span>{isPlatinum ? "Platinum · ilimitado" : "Mi plan"}</span>
                <strong>{isPlatinum ? "Publicaciones ilimitadas" : capacityLabel}</strong>
                <p>{secondaryCapacityLabel}</p>
                <div className="dealer-dashboard-chip-row">
                  {(isPlatinum
                    ? ["Señales completas", "Soporte prioritario", "Herramientas avanzadas"]
                    : planBenefitBadges.slice(0, 3)
                  ).map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
              </article>
            </aside>
          </section>

          {renderDealerFeaturePreview()}
          </>
        )}

        <div className="dealer-status-grid">
          <article
            className={`dealer-status-card rank-${permissions.rankTheme}${
              isPlatinum ? " dealer-plan-platinum-card" : ""
            }`}
          >
            <span>Plan actual</span>
            <strong>{permissions.rankLabel}</strong>
            <p>
              {dealer.commercialName} · {dealer.city}, {dealer.province}
            </p>
          </article>

          <article className="dealer-status-card">
            <span>Oportunidades venta</span>
            <strong>{sellVehicleLeads.length}</strong>
            <p>Solicitudes “Vender mi vehículo” asignadas por admin.</p>
          </article>
          <article className="dealer-status-card">
            <span>Cupo usado en este período</span>
            <strong>{capacityLabel}</strong>
            <p>{secondaryCapacityLabel}</p>
            {extraQuota > 0 && (
              <p>Cupo extra temporal: {extraQuota} publicaciones.</p>
            )}
          </article>

          <article
            className={`dealer-status-card dealer-plan-benefits-card${
              isPlatinum ? " dealer-plan-platinum-card" : ""
            }`}
          >
            <span>Beneficios de tu plan</span>
            <strong>{isPlatinum ? "Nivel máximo" : permissions.planLabel}</strong>
            <p>
              {isPlatinum
                ? "Métricas completas incluidas en tu plan. Módulo avanzado preparado para próximas fases."
                : "Capacidades comerciales habilitadas para este período."}
            </p>
            <div className="dealer-plan-benefits-grid">
              {planBenefitBadges.map((badge) => (
                <span key={badge} className="dealer-plan-benefit-chip">
                  {badge}
                </span>
              ))}
            </div>
          </article>

          {isPlatinum && (
            <article className="dealer-status-card platinum-operational-card">
              <span>Señales operativas de tu stock</span>
              <strong>Lectura Platinum</strong>
              <p>
                Señales calculadas solo con datos cargados en tus publicaciones.
              </p>
              <div className="platinum-operational-chip-row">
                <span className="platinum-operational-chip">
                  {financingVehiclesCount} con financiación
                </span>
                <span className="platinum-operational-chip">
                  {marketReferenceVehiclesCount} con referencia de mercado
                </span>
                <span className="platinum-operational-chip">
                  {photoReadyVehiclesCount} con fotos
                </span>
                <span className="platinum-operational-chip">
                  {reviewVehiclesCount} en revisión
                </span>
              </div>
            </article>
          )}

          <article className="dealer-status-card">
            <span>Estado comercial</span>
            <strong>{getPlanStatusLabel(dealer.planStatus)}</strong>
            <p className={getPlanStatusAlertClass(dealer.planStatus, expiresInDays)}>
              {planStatusDescription}
            </p>
            {!publishCheck.allowed && (
              <button
                type="button"
                className="table-action-btn"
                onClick={() => openModule("support")}
              >
                Contactar administración
              </button>
            )}
          </article>

          <article className="dealer-status-card">
            <span>Vehículos activos</span>
            <strong>{activeVehiclesCount}</strong>
            <p>{dealerVehicles.length} publicaciones totales del dealer.</p>
          </article>
        </div>

        <div className="dealer-status-grid">
          <article className="dealer-status-card">
            <span>Leads nuevos</span>
            <strong>{newLeadsCount}</strong>
            <p>{leads.length} leads visibles para este dealer.</p>
          </article>

          <article className="dealer-status-card">
            <span>Negociación</span>
            <strong>{negotiationLeadsCount}</strong>
            <p>Oportunidades comerciales activas.</p>
          </article>

          <article className="dealer-status-card">
            <span>Tickets abiertos</span>
            <strong>{openTicketsCount}</strong>
            <p>Consultas internas pendientes o en proceso.</p>
            {isPlatinum && (
              <span className="dealer-platinum-priority-badge">
                Prioridad Platinum
              </span>
            )}
          </article>

          <article className="dealer-status-card">
            <span>En revisión</span>
            <strong>{reviewVehiclesCount}</strong>
            <p>Publicaciones pendientes de revisión.</p>
          </article>
        </div>

        {activeDealerModule === "summary" && notifications.length > 0 && (
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

        {activeDealerModule === "summary" && (
          <div className="dealer-modules-grid">
            <article
              className={
                permissions.sellVehicleLeads
                  ? "dealer-module-card clickable-module-card"
                  : "dealer-module-card dealer-module-card--locked"
              }
              onClick={() => openModule("inventory")}
            >
              <h3>Mis vehículos</h3>
              <p>
                {dealerVehicles.length > 0
                  ? `${dealerVehicles.length} publicaciones reales cargadas.`
                  : "Todavía no hay publicaciones reales para este dealer."}
              </p>
              <button type="button">Abrir inventario</button>
            </article>

            <article
              className={
                publishCheck.allowed
                  ? "dealer-module-card clickable-module-card"
                  : "dealer-module-card dealer-module-card--locked"
              }
              onClick={() => {
                if (publishCheck.allowed) openModule("publish");
              }}
            >
              <h3>Alta de vehículo</h3>
              <p>
                Carga guiada por catálogo, validación automática y control de
                cupo.
              </p>
              {!publishCheck.allowed && (
                <small className="dealer-module-lock-reason">
                  {publishBlockReason || "No disponible por el estado del plan."}
                </small>
              )}
              <button type="button" disabled={!publishCheck.allowed}>
                Publicar vehículo
              </button>
              {!publishCheck.allowed && (
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    openModule("support");
                  }}
                >
                  Contactar administración
                </button>
              )}
            </article>

            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule("leads")}
            >
              <h3>Leads recibidos</h3>
              <p>
                {leads.length > 0
                  ? `${leads.length} consultas reales recibidas.`
                  : "Todavía no hay consultas reales para este dealer."}
              </p>
              <button type="button">Abrir leads</button>
            </article>

            <article
              className={`dealer-module-card dealer-module-card--locked${
                isPlatinum ? " dealer-platinum-tool-card" : ""
              }`}
            >
              <h3>Financiación</h3>
              <p>
                {isPlatinum
                  ? "Incluido en Platinum. Herramientas completas preparadas para configuración comercial avanzada."
                  : permissions.fullFinancingTools
                  ? "Financiación propia, bancaria y simulador visible al comprador."
                  : "Financiación básica informada. Herramientas completas disponibles en planes superiores."}
              </p>
              {isPlatinum && (
                <div className="platinum-operational-chip-row">
                  <span className="platinum-operational-chip">Visualizaciones</span>
                  <span className="platinum-operational-chip">Leads</span>
                  <span className="platinum-operational-chip">WhatsApp</span>
                  <span className="platinum-operational-chip">Comparaciones</span>
                  <span className="platinum-operational-chip">
                    Publicaciones activas
                  </span>
                </div>
              )}
              <button type="button" disabled>
                {isPlatinum ? "Incluido en Platinum" : "Proximamente"}
              </button>
            </article>

            <article
              className={`dealer-module-card dealer-module-card--locked${
                isPlatinum ? " dealer-platinum-tool-card" : ""
              }`}
            >
              <h3>Métricas</h3>
              <p>
                {isPlatinum
                  ? "Métricas completas incluidas en tu plan. Módulo avanzado preparado para próximas fases."
                  : `Nivel habilitado: ${permissions.metricsLevel}`}
              </p>
              <button type="button" disabled>
                {isPlatinum ? "Preparado para próximas fases" : "Proximamente"}
              </button>
            </article>

            <article
              className={`dealer-module-card clickable-module-card${
                isPlatinum ? " dealer-platinum-tool-card" : ""
              }`}
              onClick={() => {
                if (permissions.sellVehicleLeads) {
                  openModule("sellVehicle");
                }
              }}
            >
              <h3>Vender mi vehículo</h3>
              <p>
                {permissions.sellVehicleLeads
                  ? isPlatinum
                    ? "Habilitado para oportunidades comerciales asignadas por admin. Sin asignación automática simulada."
                    : "Habilitado para recibir oportunidades asignadas por admin."
                  : "No habilitado por defecto. Admin puede activarlo como beneficio."}
              </p>
              {isPlatinum && (
                <span className="platinum-opportunity-state">
                  {sellVehicleLeads.length} oportunidades reales asignadas
                </span>
              )}
              <button type="button" disabled={!permissions.sellVehicleLeads}>
                Ver oportunidades
              </button>
            </article>

            <article
              className={
                reviewVehiclesCount > 0
                  ? "dealer-module-card clickable-module-card"
                  : "dealer-module-card dealer-module-card--locked"
              }
              onClick={() => {
                if (reviewVehiclesCount > 0) openModule("urgent");
              }}
            >
              <h3>Urgencias / Observaciones</h3>
              <p>
                Publicaciones observadas, revisión urgente y correcciones
                necesarias.
              </p>
              <button type="button" disabled={reviewVehiclesCount === 0}>
                Ver urgencias
              </button>
            </article>

            <article
              className={`dealer-module-card clickable-module-card${
                isPlatinum ? " dealer-platinum-tool-card" : ""
              }`}
              onClick={() => openModule("support")}
            >
              <h3>Soporte admin</h3>
              <p>
                {isPlatinum
                  ? "Tus tickets se identifican con prioridad Platinum para seguimiento interno."
                  : "Tickets internos estilo Remedy para resolver consultas sin salir de la plataforma."}
              </p>
              {isPlatinum && (
                <span className="dealer-platinum-priority-badge">
                  Prioridad Platinum
                </span>
              )}
              <button type="button">Abrir soporte</button>
            </article>
          </div>
        )}

        {activeDealerModule === "inventory" && (
          <DealerInventoryModule
            dealerVehicles={dealerVehicles}
            onRefresh={loadDealerVehicles}
            onBack={handleModuleBack}
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
            isPlatinum={isPlatinum}
            rankLabel={permissions.rankLabel}
            onRefresh={loadDealerVehicles}
            onBack={handleModuleBack}
            onOpenInventory={() => openModule("inventory")}
            onOpenLeads={() => openModule("leads")}
          />
        )}

        {activeDealerModule === "urgent" && (
          <DealerUrgentModule
            dealerVehicles={dealerVehicles}
            reviewVehiclesCount={reviewVehiclesCount}
            onRefresh={loadDealerVehicles}
            onBack={handleModuleBack}
          />
        )}

        {showVehicleModal && (
          <CreateVehicleModal
            dealer={dealer}
            onClose={() => setShowVehicleModal(false)}
            onCreated={refreshDealerPanel}
          />
        )}
      </div>
    </section>
  );
}
