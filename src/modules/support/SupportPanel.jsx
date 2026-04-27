import { useEffect, useMemo, useState } from "react";

import TicketDetailModal from "../../components/TicketDetailModal.jsx";
import TicketStatusSelect from "../../components/TicketStatusSelect.jsx";
import { listSupportTicketsForCurrentUser } from "../../services/tickets.service.js";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default function SupportPanel({ authProfile }) {
  const [tickets, setTickets] = useState([]);
  const [ticketsError, setTicketsError] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);

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

  async function handleTicketUpdated() {
    await loadTickets();
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;

      const haystack = [
        ticket.ticket_id,
        ticket.dealer_name,
        ticket.created_by_email,
        ticket.subject,
        ticket.message,
        ticket.priority,
        ticket.status,
        ticket.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesText = !text || haystack.includes(text);

      return matchesStatus && matchesText;
    });
  }, [tickets, searchText, statusFilter]);

  const newTickets = tickets.filter((ticket) => ticket.status === "new").length;
  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "in_progress"
  ).length;
  const urgentTickets = tickets.filter(
    (ticket) => ticket.priority === "urgent"
  ).length;

  return (
    <section className="page-section">
      <div className="container panel support-panel">
        <div className="panel-head-row">
          <div>
            <p className="eyebrow">Soporte interno</p>
            <h1>Panel soporte</h1>
            <p>
              Bandeja para gestionar tickets internos entre dealers,
              administración y soporte de oX NEXMOV.
            </p>

            {authProfile && (
              <p className="admin-session-note">
                Sesión actual: {authProfile.email} · rol {authProfile.role}
              </p>
            )}
          </div>

          <button className="admin-refresh-btn" onClick={loadTickets}>
            Actualizar tickets
          </button>
        </div>

        {ticketsError && <div className="auth-warning">{ticketsError}</div>}

        {loadingTickets && (
          <div className="auth-message">Cargando tickets desde Supabase...</div>
        )}

        <div className="dealer-status-grid">
          <article className="dealer-status-card">
            <span>Tickets nuevos</span>
            <strong>{newTickets}</strong>
            <p>Consultas internas sin tomar.</p>
          </article>

          <article className="dealer-status-card">
            <span>En proceso</span>
            <strong>{inProgressTickets}</strong>
            <p>Casos abiertos en gestión.</p>
          </article>

          <article className="dealer-status-card">
            <span>Urgentes</span>
            <strong>{urgentTickets}</strong>
            <p>Casos que requieren intervención prioritaria.</p>
          </article>

          <article className="dealer-status-card">
            <span>Total tickets</span>
            <strong>{tickets.length}</strong>
            <p>Bandeja operativa interna.</p>
          </article>
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Bandeja de tickets</h2>
              <p>
                Casos tipo Remedy: consulta, estado, prioridad, responsable y
                resolución.
              </p>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-search">
              <label>Buscar ticket</label>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Dealer, asunto, prioridad, categoría..."
              />
            </div>

            <div className="admin-filter">
              <label>Estado</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
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
                    <th>Asunto</th>
                    <th>Categoría</th>
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
                        <span>{ticket.created_by_email}</span>
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


            <TicketDetailModal
              ticket={selectedTicket}
              onClose={() => setSelectedTicket(null)}
              onUpdated={loadTickets}
              authProfile={authProfile}
        />
      </div>
    </section>
  );
}