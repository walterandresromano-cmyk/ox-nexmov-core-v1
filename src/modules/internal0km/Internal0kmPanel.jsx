import { useEffect, useMemo, useState } from "react";

import ZeroKmLeadDetailModal from "../../components/ZeroKmLeadDetailModal.jsx";
import ZeroKmLeadStatusSelect from "../../components/ZeroKmLeadStatusSelect.jsx";
import { listZeroKmFinancingLeadsForCurrentUser } from "../../services/zeroKm.service.js";

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
    return "Sin entrega";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

export default function Internal0kmPanel({ authProfile }) {
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);

 
 async function loadLeads() {
  setLoadingLeads(true);
  setLeadsError("");

  const { leads: supabaseLeads, error } =
    await listZeroKmFinancingLeadsForCurrentUser();

  if (error) {
    setLeads([]);
    setLeadsError(error.message || "No se pudieron cargar los leads 0km.");
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
 

  async function handleLeadUpdated() {
    await loadLeads();
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
        lead.lead_id,
        lead.full_name,
        lead.email,
        lead.phone,
        lead.province,
        lead.city,
        lead.brand_interest,
        lead.model_interest,
        lead.budget_range,
        lead.employment_type,
        lead.message,
        lead.status,
        lead.priority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesText = !text || haystack.includes(text);

      return matchesStatus && matchesText;
    });
  }, [leads, searchText, statusFilter]);

  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const contacted = leads.filter((lead) => lead.status === "contacted").length;
  const prequalified = leads.filter(
    (lead) => lead.status === "prequalified"
  ).length;
  const approved = leads.filter((lead) => lead.status === "approved").length;

  return (
    <section className="page-section">
      <div className="container panel internal-panel">
        <div className="panel-head-row">
          <div>
            <p className="eyebrow">Operación interna</p>
            <h1>Panel Financiación 0km</h1>
            <p>
              Bandeja interna para recibir, revisar y trabajar leads de
              financiación 0km asignados por la plataforma.
            </p>

            {authProfile && (
              <p className="admin-session-note">
                Sesión actual: {authProfile.email} · rol {authProfile.role}
              </p>
            )}
          </div>

          <button className="admin-refresh-btn" onClick={loadLeads}>
            Actualizar leads 0km
          </button>
        </div>

        {leadsError && <div className="auth-warning">{leadsError}</div>}

        {loadingLeads && (
          <div className="auth-message">Cargando leads 0km desde Supabase...</div>
        )}

        <div className="dealer-status-grid">
          <article className="dealer-status-card">
            <span>Leads 0km nuevos</span>
            <strong>{newLeads}</strong>
            <p>Pendientes de primera gestión.</p>
          </article>

          <article className="dealer-status-card">
            <span>Contactados</span>
            <strong>{contacted}</strong>
            <p>Con primera comunicación realizada.</p>
          </article>

          <article className="dealer-status-card">
            <span>Precalificados</span>
            <strong>{prequalified}</strong>
            <p>Casos con potencial financiero.</p>
          </article>

          <article className="dealer-status-card">
            <span>Aprobados</span>
            <strong>{approved}</strong>
            <p>Leads avanzados positivamente.</p>
          </article>
        </div>

        <div className="dealer-leads-section">
          <div className="buyer-section-head">
            <div>
              <h2>Bandeja de financiación 0km</h2>
              <p>
                Leads generados desde la pestaña pública Financiación 0km.
              </p>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-search">
              <label>Buscar lead 0km</label>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Nombre, teléfono, modelo, ciudad..."
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
                <option value="seen">Visto</option>
                <option value="contacted">Contactado</option>
                <option value="prequalified">Precalificado</option>
                <option value="documents_requested">Docs solicitados</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
                <option value="lost">Perdido</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="empty-state">
              No hay leads 0km que coincidan con los filtros.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Contacto</th>
                    <th>Interés</th>
                    <th>Financiación</th>
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
                        <span>Lead 0km #{lead.lead_id}</span>
                      </td>

                      <td>
                        <strong>{lead.full_name}</strong>
                        <span>{lead.email}</span>
                        <span>{lead.phone}</span>
                        <span>
                          {lead.city}, {lead.province}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {lead.brand_interest || "Marca abierta"}{" "}
                          {lead.model_interest || ""}
                        </strong>
                        <span>{lead.budget_range || "Sin rango declarado"}</span>
                      </td>

                      <td>
                        <strong>{formatARS(lead.down_payment)}</strong>
                        <span>
                          {lead.preferred_term_months
                            ? `${lead.preferred_term_months} meses`
                            : "Sin plazo preferido"}
                        </span>
                        <span>
                          {lead.monthly_income_range || "Ingresos no declarados"}
                        </span>
                      </td>

                      <td>
                        <span>{lead.message || "Sin mensaje."}</span>
                      </td>

                      <td>
                        <ZeroKmLeadStatusSelect
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
        </div>

        {selectedLead && (
          <ZeroKmLeadDetailModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdated={handleLeadUpdated}
          />
        )}
      </div>
    </section>
  );
}