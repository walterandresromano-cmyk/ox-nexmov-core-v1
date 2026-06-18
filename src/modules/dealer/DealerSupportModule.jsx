import { useState } from "react";

import CreateSupportTicketModal from "../../components/CreateSupportTicketModal.jsx";
import TicketDetailModal from "../../components/TicketDetailModal.jsx";
import TicketStatusSelect from "../../components/TicketStatusSelect.jsx";

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default function DealerSupportModule({
  tickets,
  dealer,
  isPlatinum,
  authProfile,
  onRefresh,
  onBack,
}) {
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Soporte</h2>
          <p>
            Abrí consultas a administración para resolver dudas de plan, publicaciones
            o cuenta sin salir de la plataforma.
          </p>
        </div>
        <button className="admin-refresh-btn" onClick={onRefresh}>
          Actualizar
        </button>
      </div>

      <div className="dealer-module-card dealer-module-card-open">
        <h3>Abrir consulta de soporte</h3>
        <p>
          Abrí una consulta para soporte técnico, facturación,
          publicaciones o gestión de cuenta.
        </p>
        {isPlatinum && (
          <span className="dealer-platinum-priority-badge">
            Prioridad Platinum
          </span>
        )}
        <button
          className="primary-action"
          onClick={() => setShowTicketModal(true)}
        >
          Abrir consulta
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">
          Todavía no hay consultas de soporte para mostrar.
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
                    <span>Caso #{ticket.ticket_id}</span>
                  </td>

                  <td>
                    <strong>{ticket.subject}</strong>
                    <span>{ticket.message}</span>
                  </td>

                  <td>
                    <span>{ticket.category}</span>
                  </td>

                  <td>
                    <span className="admin-chip warning">{ticket.priority}</span>
                  </td>

                  <td>
                    <TicketStatusSelect ticket={ticket} onUpdated={onRefresh} />
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

      {showTicketModal && (
        <CreateSupportTicketModal
          dealer={dealer}
          onClose={() => setShowTicketModal(false)}
          onCreated={onRefresh}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdated={onRefresh}
          authProfile={authProfile}
        />
      )}
    </div>
  );
}
