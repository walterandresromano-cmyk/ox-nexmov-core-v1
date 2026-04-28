import { useEffect, useMemo, useState } from "react";
import VehicleLeadDetailModal from "../../components/VehicleLeadDetailModal.jsx";

import AdminSellVehicleLeadsSection from "../../components/AdminSellVehicleLeadsSection.jsx";
import GrantExtraSlotsModal from "../../components/GrantExtraSlotsModal.jsx";
import AdminVehiclesSection from "../../components/AdminVehiclesSection.jsx";
import LeadStatusSelect from "../../components/LeadStatusSelect.jsx";
import TicketDetailModal from "../../components/TicketDetailModal.jsx";
import TicketStatusSelect from "../../components/TicketStatusSelect.jsx";
import { mockDealers } from "../../data/mockData.js";
import { getEffectiveDealerPermissions } from "../../lib/permissions.js";
import { listDealersForAdmin } from "../../services/dealers.service.js";
import { listVehicleLeadsForCurrentUser } from "../../services/leads.service.js";
import { listSupportTicketsForCurrentUser } from "../../services/tickets.service.js";
import AdminZeroKmLeadsSection from "../../components/AdminZeroKmLeadsSection.jsx";

const ADMIN_MODULES = {
  DEALERS: "dealers",
  VEHICLES: "vehicles",
  COMMERCIAL_LEADS: "commercialLeads",
  SELL_VEHICLE: "sellVehicle",
  ZERO_KM: "zeroKm",
  TICKETS: "tickets",
};

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

export default function AdminPanel({ authProfile }) {
  const [activeModule, setActiveModule] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dealers, setDealers] = useState(mockDealers);
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

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedDealerForSlots, setSelectedDealerForSlots] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  async function loadDealers() {
    setLoadingDealers(true);
    setDealersError("");

    const { dealers: supabaseDealers, error } = await listDealersForAdmin();

    if (error) {
      setDealers(mockDealers);
      setDealersError(
        `${error.message}. Usando datos mock como respaldo temporal.`
      );
      setLoadingDealers(false);
      return;
    }

    if (!supabaseDealers.length) {
      setDealers(mockDealers);
      setDealersError(
        "Supabase devolvió 0 dealers. Usando datos mock como respaldo temporal."
      );
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

    setTickets(supabaseTickets);
    setLoadingTickets(false);
  }

  async function refreshAdminPanel() {
    await Promise.all([loadDealers(), loadLeads(), loadTickets()]);
  }

  async function handleTicketUpdated() {
    await loadTickets();
  }

  useEffect(() => {
    refreshAdminPanel();
  }, []);

  const filteredDealers = useMemo(() => {
    return dealers.filter((dealer) => {
      const text = searchText.trim().toLowerCase();

      const matchesText =
        !text ||
        dealer.commercialName.toLowerCase().includes(text) ||
        dealer.city.toLowerCase().includes(text) ||
        dealer.province.toLowerCase().includes(text) ||
        dealer.plan.toLowerCase().includes(text);

      const matchesPlan = planFilter === "all" || dealer.plan === planFilter;
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

  const activeModuleLabel = {
    [ADMIN_MODULES.DEALERS]: "Dealers",
    [ADMIN_MODULES.VEHICLES]: "Publicaciones",
    [ADMIN_MODULES.COMMERCIAL_LEADS]: "Leads comerciales",
    [ADMIN_MODULES.SELL_VEHICLE]: "Vender mi vehículo",
    [ADMIN_MODULES.ZERO_KM]: "Financiación 0km",
    [ADMIN_MODULES.TICKETS]: "Tickets internos",
  }[activeModule];

  function renderBackToSummaryButton() {
    if (!activeModule) return null;

    return (
      <button
        type="button"
        className="admin-refresh-btn"
        onClick={() => setActiveModule(null)}
      >
        ← Volver al resumen
      </button>
    );
  }

  function renderSummary() {
    return (
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
            <p>Publicaciones deberían pausarse.</p>
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

        <div className="admin-section-block">
          <div className="buyer-section-head">
            <div>
              <h2>Accesos operativos</h2>
              <p>
                Abrí solo el módulo que necesitás trabajar. El panel evita cargar
                todo en un único scroll largo.
              </p>
            </div>
          </div>

          <div className="admin-kpi-grid">
            <button
              type="button"
              className="admin-kpi-card"
              onClick={() => setActiveModule(ADMIN_MODULES.DEALERS)}
            >
              <span>Gestión comercial</span>
              <strong>Dealers</strong>
              <p>Planes, cupos, vencimientos y beneficios.</p>
            </button>

            <button
              type="button"
              className="admin-kpi-card"
              onClick={() => setActiveModule(ADMIN_MODULES.VEHICLES)}
            >
              <span>Inventario</span>
              <strong>Publicaciones</strong>
              <p>Control global de vehículos publicados.</p>
            </button>

            <button
              type="button"
              className="admin-kpi-card"
              onClick={() => setActiveModule(ADMIN_MODULES.COMMERCIAL_LEADS)}
            >
              <span>Consultas</span>
              <strong>Leads comerciales</strong>
              <p>Seguimiento de interesados por publicación.</p>
            </button>

            <button
              type="button"
              className="admin-kpi-card"
              onClick={() => setActiveModule(ADMIN_MODULES.SELL_VEHICLE)}
            >
              <span>Oportunidades</span>
              <strong>Vender mi vehículo</strong>
              <p>Solicitudes de compradores para asignar a dealers.</p>
            </button>

            <button
              type="button"
              className="admin-kpi-card"
              onClick={() => setActiveModule(ADMIN_MODULES.ZERO_KM)}
            >
              <span>Financiación</span>
              <strong>0km</strong>
              <p>Leads de financiación cero kilómetro.</p>
            </button>

            <button
              type="button"
              className="admin-kpi-card"
              onClick={() => setActiveModule(ADMIN_MODULES.TICKETS)}
            >
              <span>Soporte</span>
              <strong>Tickets internos</strong>
              <p>Gestión de casos entre admin, soporte y dealers.</p>
            </button>
          </div>
        </div>
      </>
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

          {renderBackToSummaryButton()}
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <label>Buscar</label>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Dealer, ciudad, provincia, plan..."
            />
          </div>

          <div className="admin-filter">
            <label>Plan</label>
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="inicio">Inicio</option>
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <div className="admin-filter">
            <label>Estado</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Activo</option>
              <option value="expiring">Por vencer</option>
              <option value="expired_grace">Vencido en gracia</option>
              <option value="suspended">Suspendido</option>
              <option value="pending_activation">Pendiente</option>
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

                return (
                  <tr key={dealer.id}>
                    <td>
                      <strong>{dealer.commercialName}</strong>
                      <span>
                        {dealer.city}, {dealer.province}
                      </span>
                    </td>

                    <td>
                      <span className={`admin-chip rank-${permissions.rankTheme}`}>
                        {permissions.rankLabel}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {used} / {formatLimit(limit)}
                      </strong>
                      <span>
                        {limit === Infinity
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

                        {permissions.marketIntelligence && (
                          <span>Inteligencia</span>
                        )}

                        {!permissions.sellVehicleLeads &&
                          !dealer.benefits?.extraPublicationQuota &&
                          !permissions.marketIntelligence && <span>Base</span>}
                      </div>
                    </td>

                    <td>
                      <div className="admin-action-row">
                        <button type="button">Ver</button>
                        <button
                          type="button"
                          onClick={() => setSelectedDealerForSlots(dealer)}
                        >
                          Cupo extra
                        </button>
                        <button type="button">Ticket</button>
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
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.ticket_id}>
                    <td>
                      <strong>{formatDateTime(ticket.created_at)}</strong>
                      <span>Ticket #{ticket.ticket_id}</span>
                    </td>

                    <td>
                      <strong>{ticket.dealer_name || "Sin dealer"}</strong>
                      <span>{ticket.category}</span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
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

          <AdminVehiclesSection />
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

        {loadingDealers && (
          <div className="auth-message">Cargando dealers desde Supabase...</div>
        )}

        {loadingLeads && (
          <div className="auth-message">Cargando leads desde Supabase...</div>
        )}

        {loadingTickets && (
          <div className="auth-message">Cargando tickets desde Supabase...</div>
        )}

        {renderActiveModule()}

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