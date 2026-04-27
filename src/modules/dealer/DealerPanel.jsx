import { useEffect, useMemo, useState } from "react";
import DealerVehicleActions from "../../components/DealerVehicleActions.jsx";
import DealerVehicleDetailModal from "../../components/DealerVehicleDetailModal.jsx";
import VehicleLeadDetailModal from "../../components/VehicleLeadDetailModal.jsx";
import EditVehicleModal from "../../components/EditVehicleModal.jsx";
import EditVehicleImagesModal from "../../components/EditVehicleImagesModal.jsx";

import DealerSellVehicleLeadDetailModal from "../../components/DealerSellVehicleLeadDetailModal.jsx";
import DealerSellVehicleLeadStatusSelect from "../../components/DealerSellVehicleLeadStatusSelect.jsx";
import { listSellVehicleLeadsForCurrentDealer } from "../../services/sellVehicle.service.js";
import CreateSupportTicketModal from "../../components/CreateSupportTicketModal.jsx";
import CreateVehicleModal from "../../components/CreateVehicleModal.jsx";
import LeadStatusSelect from "../../components/LeadStatusSelect.jsx";
import TicketDetailModal from "../../components/TicketDetailModal.jsx";
import TicketStatusSelect from "../../components/TicketStatusSelect.jsx";
import { mockDealers } from "../../data/mockData.js";
import {
  canDealerPublish,
  getEffectiveDealerPermissions,
} from "../../lib/permissions.js";
import { listDealersForCurrentUser } from "../../services/dealers.service.js";
import { listVehiclesForCurrentDealer } from "../../services/dealerVehicles.service.js";
import { listVehicleLeadsForCurrentUser } from "../../services/leads.service.js";
import { listSupportTicketsForCurrentUser } from "../../services/tickets.service.js";

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

function getRemainingQuota(limit, used) {
  if (limit === Infinity) return "Ilimitado";
  return Math.max(limit - used, 0);
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
  const [dealers, setDealers] = useState(mockDealers);
  const [selectedDealerId, setSelectedDealerId] = useState(mockDealers[0]?.id);
  const [loadingDealers, setLoadingDealers] = useState(true);
  const [dealersError, setDealersError] = useState("");

  const [sellVehicleLeads, setSellVehicleLeads] = useState([]);
  const [loadingSellVehicleLeads, setLoadingSellVehicleLeads] = useState(true);
  const [sellVehicleLeadsError, setSellVehicleLeadsError] = useState("");
  const [selectedSellVehicleLead, setSelectedSellVehicleLead] = useState(null);


  const [dealerVehicles, setDealerVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");

  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState("");

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingVehicleImages, setEditingVehicleImages] = useState(null);



  async function loadDealers() {
    setLoadingDealers(true);
    setDealersError("");

    const { dealers: supabaseDealers, error } = await listDealersForCurrentUser();

    if (error) {
      setDealers(mockDealers);
      setSelectedDealerId(mockDealers[0]?.id);
      setDealersError(
        `${error.message}. Usando datos mock como respaldo temporal.`
      );
      setLoadingDealers(false);
      return;
    }

    if (!supabaseDealers.length) {
      setDealers([]);
      setSelectedDealerId(null);
      setDealersError(
        "No tenés un dealer real asociado a este usuario. Revisar vínculo profile_id en Supabase."
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

    setDealerVehicles(vehicles);
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

  const nextLeads = supabaseLeads || [];

  setSellVehicleLeads(nextLeads);

  setSelectedSellVehicleLead((currentLead) => {
    if (!currentLead?.lead_id) return currentLead;

    const refreshedLead = nextLeads.find(
      (lead) => lead.lead_id === currentLead.lead_id
    );

    return refreshedLead || currentLead;
  });

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

  async function refreshDealerPanel() {
    await Promise.all([
      loadDealers(),
      loadDealerVehicles(),
      loadLeads(),
      loadTickets(),
    ]);
  }

    async function refreshDealerPanel() {
  await Promise.all([
    loadDealers(),
    loadDealerVehicles(),
    loadLeads(),
    loadTickets(),
    loadSellVehicleLeads(),
  ]);
}

  async function handleTicketUpdated() {
    await loadTickets();
  }

  useEffect(() => {
    refreshDealerPanel();
  }, []);

  const dealer = useMemo(() => {
    return dealers.find((item) => item.id === selectedDealerId) || dealers[0];
  }, [dealers, selectedDealerId]);

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
  const remaining = getRemainingQuota(limit, used);
  const expiresInDays = dealer.currentPeriod?.expiresInDays ?? 0;

  const activeVehiclesCount = dealerVehicles.filter(
    (vehicle) => vehicle.is_active
  ).length;

  const reviewVehiclesCount = dealerVehicles.filter(
    (vehicle) => vehicle.review_status === "needs_review"
  ).length;

  const newLeadsCount = leads.filter((lead) => lead.crm_status === "new").length;

  const contactedLeadsCount = leads.filter(
    (lead) => lead.crm_status === "contacted"
  ).length;

  const negotiationLeadsCount = leads.filter(
    (lead) => lead.crm_status === "negotiation"
  ).length;

  const openTicketsCount = tickets.filter((ticket) =>
    ["new", "open", "in_progress", "waiting_dealer"].includes(ticket.status)
  ).length;

  return (
    <section className="page-section">
      <div className="container panel dealer-panel">
        <div className="panel-head-row">
          <div>
            <p className="eyebrow">Panel dealer único</p>
            <h1>Panel dealer</h1>
            <p>
              Un único panel completo. Las funciones se habilitan según plan,
              estado de cuenta y beneficios otorgados por admin.
            </p>

            {authProfile && (
              <p className="admin-session-note">
                Sesión actual: {authProfile.email} · rol {authProfile.role}
              </p>
            )}
          </div>

          <div className="dealer-switcher">
            <label>Dealer operativo</label>
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
        </div>

        {dealersError && <div className="auth-warning">{dealersError}</div>}
        {vehiclesError && <div className="auth-warning">{vehiclesError}</div>}
        {leadsError && <div className="auth-warning">{leadsError}</div>}
        {ticketsError && <div className="auth-warning">{ticketsError}</div>}
        {sellVehicleLeadsError && (<div className="auth-warning">{sellVehicleLeadsError}</div>
      )}




        {loadingDealers && (
          <div className="auth-message">Cargando dealer...</div>
        )}

        {loadingSellVehicleLeads && (
          <div className="auth-message">Cargando oportunidades Vender mi vehículo... </div>
)}


        {loadingVehicles && (
          <div className="auth-message">Cargando vehículos...</div>
        )}

        {loadingLeads && (
          <div className="auth-message">Cargando leads...</div>
        )}

        {loadingTickets && (
          <div className="auth-message">Cargando tickets...</div>
        )}

        <div className="dealer-status-grid">
          <article className={`dealer-status-card rank-${permissions.rankTheme}`}>
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
            <span>Cupo del período</span>
            <strong>
              {used} / {formatLimit(limit)}
            </strong>
            <p>Cupo restante: {remaining}</p>
          </article>

          <article className="dealer-status-card">
            <span>Estado del plan</span>
            <strong>{dealer.planStatus}</strong>
            <p className={getPlanAlertClass(expiresInDays)}>
              {getPlanAlertLabel(expiresInDays)}
            </p>
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
          </article>

          <article className="dealer-status-card">
            <span>En revisión</span>
            <strong>{reviewVehiclesCount}</strong>
            <p>Publicaciones pendientes de revisión.</p>
          </article>
        </div>

        <div className="dealer-modules-grid">
          <article className="dealer-module-card">
            <h3>Mis vehículos</h3>
            <p>
              {dealerVehicles.length > 0
                ? `${dealerVehicles.length} publicaciones reales cargadas.`
                : "Todavía no hay publicaciones reales para este dealer."}
            </p>
            <button onClick={loadDealerVehicles}>Actualizar publicaciones</button>
          </article>

          <article className="dealer-module-card">
            <h3>Alta de vehículo</h3>
            <p>
              Carga guiada por catálogo, validación automática y control de cupo.
            </p>
            <button
              disabled={!publishCheck.allowed}
              onClick={() => setShowVehicleModal(true)}
            >
              Publicar vehículo
            </button>
          </article>

          <article className="dealer-module-card">
            <h3>Leads recibidos</h3>
            <p>
              {leads.length > 0
                ? `${leads.length} consultas reales recibidas.`
                : "Todavía no hay consultas reales para este dealer."}
            </p>
            <button onClick={loadLeads}>Actualizar leads</button>
          </article>

          <article className="dealer-module-card">
            <h3>Financiación</h3>
            <p>
              {permissions.fullFinancingTools
                ? "Financiación propia, bancaria y simulador visible al comprador."
                : "Financiación básica informada. Herramientas completas disponibles en planes superiores."}
            </p>
            <button>Configurar financiación</button>
          </article>

          <article className="dealer-module-card">
            <h3>Métricas</h3>
            <p>Nivel habilitado: {permissions.metricsLevel}</p>
            <button>Ver métricas</button>
          </article>

          <article className="dealer-module-card">
            <h3>Vender mi vehículo</h3>
            <p>
              {permissions.sellVehicleLeads
                ? "Habilitado para recibir oportunidades asignadas por admin."
                : "No habilitado por defecto. Admin puede activarlo como beneficio."}
            </p>
            <button disabled={!permissions.sellVehicleLeads}>
              Ver oportunidades
            </button>
          </article>

          <article className="dealer-module-card">
            <h3>Urgencias / Observaciones</h3>
            <p>
              Publicaciones observadas, revisión urgente y correcciones
              necesarias.
            </p>
            <button>Ver urgencias</button>
          </article>

          <article className="dealer-module-card">
            <h3>Soporte admin</h3>
            <p>
              Tickets internos estilo Remedy para resolver consultas sin salir de
              la plataforma.
            </p>
            <button onClick={() => setShowTicketModal(true)}>Crear ticket</button>
          </article>
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Mis vehículos publicados</h2>
              <p>
                Inventario real asociado a este dealer. Incluye publicaciones
                activas, pausadas, reservadas o enviadas a revisión.
              </p>
            </div>

            <button className="admin-refresh-btn" onClick={loadDealerVehicles}>
              Actualizar vehículos
            </button>
          </div>

          {dealerVehicles.length === 0 ? (
            <div className="empty-state">
              Todavía no hay vehículos reales para mostrar.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Precio</th>
                    <th>Ubicación</th>
                    <th>Financiación</th>
                    <th>Publicación</th>
                    <th>Revisión</th>
                    <th>Acciones</th>
                    <th>Detalle</th>
                    <th>Editar</th>
                    <th>Imágenes</th>


                  </tr>
                </thead>

                <tbody>
                  {dealerVehicles.map((vehicle) => (
                    <tr key={vehicle.vehicle_id}>
                      <td>
                        <strong>
                          {vehicle.brand} {vehicle.model}
                        </strong>
                        <span>{vehicle.version || "Sin versión"}</span>
                        <span>
                          {vehicle.year} · {formatKm(vehicle.km)}
                        </span>
                      </td>

                      <td>
                        <strong>{formatARS(vehicle.price)}</strong>
                        <span>Ref. {formatARS(vehicle.market_reference_price)}</span>
                      </td>

                      <td>
                        <strong>{vehicle.city || "Sin ciudad"}</strong>
                        <span>{vehicle.province || "Sin provincia"}</span>
                      </td>

                      <td>
                        <span>
                          {vehicle.financing ? "Disponible" : "No informada"}
                        </span>
                        {vehicle.financing && (
                          <span>Entrega {formatARS(vehicle.delivery)}</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            vehicle.is_active
                              ? "admin-chip success"
                              : "admin-chip warning"
                          }
                        >
                          {vehicle.is_active ? "Activa" : "No visible"}
                        </span>
                        <span>{vehicle.publication_status}</span>
                      </td>

                      <td>
                        <span
                          className={
                            vehicle.review_status === "needs_review"
                              ? "admin-chip danger"
                              : "admin-chip success"
                          }
                        >
                          {vehicle.review_status === "needs_review"
                            ? "Revisión"
                            : "Aprobada"}
                        </span>
                        {vehicle.reserved && <span>Reservada</span>}
                      </td>
                           <td>
                           <DealerVehicleActions
                           vehicle={vehicle}
                           onUpdated={loadDealerVehicles}
                         />
                      </td>
                      <td>
                          <button
                          className="table-action-btn"
                          onClick={() => setSelectedVehicle(vehicle)}
                        >
                           Ver detalle
                      </button>
                      </td>
   
                         <td>
                           <button
                           className="table-action-btn"
                           onClick={() => setEditingVehicle(vehicle)}
                       >
                            Editar
                       </button>
                       </td>
                        <td>
                        <button
                           className="table-action-btn"
                           onClick={() => setEditingVehicleImages(vehicle)}
                       >
                           Imágenes
                         </button>
                         </td>

   
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Últimos leads reales</h2>
              <p>
                Consultas generadas desde publicaciones asociadas a este dealer.
              </p>
            </div>

            <button className="admin-refresh-btn" onClick={loadLeads}>
              Actualizar leads
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="empty-state">
              Todavía no hay leads reales para mostrar.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Comprador</th>
                    <th>Vehículo</th>
                    <th>Mensaje</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>

                <tbody>
                  {leads.map((lead) => (
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
                          {lead.vehicle_brand} {lead.vehicle_model}
                        </strong>
                        <span>{lead.vehicle_version}</span>
                        <span>{lead.vehicle_title_snapshot}</span>
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
         <div className="dealer-leads-section">
  <div className="buyer-section-head">
    <div>
      <h2>Oportunidades Vender mi vehículo</h2>
      <p>
        Solicitudes de compradores asignadas por administración para que el
        dealer pueda evaluarlas y gestionarlas.
      </p>
    </div>

    <button className="admin-refresh-btn" onClick={loadSellVehicleLeads}>
      Actualizar oportunidades
    </button>
  </div>

  {sellVehicleLeads.length === 0 ? (
    <div className="empty-state">
      Todavía no tenés oportunidades asignadas de “Vender mi vehículo”.
    </div>
  ) : (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Vendedor</th>
            <th>Vehículo</th>
            <th>Precio esperado</th>
            <th>Estado</th>
            <th>Detalle</th>
          </tr>
        </thead>

        <tbody>
          {sellVehicleLeads.map((lead) => (
            <tr key={lead.lead_id}>
              <td>
                <strong>{formatDateTime(lead.created_at)}</strong>
                <span>{lead.priority || "normal"}</span>
              </td>

              <td>
                <strong>{lead.full_name}</strong>
                <span>{lead.email}</span>
                <span>{lead.phone}</span>
              </td>

              <td>
                <strong>
                  {lead.brand} {lead.model}
                </strong>
                <span>{lead.version || "Sin versión"}</span>
                <span>
                  {lead.year || "Sin año"} ·{" "}
                  {Number(lead.km || 0).toLocaleString("es-AR")} km
                </span>
                <span>
                  {lead.city}, {lead.province}
                </span>
              </td>

              <td>
                <strong>{formatARS(lead.expected_price)}</strong>
                <span>{lead.condition || "Sin condición"}</span>
              </td>

              <td>
                <DealerSellVehicleLeadStatusSelect
                  lead={lead}
                  onUpdated={loadSellVehicleLeads}
                />
              </td>

              <td>
                <button
                  className="table-action-btn"
                  onClick={() => setSelectedSellVehicleLead(lead)}
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






        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Tickets internos</h2>
              <p>Consultas abiertas por este dealer para soporte o admin.</p>
            </div>

            <button className="admin-refresh-btn" onClick={loadTickets}>
              Actualizar tickets
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="empty-state">
              Todavía no hay tickets internos para mostrar.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Asunto</th>
                    <th>Categoría</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>

                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.ticket_id}>
                      <td>
                        <strong>{formatDateTime(ticket.created_at)}</strong>
                        <span>Ticket #{ticket.ticket_id}</span>
                      </td>

                      <td>
                        <strong>{ticket.subject}</strong>
                        <span>{ticket.message}</span>
                      </td>

                      <td>
                        <span>{ticket.category}</span>
                      </td>

                      <td>
                        <span className="admin-chip warning">
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

        {showTicketModal && (
          <CreateSupportTicketModal
            dealer={dealer}
            onClose={() => setShowTicketModal(false)}
            onCreated={loadTickets}
          />
        )}

        {selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onUpdated={handleTicketUpdated}
            authProfile={authProfile}

          />
        )}

        {showVehicleModal && (
          <CreateVehicleModal
            dealer={dealer}
            onClose={() => setShowVehicleModal(false)}
            onCreated={refreshDealerPanel}
          />
        )}

          {selectedLead && (
           <VehicleLeadDetailModal
            lead={selectedLead}
           onClose={() => setSelectedLead(null)}
           onUpdated={loadLeads}
          />
        )}

         
           {selectedVehicle && (
               <DealerVehicleDetailModal
                vehicle={selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onUpdated={loadDealerVehicles}
           />
         )}
            {selectedLead && (
                 <VehicleLeadDetailModal
                 lead={selectedLead}
                 onClose={() => setSelectedLead(null)}
                 onUpdated={loadLeads}
             />
        )}

             {editingVehicle && (
                  <EditVehicleModal
                  vehicle={editingVehicle}
                  mode="dealer"
                  onClose={() => setEditingVehicle(null)}
                  onUpdated={loadDealerVehicles}
             />
         )}

                 {editingVehicleImages && (
                 <EditVehicleImagesModal
                 vehicle={editingVehicleImages}
                 mode="dealer"
                 onClose={() => setEditingVehicleImages(null)}
                 onUpdated={loadDealerVehicles}
             />
         )}

                 {selectedSellVehicleLead && (
                 <DealerSellVehicleLeadDetailModal
                 lead={selectedSellVehicleLead}
                 onClose={() => setSelectedSellVehicleLead(null)}
                onUpdated={loadSellVehicleLeads}
             />
         )}




      </div>
    </section>
  );
}