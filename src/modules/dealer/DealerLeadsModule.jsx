import { useState, useMemo } from "react";

import LeadStatusSelect from "../../components/LeadStatusSelect.jsx";
import VehicleLeadDetailModal from "../../components/VehicleLeadDetailModal.jsx";
import { updateVehicleLeadStatus } from "../../services/leads.service.js";
import { formatRelativeTime, normalizeWhatsAppArgentina } from "../../lib/formatters.js";

function exportLeadsCSV(leads) {
  const headers = ["ID", "Fecha", "Comprador", "Email", "Teléfono", "Vehículo", "Mensaje", "Estado", "Nota interna"];
  const rows = leads.map((l) => [
    l.lead_id,
    l.created_at ? new Date(l.created_at).toLocaleDateString("es-AR") : "",
    `${l.buyer_first_name || ""} ${l.buyer_last_name || ""}`.trim(),
    l.buyer_email || "",
    l.buyer_phone || "",
    `${l.vehicle_brand || ""} ${l.vehicle_model || ""} ${l.vehicle_version || ""}`.trim(),
    l.message || "",
    l.crm_status || "",
    l.next_action_note || "",
  ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function getWhatsAppLink(phone, buyerName, vehicleLabel) {
  const normalized = normalizeWhatsAppArgentina(phone);
  if (!normalized) return null;
  const name = (buyerName || "").split(" ")[0] || "hola";
  const vehicle = vehicleLabel ? ` sobre el ${vehicleLabel}` : "";
  const msg = encodeURIComponent(
    `Hola ${name}! Te contacto${vehicle}. ¿Seguís interesado/a?`
  );
  return `https://wa.me/${normalized}?text=${msg}`;
}

function getFollowUpState(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(dateStr + "T00:00:00");
  if (followUp < today) return "overdue";
  if (followUp.getTime() === today.getTime()) return "today";
  return "upcoming";
}

function formatFollowUpDate(dateStr) {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"));
}

const PIPELINE_STAGES = [
  { key: "all",         label: "Todos",          match: () => true },
  { key: "new",         label: "Nuevos",          match: (s) => ["new", "nuevo"].includes(s) },
  { key: "contacted",   label: "Contactados",     match: (s) => ["seen", "contacted", "contactado"].includes(s) },
  { key: "negotiation", label: "Negociación",     match: (s) => ["negotiation", "in_progress", "en_gestion", "assigned", "asignado", "reserved"].includes(s) },
  { key: "closed",      label: "Cerrados",        match: (s) => ["closed", "cerrado", "sold"].includes(s) },
  { key: "lost",        label: "Perdidos",        match: (s) => ["lost", "perdido", "no_response", "cancelled", "cancelado", "archived", "archivado"].includes(s) },
];

const STAGE_CHIP = {
  all: "",
  new: "info",
  contacted: "",
  negotiation: "warning",
  closed: "success",
  lost: "danger",
};

const NEXT_STATUS = {
  new:         "contacted",
  seen:        "contacted",
  contacted:   "negotiation",
  contactado:  "negotiation",
  negotiation: "sold",
  in_progress: "sold",
  en_gestion:  "sold",
  assigned:    "sold",
  asignado:    "sold",
  reserved:    "sold",
};

function getNextStatus(crm) {
  return NEXT_STATUS[String(crm || "").toLowerCase()] || null;
}

const NEXT_STATUS_LABELS = {
  contacted:   "Marcar contactado",
  negotiation: "Pasar a negociación",
  sold:        "Marcar vendido",
};

function NoteEditor({ lead, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(lead.next_action_note || "");
  const [date, setDate] = useState(lead.next_action_date || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateVehicleLeadStatus({
      leadId: lead.lead_id,
      crmStatus: lead.crm_status,
      nextActionNote: note || null,
      nextActionDate: date || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    await onUpdated();
    setOpen(false);
  }

  return (
    <div className="lead-note-editor">
      {!open ? (
        <button
          type="button"
          className="lead-note-toggle"
          onClick={() => setOpen(true)}
        >
          {lead.next_action_note ? "✎ Ver nota" : "+ Agregar nota"}
        </button>
      ) : (
        <div className="lead-note-form">
          <textarea
            className="lead-note-textarea"
            placeholder="Nota interna de seguimiento…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <input
            type="date"
            className="lead-note-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            title="Próxima acción"
          />
          <div className="lead-note-actions">
            <button
              type="button"
              className="table-action-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Guardando…" : saved ? "Guardado" : "Guardar"}
            </button>
            <button
              type="button"
              className="inventory-filter-clear"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAdvanceBtn({ lead, onUpdated }) {
  const next = getNextStatus(lead.crm_status);
  const [loading, setLoading] = useState(false);

  if (!next) return null;

  async function handleAdvance() {
    setLoading(true);
    await updateVehicleLeadStatus({ leadId: lead.lead_id, crmStatus: next });
    setLoading(false);
    await onUpdated();
  }

  return (
    <button
      type="button"
      className="lead-advance-btn"
      onClick={handleAdvance}
      disabled={loading}
      title={NEXT_STATUS_LABELS[next] || next}
    >
      {loading ? "…" : "→"}
    </button>
  );
}

export default function DealerLeadsModule({ leads, onRefresh, onBack }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeStage, setActiveStage] = useState("all");
  const [search, setSearch] = useState("");

  const stageCounts = useMemo(() =>
    PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.key] = stage.key === "all"
        ? leads.length
        : leads.filter((l) => stage.match(String(l.crm_status || "").toLowerCase())).length;
      return acc;
    }, {}),
    [leads]
  );

  const filtered = useMemo(() => {
    const stage = PIPELINE_STAGES.find((s) => s.key === activeStage);
    let list = stage ? leads.filter((l) => stage.match(String(l.crm_status || "").toLowerCase())) : leads;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((l) =>
        `${l.buyer_first_name} ${l.buyer_last_name} ${l.buyer_email} ${l.vehicle_brand} ${l.vehicle_model}`.toLowerCase().includes(q)
      );
    }

    return list;
  }, [leads, activeStage, search]);

  async function handleOpenLead(lead) {
    setSelectedLead(lead);
    if (lead.crm_status === "new") {
      await updateVehicleLeadStatus({ leadId: lead.lead_id, crmStatus: "seen" });
      onRefresh();
    }
  }

  return (
    <div className="dealer-leads-section">
      <div className="buyer-section-head dealer-module-open-head">
        <div>
          <button className="table-action-btn" type="button" onClick={onBack}>
            ← Volver al resumen
          </button>
          <h2>Leads recibidos</h2>
          <p>Consultas generadas desde publicaciones asociadas a este dealer.</p>
        </div>
        <div className="dealer-module-head-actions">
          <button
            type="button"
            className="table-action-btn"
            onClick={() => exportLeadsCSV(leads)}
            disabled={leads.length === 0}
          >
            Exportar CSV
          </button>
          <button className="admin-refresh-btn" onClick={onRefresh}>
            Actualizar
          </button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="empty-state">Todavía no hay leads reales para mostrar.</div>
      ) : (
        <>
          {/* Pipeline stage bar */}
          <div className="leads-pipeline-bar">
            {PIPELINE_STAGES.map((stage) => (
              <button
                key={stage.key}
                type="button"
                className={`leads-pipeline-stage${activeStage === stage.key ? " is-active" : ""}${STAGE_CHIP[stage.key] ? ` is-${STAGE_CHIP[stage.key]}` : ""}`}
                onClick={() => setActiveStage(stage.key)}
              >
                <span>{stage.label}</span>
                <strong>{stageCounts[stage.key]}</strong>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="inventory-filter-bar">
            <input
              className="inventory-filter-search"
              type="text"
              placeholder="Buscar por comprador o vehículo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="inventory-filter-count">
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              Sin leads en este estado.
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
                    <th>Nota interna</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((lead) => {
                    const vehicleLabel = [lead.vehicle_brand, lead.vehicle_model].filter(Boolean).join(" ");
                    const waLink = getWhatsAppLink(lead.buyer_phone, `${lead.buyer_first_name} ${lead.buyer_last_name}`, vehicleLabel);
                    const isNew = lead.crm_status === "new";
                    const followUpState = getFollowUpState(lead.next_action_date);

                    return (
                      <tr
                        key={lead.lead_id}
                        className={isNew ? "lead-row--new" : ""}
                      >
                        <td>
                          <strong title={formatDateTime(lead.created_at)}>
                            {formatRelativeTime(lead.created_at)}
                          </strong>
                          <span>Lead #{lead.lead_id}</span>
                          {isNew && <span className="lead-new-badge">Nuevo</span>}
                          {(followUpState || lead.next_action_note) && (
                            <span className="lead-followup-block">
                              {followUpState && (
                                <span className={`lead-followup-chip lead-followup-chip--${followUpState}`}>
                                  {followUpState === "overdue" && "Vencido: "}
                                  {followUpState === "today" && "Hoy: "}
                                  {followUpState === "upcoming" && "Próxima acción: "}
                                  {formatFollowUpDate(lead.next_action_date)}
                                </span>
                              )}
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>
                            {lead.buyer_first_name} {lead.buyer_last_name}
                          </strong>
                          <span>{lead.buyer_email}</span>
                          {lead.buyer_phone && (
                            <span className="lead-buyer-phone">
                              {lead.buyer_phone}
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="lead-whatsapp-btn"
                                  title="Abrir WhatsApp con mensaje pre-armado"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>{vehicleLabel}</strong>
                          <span>{lead.vehicle_version}</span>
                          <span>{lead.vehicle_title_snapshot}</span>
                        </td>

                        <td>
                          <span>{lead.message || "Sin mensaje."}</span>
                        </td>

                        <td>
                          <NoteEditor lead={lead} onUpdated={onRefresh} />
                        </td>

                        <td>
                          <div className="lead-status-with-advance">
                            <LeadStatusSelect lead={lead} onUpdated={onRefresh} />
                            <QuickAdvanceBtn lead={lead} onUpdated={onRefresh} />
                          </div>
                        </td>

                        <td>
                          <button
                            className="table-action-btn"
                            onClick={() => handleOpenLead(lead)}
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
        </>
      )}

      {selectedLead && (
        <VehicleLeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
}
