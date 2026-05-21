import { useEffect, useMemo, useState } from "react";
import VehicleLeadDetailModal from "../../components/VehicleLeadDetailModal.jsx";
import CreateSupportTicketModal from "../../components/CreateSupportTicketModal.jsx";
import AdminSellVehicleLeadsSection from "../../components/AdminSellVehicleLeadsSection.jsx";
import GrantExtraSlotsModal from "../../components/GrantExtraSlotsModal.jsx";
import AdminVehiclesSection from "../../components/AdminVehiclesSection.jsx";
import LeadStatusSelect from "../../components/LeadStatusSelect.jsx";
import TicketDetailModal from "../../components/TicketDetailModal.jsx";
import TicketStatusSelect from "../../components/TicketStatusSelect.jsx";
import AdminZeroKmLeadsSection from "../../components/AdminZeroKmLeadsSection.jsx";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import { listDealersForAdmin } from "../../services/dealers.service.js";
import { listVehicleLeadsForCurrentUser } from "../../services/leads.service.js";
import { listSupportTicketsForCurrentUser } from "../../services/tickets.service.js";
import { listVehiclesForAdmin } from "../../services/adminVehicles.service.js";
import { listSellVehicleLeadsForAdmin } from "../../services/sellVehicle.service.js";
import { listZeroKmFinancingLeadsForCurrentUser } from "../../services/zeroKm.service.js";
import {
  createDealerFromAdmin,
  activateDealerFromAdmin,
  updateDealerPlanFromAdmin,
  uploadDealerLogoFromAdmin,
  suspendDealerFromAdmin,
} from "../../services/adminDealers.service.js";
import { persistAdminAction, listAdminActionLogs } from "../../services/adminActionLog.service.js";

const ADMIN_MODULES = {
  DEALERS: "dealers",
  VEHICLES: "vehicles",
  COMMERCIAL_LEADS: "commercialLeads",
  SELL_VEHICLE: "sellVehicle",
  ZERO_KM: "zeroKm",
  TICKETS: "tickets",
  ACTION_LOG: "actionLog",
};

const ACTION_LABELS = {
  suspend_dealer: "Suspender dealer",
  activate_dealer: "Activar dealer",
  update_plan: "Actualizar plan",
  create_dealer: "Crear dealer",
  approve_review: "Aprobar revisión",
  pause: "Pausar publicación",
  reactivate: "Reactivar publicación",
  reserve: "Reservar publicación",
  mark_sold: "Marcar vendida",
  send_to_review: "Enviar a revisión",
};

const ADMIN_MOBILE_SECTIONS = [
  { id: "summary", label: "Resumen" },
  { id: "dealers", label: "Dealers" },
  { id: "vehicles", label: "Publicaciones" },
  { id: "leads", label: "Leads" },
  { id: "tickets", label: "Tickets" },
  { id: "system", label: "Sistema" },
];

const PLAN_OPTIONS = [
  { value: "inicio", label: "Inicio" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Elite" },
  { value: "platinum", label: "Platinum" },
];

function formatLimit(limit) {
  return limit === Infinity ? "Ilimitado" : limit;
}

function getAlertLabel(days) {
  if (days <= 0) return "Vencido";
  if (days <= 2) return "Crítico";
  if (days <= 6) return "Urgente";
  if (days <= 14) return "Próximo";
  return "Activo";
}

function getAlertClass(days) {
  if (days <= 0) return "admin-chip danger";
  if (days <= 2) return "admin-chip danger";
  if (days <= 6) return "admin-chip orange";
  if (days <= 14) return "admin-chip warning";
  return "admin-chip success";
}

function getPlanStatusLabel(status) {
  if (status === "pending_activation") return "Pendiente";
  if (status === "active") return "Activo";
  if (status === "expiring") return "Por vencer";
  if (status === "expired_grace") return "En gracia";
  if (status === "suspended") return "Suspendido";
  return status || "Sin estado";
}

function getPlanStatusClass(status) {
  if (status === "pending_activation") return "admin-chip warning";
  if (status === "active") return "admin-chip success";
  if (status === "expired_grace" || status === "suspended") {
    return "admin-chip danger";
  }
  if (status === "expiring") return "admin-chip orange";
  return "admin-chip warning";
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

function normalizeText(value) {
  return String(value || "").trim();
}

function getDealerPlanValue(dealer) {
  return String(
    dealer?.planCode ||
      dealer?.plan_code ||
      dealer?.plan ||
      dealer?.subscriptionPlan ||
      dealer?.subscription_plan ||
      dealer?.planType ||
      dealer?.plan_type ||
      dealer?.rango ||
      dealer?.rank ||
      ""
  )
    .trim()
    .toLowerCase();
}

function isDealerPlatinum(dealer) {
  return getDealerPlanValue(dealer) === "platinum";
}

export default function AdminPanel({ authProfile }) {
  const [activeModule, setActiveModule] = useState(null);
  const [activeAdminMobileSection, setActiveAdminMobileSection] =
    useState("summary");

  const [adminActionLog, setAdminActionLog] = useState([]);

  function logAdminAction({ action, target, detail = "", result = "success" }) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      action,
      target,
      detail,
      result,
      adminEmail: authProfile?.email || "admin",
    };
    setAdminActionLog((prev) => [entry, ...prev]);
    persistAdminAction({
      action,
      target,
      detail,
      result,
      adminEmail: authProfile?.email || "",
    });
  }

  async function loadActionLogs() {
    const { logs } = await listAdminActionLogs({ limit: 200 });
    if (logs.length > 0) {
      setAdminActionLog(
        logs.map((log) => ({
          id: log.id,
          timestamp: log.created_at,
          action: log.action,
          target: log.target,
          detail: log.detail || "",
          result: log.result || "success",
          adminEmail: log.admin_email || "admin",
        }))
      );
    }
  }

  const [searchText, setSearchText] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dealers, setDealers] = useState([]);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [dealersError, setDealersError] = useState("");

  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState("");
  const [leadSearchText, setLeadSearchText] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");
  const [ticketSearchText, setTicketSearchText] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");

  const [adminVehicles, setAdminVehicles] = useState([]);
  const [adminVehiclesError, setAdminVehiclesError] = useState("");
  const [sellVehicleLeads, setSellVehicleLeads] = useState([]);
  const [sellVehicleLeadsError, setSellVehicleLeadsError] = useState("");
  const [zeroKmLeads, setZeroKmLeads] = useState([]);
  const [zeroKmLeadsError, setZeroKmLeadsError] = useState("");

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedDealerForSlots, setSelectedDealerForSlots] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [selectedDealerForTicket, setSelectedDealerForTicket] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCreateDealer, setShowCreateDealer] = useState(false);

  const [newDealerForm, setNewDealerForm] = useState({
    name: "",
    email: "",
    province: "",
    city: "",
    planCode: "inicio",
    phone: "",
  });

  const [creatingDealer, setCreatingDealer] = useState(false);
  const [createDealerError, setCreateDealerError] = useState("");

  const [activatingDealer, setActivatingDealer] = useState(false);
  const [activateDealerError, setActivateDealerError] = useState("");

  const [updatingDealerPlan, setUpdatingDealerPlan] = useState(false);
  const [dealerPlanError, setDealerPlanError] = useState("");
  const [dealerPlanForm, setDealerPlanForm] = useState({
    planCode: "inicio",
  });

  const [uploadingDealerLogo, setUploadingDealerLogo] = useState(false);
  const [dealerLogoError, setDealerLogoError] = useState("");
  const [dealerLogoSuccess, setDealerLogoSuccess] = useState("");
  const [suspendingDealer, setSuspendingDealer] = useState(false);
  const [suspendDealerError, setSuspendDealerError] = useState("");
  const [suspendConfirmPending, setSuspendConfirmPending] = useState(false);


  async function loadDealers() {
    setLoadingDealers(true);
    setDealersError("");

    const { dealers: supabaseDealers, error } = await listDealersForAdmin();

    if (error) {
      setDealers([]);
      setDealersError("No pudimos cargar dealers reales en este momento.");
      setLoadingDealers(false);
      return;
    }

    if (!supabaseDealers.length) {
      setDealers([]);
      setDealersError("No hay dealers reales cargados en la red.");
      setLoadingDealers(false);
      return;
    }

    setDealers(supabaseDealers);
    setLoadingDealers(false);
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

    const nextLeads = supabaseLeads || [];
    setLeads(nextLeads);

    setSelectedLead((currentLead) => {
      if (!currentLead?.lead_id) return currentLead;

      const refreshedLead = nextLeads.find(
        (lead) => lead.lead_id === currentLead.lead_id
      );

      return refreshedLead || currentLead;
    });

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

  async function loadAdminVehiclesSummary() {
    setAdminVehiclesError("");

    const { vehicles: supabaseVehicles, error } = await listVehiclesForAdmin();

    if (error) {
      setAdminVehicles([]);
      setAdminVehiclesError(
        error.message || "No se pudieron cargar publicaciones."
      );
      return;
    }

    setAdminVehicles(supabaseVehicles || []);
  }

  async function loadSellVehicleLeadsSummary() {
    setSellVehicleLeadsError("");

    const { leads: supabaseLeads, error } =
      await listSellVehicleLeadsForAdmin();

    if (error) {
      setSellVehicleLeads([]);
      setSellVehicleLeadsError(
        error.message || "No se pudieron cargar solicitudes de venta."
      );
      return;
    }

    setSellVehicleLeads(supabaseLeads || []);
  }

  async function loadZeroKmLeadsSummary() {
    setZeroKmLeadsError("");

    const { leads: supabaseLeads, error } =
      await listZeroKmFinancingLeadsForCurrentUser();

    if (error) {
      setZeroKmLeads([]);
      setZeroKmLeadsError(
        error.message || "No se pudieron cargar consultas 0km."
      );
      return;
    }

    setZeroKmLeads(supabaseLeads || []);
  }

  async function refreshAdminPanel() {
    await Promise.all([
      loadDealers(),
      loadLeads(),
      loadTickets(),
      loadAdminVehiclesSummary(),
      loadSellVehicleLeadsSummary(),
      loadZeroKmLeadsSummary(),
    ]);
  }

  async function handleTicketUpdated() {
    await loadTickets();
  }

  async function handleCreateDealer() {
    setCreatingDealer(true);
    setCreateDealerError("");

    const cleanForm = {
      name: normalizeText(newDealerForm.name),
      email: normalizeText(newDealerForm.email).toLowerCase(),
      province: normalizeText(newDealerForm.province),
      city: normalizeText(newDealerForm.city),
      phone: normalizeText(newDealerForm.phone),
      planCode: newDealerForm.planCode || "inicio",
    };

    if (!cleanForm.name) {
      setCreateDealerError("El nombre comercial del dealer es obligatorio.");
      setCreatingDealer(false);
      return;
    }

    if (!cleanForm.email) {
      setCreateDealerError("El email de acceso del dealer es obligatorio.");
      setCreatingDealer(false);
      return;
    }

    if (!cleanForm.province || !cleanForm.city) {
      setCreateDealerError("Provincia y ciudad son obligatorias.");
      setCreatingDealer(false);
      return;
    }

    const { error } = await createDealerFromAdmin({
      name: cleanForm.name,
      province: cleanForm.province,
      city: cleanForm.city,
      planCode: cleanForm.planCode,
      contactPhone: cleanForm.phone,
      phoneWhatsapp: cleanForm.phone,
      accessEmail: cleanForm.email,
    });

    if (error) {
      setCreateDealerError(error.message || "Error al crear dealer.");
      setCreatingDealer(false);
      return;
    }

    logAdminAction({
      action: "create_dealer",
      target: cleanForm.name,
      detail: `${cleanForm.email} · ${cleanForm.planCode} · ${cleanForm.city}, ${cleanForm.province}`,
    });

    setShowCreateDealer(false);
    setNewDealerForm({
      name: "",
      email: "",
      province: "",
      city: "",
      planCode: "inicio",
      phone: "",
    });

    await loadDealers();
    setCreatingDealer(false);
  }

  async function handleActivateSelectedDealer() {
    if (!selectedDealer?.id) return;

    setActivatingDealer(true);
    setActivateDealerError("");

    const { error } = await activateDealerFromAdmin({
      dealerId: selectedDealer.id,
    });

    if (error) {
      setActivateDealerError(error.message || "No se pudo activar el dealer.");
      setActivatingDealer(false);
      return;
    }

    logAdminAction({
      action: "activate_dealer",
      target: selectedDealer.commercialName,
      detail: `Plan: ${selectedDealer.plan || selectedDealer.planCode || "—"}`,
    });

    await refreshAdminPanel();
    setSelectedDealer(null);
    setActiveModule(ADMIN_MODULES.DEALERS);
    setActivatingDealer(false);
  }

  function handleSuspendSelectedDealer() {
    if (!selectedDealer?.id) return;
    setSuspendDealerError("");
    setSuspendConfirmPending(true);
  }

  async function handleSuspendConfirmed() {
    setSuspendConfirmPending(false);
    setSuspendingDealer(true);
    setSuspendDealerError("");

    const { error } = await suspendDealerFromAdmin({
      dealerId: selectedDealer.id,
      reason: "Suspensión manual desde panel admin.",
    });

    if (error) {
      setSuspendDealerError(error.message || "No se pudo suspender el dealer.");
      setSuspendingDealer(false);
      return;
    }

    logAdminAction({
      action: "suspend_dealer",
      target: selectedDealer.commercialName,
    });

    await refreshAdminPanel();
    setSelectedDealer(null);
    setActiveModule(ADMIN_MODULES.DEALERS);
    setSuspendingDealer(false);
  }

  async function handleUpdateDealerPlan() {
    if (!selectedDealer?.id) return;

    setUpdatingDealerPlan(true);
    setDealerPlanError("");

    const { error } = await updateDealerPlanFromAdmin({
      dealerId: selectedDealer.id,
      planCode: dealerPlanForm.planCode,
    });

    if (error) {
      setDealerPlanError(error.message || "No se pudo actualizar el plan.");
      setUpdatingDealerPlan(false);
      return;
    }

    logAdminAction({
      action: "update_plan",
      target: selectedDealer.commercialName,
      detail: `Nuevo plan: ${dealerPlanForm.planCode}`,
    });

    await refreshAdminPanel();
    setSelectedDealer(null);
    setActiveModule(ADMIN_MODULES.DEALERS);
    setUpdatingDealerPlan(false);
  }

  async function handleDealerLogoFile(file) {
    if (!selectedDealer?.id) return;

    setUploadingDealerLogo(true);
    setDealerLogoError("");
    setDealerLogoSuccess("");

    const { logoUrl, error } = await uploadDealerLogoFromAdmin({
      dealerId: selectedDealer.id,
      file,
    });

    if (error) {
      setDealerLogoError(
        error.message || "No se pudo subir la imagen institucional."
      );
      setUploadingDealerLogo(false);
      return;
    }

    setSelectedDealer((currentDealer) =>
      currentDealer
        ? {
            ...currentDealer,
            logo: logoUrl,
            raw: {
              ...(currentDealer.raw || {}),
              logo_url: logoUrl,
            },
          }
        : currentDealer
    );

    setDealers((currentDealers) =>
      currentDealers.map((dealer) =>
        dealer.id === selectedDealer.id
          ? {
              ...dealer,
              logo: logoUrl,
              raw: {
                ...(dealer.raw || {}),
                logo_url: logoUrl,
              },
            }
          : dealer
      )
    );

    setDealerLogoSuccess("Imagen institucional actualizada.");
    await loadDealers();
    setUploadingDealerLogo(false);
  }

  function handleDealerLogoInputChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    handleDealerLogoFile(file);
  }

  function handleDealerLogoDrop(event) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    handleDealerLogoFile(file);
  }

  function openModule(moduleName) {
    const nextMobileSection = {
      [ADMIN_MODULES.DEALERS]: "dealers",
      [ADMIN_MODULES.VEHICLES]: "vehicles",
      [ADMIN_MODULES.COMMERCIAL_LEADS]: "leads",
      [ADMIN_MODULES.SELL_VEHICLE]: "system",
      [ADMIN_MODULES.ZERO_KM]: "system",
      [ADMIN_MODULES.TICKETS]: "tickets",
      [ADMIN_MODULES.ACTION_LOG]: "system",
    }[moduleName];

    setSelectedDealer(null);
    setShowCreateDealer(false);
    setCreateDealerError("");
    setActivateDealerError("");
    setDealerPlanError("");
    setDealerLogoError("");
    setDealerLogoSuccess("");
    setSuspendDealerError("");
    setActiveAdminMobileSection(nextMobileSection || "summary");
    setActiveModule(moduleName);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (moduleName === ADMIN_MODULES.ACTION_LOG) {
      loadActionLogs();
    }
  }

  function openDealerDetail(dealer) {
    setSelectedDealer(dealer);
    setShowCreateDealer(false);
    setCreateDealerError("");
    setActivateDealerError("");
    setDealerPlanError("");
    setDealerLogoError("");
    setDealerLogoSuccess("");
    setSuspendDealerError("");
    setDealerPlanForm({
      planCode: getDealerPlanValue(dealer) || "inicio",
    });

    window.setTimeout(() => {
      const detail = document.getElementById("admin-dealer-detail");
      detail?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  useEffect(() => {
    refreshAdminPanel();
    loadActionLogs();
  }, []);

  const filteredDealers = useMemo(() => {
    return dealers.filter((dealer) => {
      const text = searchText.trim().toLowerCase();

      const matchesText =
        !text ||
        dealer.commercialName?.toLowerCase().includes(text) ||
        dealer.city?.toLowerCase().includes(text) ||
        dealer.province?.toLowerCase().includes(text) ||
        getDealerPlanValue(dealer).includes(text) ||
        dealer.planStatus?.toLowerCase().includes(text);

      const matchesPlan =
        planFilter === "all" || getDealerPlanValue(dealer) === planFilter;
      const matchesStatus =
        statusFilter === "all" || dealer.planStatus === statusFilter;

      return matchesText && matchesPlan && matchesStatus;
    });
  }, [dealers, searchText, planFilter, statusFilter]);

  const filteredLeads = useMemo(() => {
    const text = leadSearchText.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus =
        leadStatusFilter === "all" || lead.crm_status === leadStatusFilter;

      const haystack = [
        lead.lead_id,
        lead.buyer_first_name,
        lead.buyer_last_name,
        lead.buyer_email,
        lead.buyer_phone,
        lead.vehicle_brand,
        lead.vehicle_model,
        lead.vehicle_version,
        lead.vehicle_title_snapshot,
        lead.dealer_name_real,
        lead.dealer_name_snapshot,
        lead.message,
        lead.crm_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesText = !text || haystack.includes(text);

      return matchesStatus && matchesText;
    });
  }, [leads, leadSearchText, leadStatusFilter]);

  const filteredTickets = useMemo(() => {
    const text = ticketSearchText.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus =
        ticketStatusFilter === "all" || ticket.status === ticketStatusFilter;

      const haystack = [
        ticket.ticket_id,
        ticket.dealer_name,
        ticket.created_by_email,
        ticket.assigned_to_email,
        ticket.subject,
        ticket.message,
        ticket.priority,
        ticket.status,
        ticket.category,
        ticket.admin_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesText = !text || haystack.includes(text);

      return matchesStatus && matchesText;
    });
  }, [tickets, ticketSearchText, ticketStatusFilter]);

  const totalDealers = dealers.length;
  const activeDealers = dealers.filter(
    (dealer) => dealer.planStatus === "active" || dealer.planStatus === "expiring"
  ).length;
  const pendingDealers = dealers.filter(
    (dealer) => dealer.planStatus === "pending_activation"
  ).length;
  const suspendedDealers = dealers.filter(
    (dealer) => dealer.planStatus === "suspended"
  ).length;

  const expiringDealers = dealers.filter(
    (dealer) => dealer.currentPeriod?.expiresInDays <= 14
  ).length;

  const expiredDealers = dealers.filter(
    (dealer) => dealer.currentPeriod?.expiresInDays <= 0
  ).length;

  const sellVehicleEnabled = dealers.filter((dealer) => {
    const permissions = getEffectiveDealerPermissions(dealer);
    return permissions.sellVehicleLeads;
  }).length;

  const totalLeads = leads.length;
  const newLeads = leads.filter((lead) => lead.crm_status === "new").length;
  const contactedLeads = leads.filter(
    (lead) => lead.crm_status === "contacted"
  ).length;
  const negotiationLeads = leads.filter(
    (lead) => lead.crm_status === "negotiation"
  ).length;

  const totalTickets = tickets.length;
  const newTickets = tickets.filter((ticket) => ticket.status === "new").length;
  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "in_progress"
  ).length;
  const urgentTickets = tickets.filter(
    (ticket) => ticket.priority === "urgent"
  ).length;
  const openTickets = tickets.filter((ticket) =>
    ["new", "in_progress"].includes(ticket.status)
  ).length;

  const totalVehicles = adminVehicles.length;
  const activeVehicles = adminVehicles.filter((vehicle) => vehicle.is_active).length;
  const reviewVehicles = adminVehicles.filter(
    (vehicle) =>
      vehicle.review_status === "needs_review" ||
      vehicle.publication_status === "review"
  ).length;

  const totalSellVehicleLeads = sellVehicleLeads.length;
  const newSellVehicleLeads = sellVehicleLeads.filter(
    (lead) => lead.status === "new"
  ).length;

  const totalZeroKmLeads = zeroKmLeads.length;
  const newZeroKmLeads = zeroKmLeads.filter((lead) => lead.status === "new").length;

  const adminAttentionTotal =
    reviewVehicles +
    newLeads +
    openTickets +
    newZeroKmLeads +
    newSellVehicleLeads +
    pendingDealers +
    expiringDealers +
    suspendedDealers;

  function getDealerForTicket(ticket) {
    const ticketDealerId = String(
      ticket?.dealer_id || ticket?.dealerId || ticket?.dealer || ""
    ).trim();

    if (ticketDealerId) {
      const matchById = dealers.find(
        (dealer) => String(dealer.id) === ticketDealerId
      );

      if (matchById) return matchById;
    }

    const ticketDealerName = normalizeText(
      ticket?.dealer_name || ticket?.dealerName
    ).toLowerCase();

    if (!ticketDealerName) return null;

    return (
      dealers.find((dealer) => {
        const commercialName = normalizeText(dealer.commercialName).toLowerCase();
        const name = normalizeText(dealer.name).toLowerCase();
        return commercialName === ticketDealerName || name === ticketDealerName;
      }) || null
    );
  }

  function isTicketFromPlatinumDealer(ticket) {
    const dealer = getDealerForTicket(ticket);
    return dealer ? isDealerPlatinum(dealer) : false;
  }

  const activeModuleLabel = {
    [ADMIN_MODULES.DEALERS]: "Dealers",
    [ADMIN_MODULES.VEHICLES]: "Publicaciones",
    [ADMIN_MODULES.COMMERCIAL_LEADS]: "Leads comerciales",
    [ADMIN_MODULES.SELL_VEHICLE]: "Vender mi vehículo",
    [ADMIN_MODULES.ZERO_KM]: "Financiación 0km",
    [ADMIN_MODULES.TICKETS]: "Tickets internos",
    [ADMIN_MODULES.ACTION_LOG]: "Registro de acciones",
  }[activeModule];

  function getAdminDateValue(item) {
    return (
      item?.created_at ||
      item?.createdAt ||
      item?.updated_at ||
      item?.updatedAt ||
      item?.submitted_at ||
      item?.submittedAt ||
      item?.last_message_at ||
      ""
    );
  }

  function getRecentItems(items, limit = 4) {
    return [...items]
      .sort(
        (firstItem, secondItem) =>
          new Date(getAdminDateValue(secondItem) || 0) -
          new Date(getAdminDateValue(firstItem) || 0)
      )
      .slice(0, limit);
  }

  function getLeadBuyerName(lead) {
    return (
      [lead?.buyer_first_name, lead?.buyer_last_name].filter(Boolean).join(" ") ||
      lead?.buyer_email ||
      "Lead comercial"
    );
  }

  function getVehicleAdminTitle(vehicle) {
    return (
      [vehicle?.brand, vehicle?.model, vehicle?.version]
        .filter(Boolean)
        .join(" ") || "Publicación"
    );
  }

  function renderBackToSummaryButton() {
    if (!activeModule) return null;

    return (
      <button
        type="button"
        className="admin-refresh-btn"
        onClick={() => {
          setSelectedDealer(null);
          setShowCreateDealer(false);
          setCreateDealerError("");
          setActivateDealerError("");
          setDealerPlanError("");
          setDealerLogoError("");
          setDealerLogoSuccess("");
          setSuspendDealerError("");
          setActiveAdminMobileSection("summary");
          setActiveModule(null);
        }}
      >
        ← Volver al resumen
      </button>
    );
  }

  function renderSummary() {
    const kpiCards = [
      {
        label: "Dealers activos",
        value: activeDealers,
        text: `${totalDealers} dealers cargados en la red.`,
        module: ADMIN_MODULES.DEALERS,
        tone: "success",
      },
      {
        label: "Publicaciones activas",
        value: activeVehicles,
        text: `${totalVehicles} publicaciones totales.`,
        module: ADMIN_MODULES.VEHICLES,
        tone: "info",
      },
      {
        label: "En revisión",
        value: reviewVehicles,
        text: "Publicaciones que necesitan decisión admin.",
        module: ADMIN_MODULES.VEHICLES,
        tone: reviewVehicles > 0 ? "warning" : "neutral",
      },
      {
        label: "Leads nuevos",
        value: newLeads,
        text: `${totalLeads} consultas comprador-dealer.`,
        module: ADMIN_MODULES.COMMERCIAL_LEADS,
        tone: newLeads > 0 ? "warning" : "neutral",
      },
      {
        label: "Tickets abiertos",
        value: openTickets,
        text: `${urgentTickets} marcados como urgentes.`,
        module: ADMIN_MODULES.TICKETS,
        tone: urgentTickets > 0 ? "danger" : "info",
      },
      {
        label: "Consultas 0km",
        value: totalZeroKmLeads,
        text: `${newZeroKmLeads} nuevas para revisar.`,
        module: ADMIN_MODULES.ZERO_KM,
        tone: newZeroKmLeads > 0 ? "warning" : "neutral",
      },
      {
        label: "Vender vehículo",
        value: totalSellVehicleLeads,
        text: `${newSellVehicleLeads} solicitudes nuevas.`,
        module: ADMIN_MODULES.SELL_VEHICLE,
        tone: newSellVehicleLeads > 0 ? "warning" : "neutral",
      },
    ];

    const operationalAlerts = [
      {
        label: "Publicaciones pendientes de revisión",
        value: reviewVehicles,
        text: "Revisar contenido, imágenes y estado antes de mantenerlas visibles.",
        module: ADMIN_MODULES.VEHICLES,
        tone: "warning",
      },
      {
        label: "Tickets abiertos",
        value: openTickets,
        text: "Casos de soporte que pueden frenar operación de dealers.",
        module: ADMIN_MODULES.TICKETS,
        tone: urgentTickets > 0 ? "danger" : "warning",
      },
      {
        label: "Leads sin primera gestión",
        value: newLeads,
        text: "Consultas comerciales que todavía no pasaron a contactado.",
        module: ADMIN_MODULES.COMMERCIAL_LEADS,
        tone: "warning",
      },
      {
        label: "Dealers por vencer o en gracia",
        value: expiringDealers + expiredDealers,
        text: "Seguimiento comercial de planes, vencimientos y continuidad.",
        module: ADMIN_MODULES.DEALERS,
        tone: expiredDealers > 0 ? "danger" : "warning",
      },
      {
        label: "Dealers pendientes o suspendidos",
        value: pendingDealers + suspendedDealers,
        text: "Altas pendientes, accesos comerciales o cuentas fuera de operación.",
        module: ADMIN_MODULES.DEALERS,
        tone: suspendedDealers > 0 ? "danger" : "warning",
      },
      {
        label: "0km y vender vehículo por revisar",
        value: newZeroKmLeads + newSellVehicleLeads,
        text: "Canales públicos que necesitan seguimiento operativo.",
        module:
          newZeroKmLeads >= newSellVehicleLeads
            ? ADMIN_MODULES.ZERO_KM
            : ADMIN_MODULES.SELL_VEHICLE,
        tone: "info",
      },
    ];

    const activeAlerts = operationalAlerts.filter((alert) => alert.value > 0);
    const recentActivity = [
      ...getRecentItems(leads, 3).map((lead) => ({
        type: "Lead",
        title: getLeadBuyerName(lead),
        detail:
          lead.vehicle_title_snapshot ||
          [lead.vehicle_brand, lead.vehicle_model].filter(Boolean).join(" ") ||
          "Consulta comercial",
        date: getAdminDateValue(lead),
        module: ADMIN_MODULES.COMMERCIAL_LEADS,
      })),
      ...getRecentItems(adminVehicles, 3).map((vehicle) => ({
        type: "Publicación",
        title: getVehicleAdminTitle(vehicle),
        detail: vehicle.dealer_name || vehicle.city || "Inventario",
        date: getAdminDateValue(vehicle),
        module: ADMIN_MODULES.VEHICLES,
      })),
      ...getRecentItems(tickets, 3).map((ticket) => ({
        type: "Ticket",
        title: ticket.subject || "Ticket interno",
        detail: ticket.dealer_name || ticket.category || ticket.status,
        date: getAdminDateValue(ticket),
        module: ADMIN_MODULES.TICKETS,
      })),
      ...getRecentItems(dealers, 3).map((dealer) => ({
        type: "Dealer",
        title: dealer.commercialName || dealer.name || "Dealer",
        detail: `${getDealerPlanValue(dealer) || "sin plan"} · ${getPlanStatusLabel(
          dealer.planStatus
        )}`,
        date: getAdminDateValue(dealer),
        module: ADMIN_MODULES.DEALERS,
      })),
    ]
      .sort(
        (firstItem, secondItem) =>
          new Date(secondItem.date || 0) - new Date(firstItem.date || 0)
      )
      .slice(0, 6);

    return (
      <>
        <section className="admin-ops-dashboard">
          <div className="admin-ops-hero">
            <div>
              <span>Resumen operativo</span>
              <h2>Qué necesita atención hoy</h2>
              <p>
                Lectura central de dealers, publicaciones, leads, tickets y
                canales públicos para decidir rápido dónde intervenir.
              </p>
            </div>

            <div className="admin-ops-attention-card">
              <span>Atención total</span>
              <strong>{adminAttentionTotal}</strong>
              <p>
                {adminAttentionTotal > 0
                  ? "Casos con potencial impacto operativo o comercial."
                  : "Sin alertas operativas críticas en este momento."}
              </p>
            </div>
          </div>

          <div className="admin-ops-kpi-grid">
            {kpiCards.map((card) => (
              <button
                key={card.label}
                type="button"
                className={`admin-ops-kpi-card admin-ops-tone-${card.tone}`}
                onClick={() => openModule(card.module)}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.text}</p>
              </button>
            ))}
          </div>

          <div className="admin-ops-grid">
            <section className="admin-ops-panel admin-ops-panel--alerts">
              <div className="admin-ops-panel-head">
                <div>
                  <span>Alertas operativas</span>
                  <h3>Prioridad de gestión</h3>
                </div>
              </div>

              {activeAlerts.length === 0 ? (
                <div className="admin-ops-empty">
                  No hay alertas operativas pendientes con los datos cargados.
                </div>
              ) : (
                <div className="admin-ops-alert-list">
                  {activeAlerts.map((alert) => (
                    <button
                      key={alert.label}
                      type="button"
                      className={`admin-ops-alert admin-ops-tone-${alert.tone}`}
                      onClick={() => openModule(alert.module)}
                    >
                      <strong>{alert.value}</strong>
                      <span>{alert.label}</span>
                      <p>{alert.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-ops-panel">
              <div className="admin-ops-panel-head">
                <div>
                  <span>Actividad reciente</span>
                  <h3>Últimos movimientos</h3>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <div className="admin-ops-empty">
                  La actividad reciente aparecerá cuando existan datos reales.
                </div>
              ) : (
                <div className="admin-ops-activity-list">
                  {recentActivity.map((item) => (
                    <button
                      key={`${item.type}-${item.title}-${item.date}`}
                      type="button"
                      className="admin-ops-activity"
                      onClick={() => openModule(item.module)}
                    >
                      <span>{item.type}</span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <small>{formatDateTime(item.date)}</small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        {false && (
          <>
        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Dealers</span>
            <strong>{totalDealers}</strong>
            <p>Total cargados en la red.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Por vencer</span>
            <strong>{expiringDealers}</strong>
            <p>Requieren seguimiento comercial.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Vencidos</span>
            <strong>{expiredDealers}</strong>
            <p>Publicaciones pausadas o en proceso de suspensión.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Vender mi vehículo</span>
            <strong>{sellVehicleEnabled}</strong>
            <p>Dealers habilitados por plan o beneficio.</p>
          </article>
        </div>

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Leads reales</span>
            <strong>{totalLeads}</strong>
            <p>Consultas comerciales generadas en la plataforma.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Leads nuevos</span>
            <strong>{newLeads}</strong>
            <p>Esperan primera gestión.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Contactados</span>
            <strong>{contactedLeads}</strong>
            <p>Ya tuvieron primera respuesta.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Negociación</span>
            <strong>{negotiationLeads}</strong>
            <p>Operaciones en seguimiento.</p>
          </article>
        </div>

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Tickets internos</span>
            <strong>{totalTickets}</strong>
            <p>Casos abiertos por dealers o equipo interno.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Tickets nuevos</span>
            <strong>{newTickets}</strong>
            <p>Casos sin tomar.</p>
          </article>

          <article className="admin-kpi-card">
            <span>En proceso</span>
            <strong>{inProgressTickets}</strong>
            <p>Tickets en gestión operativa.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Urgentes</span>
            <strong>{urgentTickets}</strong>
            <p>Requieren intervención prioritaria.</p>
          </article>
        </div>

          </>
        )}

        <div className="admin-section-block admin-quick-actions-block">
          <div className="buyer-section-head">
            <div>
              <h2>Accesos operativos</h2>
              <p>
                Abrí solo el módulo que necesitás trabajar. El panel evita cargar
                todo en un único scroll largo.
              </p>
            </div>
          </div>

          <div className="dealer-modules-grid">
            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule(ADMIN_MODULES.DEALERS)}
            >
              <h3>Dealers</h3>
              <p>Planes, cupos, vencimientos y beneficios comerciales.</p>
              <button type="button">Abrir dealers</button>
            </article>

            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule(ADMIN_MODULES.VEHICLES)}
            >
              <h3>Publicaciones</h3>
              <p>Control global del inventario publicado por la red.</p>
              <button type="button">Abrir publicaciones</button>
            </article>

            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule(ADMIN_MODULES.COMMERCIAL_LEADS)}
            >
              <h3>Leads comerciales</h3>
              <p>Seguimiento de consultas generadas por compradores.</p>
              <button type="button">Abrir leads</button>
            </article>

            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule(ADMIN_MODULES.SELL_VEHICLE)}
            >
              <h3>Vender mi vehículo</h3>
              <p>Solicitudes de compradores para asignar a dealers habilitados.</p>
              <button type="button">Abrir oportunidades</button>
            </article>

            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule(ADMIN_MODULES.ZERO_KM)}
            >
              <h3>Financiación 0km</h3>
              <p>Leads generados desde el módulo de financiación cero kilómetro.</p>
              <button type="button">Abrir financiación</button>
            </article>

            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule(ADMIN_MODULES.TICKETS)}
            >
              <h3>Tickets internos</h3>
              <p>Gestión de soporte entre admin, soporte operativo y dealers.</p>
              <button type="button">Abrir soporte</button>
            </article>

            <article
              className="dealer-module-card clickable-module-card"
              onClick={() => openModule(ADMIN_MODULES.ACTION_LOG)}
            >
              <h3>Registro de acciones</h3>
              <p>
                {adminActionLog.length > 0
                  ? `${adminActionLog.length} acción${adminActionLog.length !== 1 ? "es" : ""} registrada${adminActionLog.length !== 1 ? "s" : ""}.`
                  : "Historial persistido de acciones admin."}
              </p>
              <button type="button">Ver registro</button>
            </article>
          </div>
        </div>
      </>
    );
  }

  function renderSelectedDealerDetail() {
    if (!selectedDealer) return null;

    const permissions = getEffectiveDealerPermissions(selectedDealer);
    const used = selectedDealer.currentPeriod?.publicationsUsed || 0;
    const limit = permissions.vehicleLimit;
    const days = selectedDealer.currentPeriod?.expiresInDays ?? 0;
    const dealerLogo = selectedDealer.logo || selectedDealer.raw?.logo_url || "";
    const selectedDealerIsPlatinum = isDealerPlatinum(selectedDealer);

    return (
      <div
        className={`admin-section-block${
          selectedDealerIsPlatinum ? " admin-dealer-card--platinum" : ""
        }`}
        id="admin-dealer-detail"
      >
        <div className="buyer-section-head">
          <div>
            <h2>{selectedDealer.commercialName}</h2>
            <p>
              {selectedDealer.city}, {selectedDealer.province} · Plan{" "}
              {permissions.rankLabel} · Estado{" "}
              {getPlanStatusLabel(selectedDealer.planStatus)}
            </p>
            {selectedDealerIsPlatinum && (
              <div className="admin-platinum-chip-row">
                <span className="admin-dealer-platinum-badge">PLATINUM</span>
                <span className="admin-platinum-chip">
                  Publicaciones ilimitadas
                </span>
              </div>
            )}
          </div>

          <div className="admin-action-row">
            {selectedDealer.planStatus === "pending_activation" && (
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={handleActivateSelectedDealer}
                disabled={activatingDealer}
              >
                {activatingDealer ? "Activando..." : "Activar dealer"}
              </button>
            )}

            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => setSelectedDealerForTicket(selectedDealer)}
            >
              Crear ticket
            </button>
              {selectedDealer.planStatus !== "suspended" && (
                suspendConfirmPending ? (
                  <div className="admin-confirm-inline">
                    <p>
                      Vas a suspender a <strong>{selectedDealer.commercialName}</strong>.
                      Sus publicaciones se pausarán y dejará de aparecer en la red pública.
                    </p>
                    <div className="admin-confirm-inline-actions">
                      <button
                        type="button"
                        className="admin-confirm-inline-btn admin-confirm-inline-btn--confirm"
                        onClick={handleSuspendConfirmed}
                        disabled={suspendingDealer}
                      >
                        Confirmar suspensión
                      </button>
                      <button
                        type="button"
                        className="admin-confirm-inline-btn admin-confirm-inline-btn--cancel"
                        onClick={() => setSuspendConfirmPending(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="admin-refresh-btn"
                    onClick={handleSuspendSelectedDealer}
                    disabled={suspendingDealer}
                    style={{
                      borderColor: "rgba(248, 113, 113, 0.36)",
                      color: "#fecaca",
                      background: "rgba(127, 29, 29, 0.28)",
                    }}
                  >
                    {suspendingDealer ? "Suspendiendo..." : "Suspender dealer"}
                  </button>
                )
              )}



            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => setSelectedDealer(null)}
            >
              Cerrar detalle
            </button>
          </div>
        </div>

        {activateDealerError && (
          <div className="auth-warning">{activateDealerError}</div>
        )}
        {suspendDealerError && (
        <div className="auth-warning">{suspendDealerError}</div>
        )}

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Imagen institucional</span>
            <strong>{dealerLogo ? "Cargada" : "Pendiente"}</strong>
            <p>
              Esta imagen identifica al dealer en su panel y podrá usarse en
              secciones públicas de la red.
            </p>
          </article>

          <article
            className="admin-kpi-card"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDealerLogoDrop}
            style={{
              minHeight: "220px",
              display: "grid",
              gap: "10px",
              alignContent: "center",
            }}
          >
            {dealerLogo ? (
              <img
                src={dealerLogo}
                alt={`Imagen institucional de ${selectedDealer.commercialName}`}
                style={{
                  width: "100%",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "16px",
                  border: "1px solid var(--ox-border)",
                  background: "var(--ox-card-2)",
                }}
              />
            ) : (
              <div
                style={{
                  minHeight: "120px",
                  display: "grid",
                  placeItems: "center",
                  border: "1px dashed var(--ox-border)",
                  borderRadius: "16px",
                  color: "var(--ox-muted)",
                  background: "var(--ox-card-2)",
                  textAlign: "center",
                  padding: "12px",
                }}
              >
                Arrastrá una imagen acá
              </div>
            )}

            <label
              className="admin-refresh-btn"
              style={{
                display: "inline-flex",
                width: "fit-content",
                cursor: uploadingDealerLogo ? "not-allowed" : "pointer",
                opacity: uploadingDealerLogo ? 0.65 : 1,
              }}
            >
              {uploadingDealerLogo ? "Subiendo..." : "Seleccionar imagen"}
              <input
                type="file"
                accept="image/*"
                onChange={handleDealerLogoInputChange}
                disabled={uploadingDealerLogo}
                style={{ display: "none" }}
              />
            </label>

            <p style={{ margin: 0 }}>
              Podés seleccionar una imagen o arrastrarla desde la computadora.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Uso previsto</span>
            <strong>Dealer</strong>
            <p>
              Se verá en el encabezado del panel del dealer y luego podrá alimentar
              el sector “Quiénes trabajan con nosotros”.
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Archivo</span>
            <strong>Imagen</strong>
            <p>
              Usá una imagen horizontal o logo institucional de buena calidad. No
              conviene subir capturas borrosas o fotos con texto ilegible.
            </p>
          </article>
        </div>

        {dealerLogoError && <div className="auth-warning">{dealerLogoError}</div>}

        {dealerLogoSuccess && (
          <div className="auth-message">{dealerLogoSuccess}</div>
        )}

        {selectedDealerIsPlatinum && (
          <article className="admin-platinum-detail-card">
            <span className="admin-dealer-platinum-badge">Dealer Platinum</span>
            <strong>Nivel máximo de presencia dentro de oX NEXMOV.</strong>
            <p>
              Lectura operativa para seguimiento comercial de dealers de alto
              volumen, sin modificar permisos ni prioridades reales.
            </p>
            <div className="admin-platinum-chip-row">
              <span className="admin-platinum-chip">Publicaciones ilimitadas</span>
              <span className="admin-platinum-chip">Señales completas</span>
              <span className="admin-platinum-chip">
                Oportunidades comerciales habilitadas
              </span>
              <span className="admin-platinum-chip">
                Métricas incluidas/preparadas
              </span>
              <span className="admin-platinum-chip">Soporte prioritario</span>
              <span className="admin-platinum-chip">Herramientas avanzadas</span>
            </div>
          </article>
        )}

        <div
          style={{
            marginTop: "12px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div className="admin-filter">
            <label>Cambiar / renovar plan</label>
            <select
              value={dealerPlanForm.planCode}
              onChange={(event) =>
                setDealerPlanForm({
                  ...dealerPlanForm,
                  planCode: event.target.value,
                })
              }
            >
              {PLAN_OPTIONS.map((plan) => (
                <option key={plan.value} value={plan.value}>
                  {plan.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="admin-refresh-btn"
            onClick={handleUpdateDealerPlan}
            disabled={updatingDealerPlan}
          >
            {updatingDealerPlan ? "Actualizando..." : "Actualizar plan"}
          </button>
        </div>

        {dealerPlanError && (
          <div className="auth-warning">{dealerPlanError}</div>
        )}

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Estado comercial</span>
            <strong>{getPlanStatusLabel(selectedDealer.planStatus)}</strong>
            <p>Estado actual del período del dealer.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Cupo utilizado</span>
            <strong>
              {selectedDealerIsPlatinum
                ? "Publicaciones ilimitadas"
                : `${used} / ${formatLimit(limit)}`}
            </strong>
            <p>
              {selectedDealerIsPlatinum
                ? `${used} publicaciones creadas en el periodo.`
                : limit === Infinity
                ? "El plan no tiene límite de publicaciones."
                : `${Math.max(limit - used, 0)} publicaciones disponibles.`}
            </p>
          </article>

          <article className="admin-kpi-card">
            <span>Vencimiento</span>
            <strong>{days} días</strong>
            <p>{getAlertLabel(days)} dentro del ciclo comercial.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Cupo extra</span>
            <strong>{selectedDealer.benefits?.extraPublicationQuota || 0}</strong>
            <p>Beneficio manual otorgado por administración.</p>
          </article>
        </div>

        <div className="admin-kpi-grid">
          <article className="admin-kpi-card">
            <span>Vender mi vehículo</span>
            <strong>{permissions.sellVehicleLeads ? "Habilitado" : "No"}</strong>
            <p>Acceso a oportunidades del módulo de vendedores particulares.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Inteligencia de mercado</span>
            <strong>
              {permissions.marketIntelligence ? "Habilitada" : "No"}
            </strong>
            <p>Lectura avanzada de precio, señales y badges.</p>
          </article>

          <article className="admin-kpi-card">
            <span>Rank visual</span>
            <strong>{permissions.rankTheme}</strong>
            <p>Estilo comercial aplicado a publicaciones y señales.</p>
          </article>

          <article className="admin-kpi-card">
            <span>ID interno</span>
            <strong>{selectedDealer.id}</strong>
            <p>Referencia técnica del dealer.</p>
          </article>
        </div>
      </div>
    );
  }

  function renderCreateDealerForm() {
    if (!showCreateDealer) return null;

    return (
      <div className="admin-section-block">
        <div className="buyer-section-head">
          <div>
            <h2>Nuevo dealer</h2>
            <p>Carga comercial inicial del dealer.</p>
          </div>

          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() => {
              setShowCreateDealer(false);
              setCreateDealerError("");
            }}
          >
            Cerrar alta
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <label>Nombre comercial</label>
            <input
              value={newDealerForm.name}
              onChange={(event) =>
                setNewDealerForm({
                  ...newDealerForm,
                  name: event.target.value,
                })
              }
              placeholder="Ej: Romano Motors"
            />
          </div>

          <div className="admin-search">
            <label>Email de acceso</label>
            <input
              type="email"
              value={newDealerForm.email}
              onChange={(event) =>
                setNewDealerForm({
                  ...newDealerForm,
                  email: event.target.value,
                })
              }
              placeholder="Ej: dealer@email.com"
            />
          </div>

          <div className="admin-search">
            <label>Provincia</label>
            <input
              value={newDealerForm.province}
              onChange={(event) =>
                setNewDealerForm({
                  ...newDealerForm,
                  province: event.target.value,
                })
              }
              placeholder="Ej: Buenos Aires"
            />
          </div>

          <div className="admin-search">
            <label>Ciudad</label>
            <input
              value={newDealerForm.city}
              onChange={(event) =>
                setNewDealerForm({
                  ...newDealerForm,
                  city: event.target.value,
                })
              }
              placeholder="Ej: Pilar"
            />
          </div>

          <div className="admin-search">
            <label>Teléfono / WhatsApp</label>
            <input
              value={newDealerForm.phone}
              onChange={(event) =>
                setNewDealerForm({
                  ...newDealerForm,
                  phone: event.target.value,
                })
              }
              placeholder="Ej: 11 3806 2294"
            />
          </div>

          <div className="admin-filter">
            <label>Plan</label>
            <select
              value={newDealerForm.planCode}
              onChange={(event) =>
                setNewDealerForm({
                  ...newDealerForm,
                  planCode: event.target.value,
                })
              }
            >
              {PLAN_OPTIONS.map((plan) => (
                <option key={plan.value} value={plan.value}>
                  {plan.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {createDealerError && (
          <div className="auth-warning">{createDealerError}</div>
        )}

        <div className="admin-action-row">
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={handleCreateDealer}
            disabled={creatingDealer}
          >
            {creatingDealer ? "Creando dealer..." : "Crear dealer"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCreateDealer(false);
              setCreateDealerError("");
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  function renderDealersModule() {
    return (
      <div className="admin-section-block">
        <div className="buyer-section-head">
          <div>
            <h2>Dealers</h2>
            <p>Control comercial de planes, vencimientos, cupos y beneficios.</p>
          </div>

          <div className="admin-action-row">
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => {
                setSelectedDealer(null);
                setCreateDealerError("");
                setShowCreateDealer(true);
              }}
            >
              + Alta dealer
            </button>

            {renderBackToSummaryButton()}
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <label>Buscar</label>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Dealer, ciudad, provincia, plan, estado..."
            />
          </div>

          <div className="admin-filter">
            <label>Plan</label>
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {PLAN_OPTIONS.map((plan) => (
                <option key={plan.value} value={plan.value}>
                  {plan.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-filter">
            <label>Estado</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="pending_activation">Pendiente</option>
              <option value="active">Activo</option>
              <option value="expiring">Por vencer</option>
              <option value="expired_grace">En gracia</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Dealer</th>
                <th>Plan</th>
                <th>Cupo</th>
                <th>Vencimiento</th>
                <th>Beneficios</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredDealers.map((dealer) => {
                const permissions = getEffectiveDealerPermissions(dealer);
                const used = dealer.currentPeriod?.publicationsUsed || 0;
                const limit = permissions.vehicleLimit;
                const days = dealer.currentPeriod?.expiresInDays ?? 0;
                const dealerIsPlatinum = isDealerPlatinum(dealer);

                return (
                  <tr
                    key={dealer.id}
                    className={dealerIsPlatinum ? "admin-dealer-card--platinum" : ""}
                  >
                    <td>
                      <strong>{dealer.commercialName}</strong>
                      <span>
                        {dealer.city}, {dealer.province}
                      </span>
                      {dealerIsPlatinum && (
                        <span className="admin-dealer-platinum-badge">
                          PLATINUM
                        </span>
                      )}
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span className={`admin-chip rank-${permissions.rankTheme}`}>
                          {permissions.rankLabel}
                        </span>

                        <span className={getPlanStatusClass(dealer.planStatus)}>
                          {getPlanStatusLabel(dealer.planStatus)}
                        </span>
                        {dealerIsPlatinum && (
                          <span className="admin-platinum-chip">
                            Publicaciones ilimitadas
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <strong>
                        {dealerIsPlatinum
                          ? "Publicaciones ilimitadas"
                          : `${used} / ${formatLimit(limit)}`}
                      </strong>
                      <span>
                        {dealerIsPlatinum ? `${used} creadas en el periodo` : limit === Infinity
                          ? "Sin límite"
                          : `${Math.max(limit - used, 0)} restantes`}
                      </span>
                    </td>

                    <td>
                      <span className={getAlertClass(days)}>
                        {getAlertLabel(days)}
                      </span>
                      <span>{days} días restantes</span>
                    </td>

                    <td>
                      <div className="admin-benefits-list">
                        {permissions.sellVehicleLeads && (
                          <span>Vender mi vehículo</span>
                        )}

                        {dealer.benefits?.extraPublicationQuota > 0 && (
                          <span>+{dealer.benefits.extraPublicationQuota} cupo</span>
                        )}

                        {permissions.marketIntelligence && <span>Inteligencia</span>}

                        {dealerIsPlatinum && (
                          <>
                            <span>Señales completas</span>
                            <span>Soporte prioritario</span>
                          </>
                        )}

                        {!permissions.sellVehicleLeads &&
                          !dealer.benefits?.extraPublicationQuota &&
                          !permissions.marketIntelligence &&
                          !dealerIsPlatinum && <span>Base</span>}
                      </div>
                    </td>

                    <td>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          onClick={() => openDealerDetail(dealer)}
                        >
                          Ver
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDealerForSlots(dealer)}
                        >
                          Cupo extra
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedDealerForTicket(dealer)}
                        >
                          Ticket
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDealers.length === 0 && (
            <div className="empty-state">
              No hay dealers que coincidan con los filtros.
            </div>
          )}
        </div>

        {renderSelectedDealerDetail()}
        {renderCreateDealerForm()}
      </div>
    );
  }

  function renderCommercialLeadsModule() {
    return (
      <div className="admin-section-block">
        <div className="buyer-section-head">
          <div>
            <h2>Leads comerciales</h2>
            <p>
              Vista global de consultas reales generadas por compradores desde
              publicaciones.
            </p>
          </div>

          <div className="admin-action-row">
            <button className="admin-refresh-btn" onClick={loadLeads}>
              Actualizar leads
            </button>
            {renderBackToSummaryButton()}
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <label>Buscar lead</label>
            <input
              value={leadSearchText}
              onChange={(event) => setLeadSearchText(event.target.value)}
              placeholder="Comprador, vehículo, dealer, mensaje..."
            />
          </div>

          <div className="admin-filter">
            <label>Estado lead</label>
            <select
              value={leadStatusFilter}
              onChange={(event) => setLeadStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="new">Nuevo</option>
              <option value="seen">Visto</option>
              <option value="contacted">Contactado</option>
              <option value="negotiation">Negociación</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
              <option value="lost">Perdido</option>
              <option value="no_response">Sin respuesta</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="empty-state">
            No hay leads que coincidan con los filtros.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Comprador</th>
                  <th>Dealer</th>
                  <th>Vehículo</th>
                  <th>Mensaje</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.lead_id}>
                    <td>
                      <strong>{formatDateTime(lead.created_at)}</strong>
                      <span>Lead #{lead.lead_id}</span>
                    </td>

                    <td>
                      <strong>
                        {lead.buyer_first_name} {lead.buyer_last_name}
                      </strong>
                      <span>{lead.buyer_email}</span>
                      <span>{lead.buyer_phone}</span>
                    </td>

                    <td>
                      <strong>
                        {lead.dealer_name_real ||
                          lead.dealer_name_snapshot ||
                          "Dealer no informado"}
                      </strong>
                      <span>{lead.dealer_phone_snapshot || "Sin teléfono"}</span>
                    </td>

                    <td>
                      <strong>
                        {lead.vehicle_brand} {lead.vehicle_model}
                      </strong>
                      <span>{lead.vehicle_version}</span>
                      <span>{formatARS(lead.price_snapshot)}</span>
                    </td>

                    <td>
                      <span>{lead.message || "Sin mensaje."}</span>
                    </td>

                    <td>
                      <LeadStatusSelect lead={lead} onUpdated={loadLeads} />
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setSelectedLead(lead)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderTicketsModule() {
    return (
      <div className="admin-section-block">
        <div className="buyer-section-head">
          <div>
            <h2>Tickets internos</h2>
            <p>
              Vista global de tickets creados por dealers, soporte o
              administración.
            </p>
          </div>

          <div className="admin-action-row">
            <button className="admin-refresh-btn" onClick={loadTickets}>
              Actualizar tickets
            </button>
            {renderBackToSummaryButton()}
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <label>Buscar ticket</label>
            <input
              value={ticketSearchText}
              onChange={(event) => setTicketSearchText(event.target.value)}
              placeholder="Dealer, asunto, prioridad, categoría..."
            />
          </div>

          <div className="admin-filter">
            <label>Estado ticket</label>
            <select
              value={ticketStatusFilter}
              onChange={(event) => setTicketStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="new">Nuevo</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En proceso</option>
              <option value="waiting_dealer">Espera dealer</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="empty-state">
            No hay tickets que coincidan con los filtros.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Dealer</th>
                  <th>Creado por</th>
                  <th>Asunto</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>

              <tbody>
                {filteredTickets.map((ticket) => {
                  const ticketIsPlatinum = isTicketFromPlatinumDealer(ticket);

                  return (
                  <tr
                    key={ticket.ticket_id}
                    className={ticketIsPlatinum ? "admin-dealer-card--platinum" : ""}
                  >
                    <td>
                      <strong>{formatDateTime(ticket.created_at)}</strong>
                      <span>Ticket #{ticket.ticket_id}</span>
                    </td>

                    <td>
                      <strong>{ticket.dealer_name || "Sin dealer"}</strong>
                      <span>{ticket.category}</span>
                      {ticketIsPlatinum && (
                        <span className="admin-ticket-platinum-priority">
                          Prioridad Platinum
                        </span>
                      )}
                    </td>

                    <td>
                      <strong>{ticket.created_by_email || "Sin usuario"}</strong>
                      <span>{ticket.created_by_role || "Sin rol"}</span>
                    </td>

                    <td>
                      <strong>{ticket.subject}</strong>
                      <span>{ticket.message}</span>
                    </td>

                    <td>
                      <span
                        className={
                          ticket.priority === "urgent"
                            ? "admin-chip danger"
                            : ticket.priority === "high"
                              ? "admin-chip orange"
                              : "admin-chip warning"
                        }
                      >
                        {ticket.priority}
                      </span>
                    </td>

                    <td>
                      <TicketStatusSelect
                        ticket={ticket}
                        onUpdated={loadTickets}
                      />
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function handleAdminMobileSectionChange(sectionId) {
    setActiveAdminMobileSection(sectionId);

    if (sectionId === "summary") {
      setActiveModule(null);
      return;
    }

    if (sectionId === "dealers") {
      setActiveModule(ADMIN_MODULES.DEALERS);
      return;
    }

    if (sectionId === "vehicles") {
      setActiveModule(ADMIN_MODULES.VEHICLES);
      return;
    }

    if (sectionId === "leads") {
      setActiveModule(ADMIN_MODULES.COMMERCIAL_LEADS);
      return;
    }

    if (sectionId === "tickets") {
      setActiveModule(ADMIN_MODULES.TICKETS);
      return;
    }

    if (sectionId === "system") {
      setActiveModule(null);
    }
  }

  function renderAdminMobileTabs() {
    return (
      <nav className="admin-mobile-tabs" aria-label="Secciones admin mobile">
        {ADMIN_MOBILE_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`admin-mobile-tab${
              activeAdminMobileSection === section.id ? " is-active" : ""
            }`}
            onClick={() => handleAdminMobileSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
    );
  }

  function renderAdminMobileSummary() {
    return (
      <div className="admin-mobile-summary">
        <div className="admin-mobile-summary-head">
          <div>
            <span>Resumen operativo</span>
            <strong>Control rápido</strong>
          </div>

          <button
            type="button"
            className="admin-refresh-btn"
            onClick={refreshAdminPanel}
          >
            Actualizar
          </button>
        </div>

        <div className="admin-mobile-summary-grid">
          <article className="admin-mobile-summary-card">
            <span>Dealers</span>
            <strong>{totalDealers}</strong>
            <p>Total en la red.</p>
          </article>

          <article className="admin-mobile-summary-card">
            <span>Por vencer</span>
            <strong>{expiringDealers}</strong>
            <p>Seguimiento comercial.</p>
          </article>

          <article className="admin-mobile-summary-card">
            <span>Leads</span>
            <strong>{newLeads}</strong>
            <p>Nuevos pendientes.</p>
          </article>

          <article className="admin-mobile-summary-card">
            <span>Tickets</span>
            <strong>{newTickets}</strong>
            <p>Casos nuevos.</p>
          </article>

          <article className="admin-mobile-summary-card">
            <span>Urgentes</span>
            <strong>{urgentTickets}</strong>
            <p>Prioridad alta.</p>
          </article>

          <article className="admin-mobile-summary-card">
            <span>Vencidos</span>
            <strong>{expiredDealers}</strong>
            <p>Revisar estado.</p>
          </article>
        </div>
      </div>
    );
  }

  function renderAdminMobileSystemPanel() {
    return (
      <div className="admin-mobile-system-panel">
        <div className="buyer-section-head">
          <div>
            <h2>Sistema</h2>
            <p>
              Accesos secundarios del panel admin. Abrí solo el módulo que
              necesitás operar.
            </p>
          </div>
        </div>

        <div className="admin-mobile-system-grid">
          <article className="admin-mobile-system-card">
            <span>Comercial</span>
            <strong>Vender mi vehículo</strong>
            <p>Solicitudes de compradores para asignar a dealers habilitados.</p>
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => openModule(ADMIN_MODULES.SELL_VEHICLE)}
            >
              Abrir oportunidades
            </button>
          </article>

          <article className="admin-mobile-system-card">
            <span>Financiación</span>
            <strong>Financiación 0km</strong>
            <p>Leads generados desde el módulo público de financiación.</p>
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => openModule(ADMIN_MODULES.ZERO_KM)}
            >
              Abrir financiación
            </button>
          </article>

          <article className="admin-mobile-system-card">
            <span>Red</span>
            <strong>Dealers</strong>
            <p>Planes, cupos, vencimientos y beneficios comerciales.</p>
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={() => openModule(ADMIN_MODULES.DEALERS)}
            >
              Ir a dealers
            </button>
          </article>
        </div>
      </div>
    );
  }

  function renderActiveModule() {
    if (!activeModule) return renderSummary();

    if (activeModule === ADMIN_MODULES.DEALERS) {
      return renderDealersModule();
    }

    if (activeModule === ADMIN_MODULES.VEHICLES) {
      return (
        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <h2>Publicaciones</h2>
              <p>Inventario global administrado desde el panel admin.</p>
            </div>

            {renderBackToSummaryButton()}
          </div>

          <AdminVehiclesSection onLogAction={logAdminAction} />
        </div>
      );
    }

    if (activeModule === ADMIN_MODULES.COMMERCIAL_LEADS) {
      return renderCommercialLeadsModule();
    }

    if (activeModule === ADMIN_MODULES.SELL_VEHICLE) {
      return (
        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <h2>Vender mi vehículo</h2>
              <p>
                Oportunidades cargadas por compradores y asignación operativa a
                dealers.
              </p>
            </div>

            {renderBackToSummaryButton()}
          </div>

          <AdminSellVehicleLeadsSection />
        </div>
      );
    }

    if (activeModule === ADMIN_MODULES.ZERO_KM) {
      return (
        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <h2>Financiación 0km</h2>
              <p>Gestión de leads generados desde financiación cero kilómetro.</p>
            </div>

            {renderBackToSummaryButton()}
          </div>

          <AdminZeroKmLeadsSection />
        </div>
      );
    }

    if (activeModule === ADMIN_MODULES.TICKETS) {
      return renderTicketsModule();
    }

    if (activeModule === ADMIN_MODULES.ACTION_LOG) {
      return (
        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <h2>Registro de acciones</h2>
              <p>
                Historial persistido de acciones administrativas. Se actualiza al abrir este módulo.
              </p>
            </div>
            <div className="admin-action-row">
              <button className="admin-refresh-btn" onClick={loadActionLogs}>
                Actualizar registro
              </button>
              {renderBackToSummaryButton()}
            </div>
          </div>

          {adminActionLog.length === 0 ? (
            <div className="empty-state">
              Sin acciones registradas.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Acción</th>
                    <th>Objetivo</th>
                    <th>Detalle</th>
                    <th>Admin</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {adminActionLog.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>
                          {new Intl.DateTimeFormat("es-AR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(entry.timestamp))}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </strong>
                      </td>
                      <td>
                        <span>{entry.target}</span>
                      </td>
                      <td>
                        <span>{entry.detail || "—"}</span>
                      </td>
                      <td>
                        <span>{entry.adminEmail}</span>
                      </td>
                      <td>
                        <span
                          className={
                            entry.result === "success"
                              ? "admin-chip success"
                              : "admin-chip danger"
                          }
                        >
                          {entry.result === "success" ? "OK" : "Error"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    return renderSummary();
  }

  return (
    <section className="page-section">
      <div className="container panel admin-panel">
        <div className="panel-head-row">
          <div>
            <p className="eyebrow">Consola operativa</p>
            <h1>Panel admin</h1>
            <p>
              {activeModuleLabel
                ? `Módulo activo: ${activeModuleLabel}.`
                : "Control central de dealers, leads comerciales, tickets internos, planes, cupos y vencimientos."}
            </p>

            {authProfile && (
              <p className="admin-session-note">
                Sesión actual: {authProfile.email} · rol {authProfile.role}
              </p>
            )}
          </div>

          <button className="admin-refresh-btn" onClick={refreshAdminPanel}>
            Actualizar panel
          </button>
        </div>

        {dealersError && <div className="auth-warning">{dealersError}</div>}
        {leadsError && <div className="auth-warning">{leadsError}</div>}
        {ticketsError && <div className="auth-warning">{ticketsError}</div>}
        {adminVehiclesError && (
          <div className="auth-warning">{adminVehiclesError}</div>
        )}
        {sellVehicleLeadsError && (
          <div className="auth-warning">{sellVehicleLeadsError}</div>
        )}
        {zeroKmLeadsError && (
          <div className="auth-warning">{zeroKmLeadsError}</div>
        )}

        {loadingDealers && (
          <div className="auth-message">Cargando dealers desde Supabase...</div>
        )}

        {loadingLeads && (
          <div className="auth-message">Cargando leads desde Supabase...</div>
        )}

        {loadingTickets && (
          <div className="auth-message">Cargando tickets desde Supabase...</div>
        )}

        {renderAdminMobileTabs()}

        <div
          className={`admin-desktop-content${
            (activeAdminMobileSection === "summary" ||
              activeAdminMobileSection === "system") &&
            !activeModule
              ? " admin-desktop-content--mobile-system"
              : ""
          }`}
        >
          {renderActiveModule()}
        </div>

        {activeAdminMobileSection === "summary" &&
          !activeModule &&
          renderAdminMobileSummary()}

        {activeAdminMobileSection === "system" &&
          !activeModule &&
          renderAdminMobileSystemPanel()}

        {selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onUpdated={handleTicketUpdated}
            authProfile={authProfile}
          />
        )}

        {selectedDealerForSlots && (
          <GrantExtraSlotsModal
            dealer={selectedDealerForSlots}
            onClose={() => setSelectedDealerForSlots(null)}
            onGranted={refreshAdminPanel}
          />
        )}

        {selectedDealerForTicket && (
          <CreateSupportTicketModal
            dealer={selectedDealerForTicket}
            onClose={() => setSelectedDealerForTicket(null)}
            onCreated={async () => {
              setSelectedDealerForTicket(null);
              await loadTickets();
            }}
            authProfile={authProfile}
          />
        )}

        {selectedLead && (
          <VehicleLeadDetailModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdated={loadLeads}
          />
        )}
      </div>
    </section>
  );
}
