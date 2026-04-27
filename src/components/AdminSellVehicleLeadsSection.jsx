import { useEffect, useMemo, useState } from "react";

import SellVehicleLeadDetailModal from "./SellVehicleLeadDetailModal.jsx";
import SellVehicleLeadStatusSelect from "./SellVehicleLeadStatusSelect.jsx";
import { listSellVehicleLeadsForAdmin } from "../services/sellVehicle.service.js";

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

export default function AdminSellVehicleLeadsSection() {
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);

  async function loadLeads() {
    setLoadingLeads(true);
    setLeadsError("");

    const { leads: supabaseLeads, error } = await listSellVehicleLeadsForAdmin();

    if (error) {
      setLeads([]);
      setLeadsError(error.message || "No se pudieron cargar solicitudes.");
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

  useEffect(() => {
    loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;

      const haystack = [
        lead.full_name,
        lead.email,
        lead.phone,
        lead.brand,
        lead.model,
        lead.version,
        lead.city,
        lead.province,
        lead.status,
        lead.priority,
        lead.message,
        lead.internal_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!text || haystack.includes(text));
    });
  }, [leads, searchText, statusFilter]);

  const total = leads.length;
  const newCount = leads.filter((lead) => lead.status === "new").length;
  const assigned = leads.filter((lead) => lead.status === "assigned").length;
  const negotiation = leads.filter(
    (lead) => lead.status === "negotiation"
  ).length;

  return (
    <div className="admin-section-block">
      <div className="buyer-section-head">
        <div>
          <h2>Solicitudes Vender mi vehículo</h2>
          <p>
            Solicitudes de compradores que quieren vender su unidad. Vista
            interna para revisión, seguimiento y futura asignación a dealers.
          </p>
        </div>

        <button className="admin-refresh-btn" onClick={loadLeads}>
          Actualizar solicitudes
        </button>
      </div>

      {leadsError && <div className="auth-warning">{leadsError}</div>}

      {loadingLeads && (
        <div className="auth-message">
          Cargando solicitudes de venta desde Supabase...
        </div>
      )}

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <span>Total solicitudes</span>
          <strong>{total}</strong>
          <p>Vehículos ofrecidos por compradores.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Nuevas</span>
          <strong>{newCount}</strong>
          <p>Pendientes de revisión inicial.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Asignadas</span>
          <strong>{assigned}</strong>
          <p>Derivadas o en proceso de derivación.</p>
        </article>

        <article className="admin-kpi-card">
          <span>Negociación</span>
          <strong>{negotiation}</strong>
          <p>Casos con avance comercial.</p>
        </article>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <label>Buscar solicitud</label>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Vendedor, vehículo, ciudad, mensaje..."
          />
        </div>

        <div className="admin-filter">
          <label>Estado</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="new">Nuevas</option>
            <option value="seen">Vistas</option>
            <option value="assigned">Asignadas</option>
            <option value="contacted">Contactadas</option>
            <option value="negotiation">Negociación</option>
            <option value="closed">Cerradas</option>
            <option value="lost">Perdidas</option>
          </select>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="empty-state">
          No hay solicitudes que coincidan con los filtros.
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
              {filteredLeads.map((lead) => (
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
                    <SellVehicleLeadStatusSelect
                      lead={lead}
                      onUpdated={loadLeads}
                    />
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

      {selectedLead && (
        <SellVehicleLeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={loadLeads}
        />
      )}
    </div>
  );
}