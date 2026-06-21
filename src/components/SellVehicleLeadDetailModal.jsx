import { useEffect, useState } from "react";
import { createPortal } from "react-dom";


import AssignSellVehicleLeadDealer from "./AssignSellVehicleLeadDealer.jsx";
import SellVehicleLeadStatusSelect from "./SellVehicleLeadStatusSelect.jsx";
import { updateSellVehicleLeadAdmin } from "../services/sellVehicle.service.js";

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
    return "Sin precio declarado";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(number);
}

function getStatusLabel(status) {
  const labels = {
    new: "Nueva",
    seen: "Vista",
    assigned: "Asignada",
    contacted: "Contactado",
    negotiation: "Negociación",
    closed: "Cerrada",
    lost: "Perdida",
  };

  return labels[status] || "Nueva";
}

function getPriorityLabel(priority) {
  const labels = {
    low: "Baja",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  return labels[priority] || "Normal";
}

function getAssignedDealerPlanValue(lead) {
  return String(
    lead?.assigned_dealer_plan ||
      lead?.assigned_dealer_plan_code ||
      lead?.dealer_plan ||
      lead?.dealer_plan_code ||
      lead?.dealerPlan ||
      lead?.plan_code ||
      ""
  )
    .trim()
    .toLowerCase();
}

export default function SellVehicleLeadDetailModal({
  lead,
  onClose,
  onUpdated,
}) {
  const [internalNotes, setInternalNotes] = useState(lead?.internal_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [adminDealerNote, setAdminDealerNote] = useState(
  lead?.admin_dealer_note || ""
);
  useEffect(() => {
    setInternalNotes(lead?.internal_notes || "");
  }, [lead?.internal_notes]);

  useEffect(() => {
  setAdminDealerNote(lead?.admin_dealer_note || "");
}, [lead?.admin_dealer_note]);

  if (!lead) return null;

  const isPlatinumOpportunity = getAssignedDealerPlanValue(lead) === "platinum";

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setNotesError("");
 
    const { error } = await updateSellVehicleLeadAdmin({
           leadId: lead.lead_id,
           status: lead.status || "new",
           internalNotes,
           adminDealerNote,
           });




    if (error) {
      setNotesError(error.message || "No se pudieron guardar las notas.");
      setSavingNotes(false);
      return;
    }

    setSavingNotes(false);
    setNotesSaved(true);

    if (onUpdated) {
      await onUpdated();
    }

    window.setTimeout(() => setNotesSaved(false), 1600);
  }

  return createPortal(
    <div className="modal-backdrop">
      <section className="ticket-detail-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Detalle vender mi vehículo</p>
            <h2>
              {lead.brand} {lead.model}
            </h2>
            <p>Solicitud de venta creada por comprador.</p>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="ticket-detail-grid">
          <article className="ticket-detail-card ticket-detail-main">
            <span>Vendedor</span>
            <strong>{lead.full_name}</strong>
            <p>{lead.email}</p>
            <p>{lead.phone}</p>
            <p>
              {lead.city || "Sin ciudad"}, {lead.province || "Sin provincia"}
            </p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Vehículo ofrecido</span>
            <strong>
              {lead.brand} {lead.model}
            </strong>
            <p>{lead.version || "Sin versión informada"}</p>
            <p>
              {lead.year || "Sin año"} ·{" "}
              {Number(lead.km || 0).toLocaleString("es-AR")} km
            </p>
          </article>

          <article className="ticket-detail-card">
            <span>Precio esperado</span>
            <strong>{formatARS(lead.expected_price)}</strong>
            <p>Valor declarado por el vendedor.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Condición</span>
            <strong>{lead.condition || "No declarada"}</strong>
            <p>Estado general informado.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Deuda / prenda</span>
            <strong>{lead.has_debt ? "Sí" : "No"}</strong>
            <p>
              {lead.has_debt
                ? "El vendedor declaró deuda o prenda."
                : "No declaró deuda o prenda."}
            </p>
          </article>

          <article className="ticket-detail-card">
            <span>Financiación vigente</span>
            <strong>{lead.has_financing ? "Sí" : "No"}</strong>
            <p>
              {lead.has_financing
                ? "El vehículo tendría financiación vigente."
                : "No declaró financiación vigente."}
            </p>
          </article>

          <article className="ticket-detail-card">
            <span>Acepta contacto de dealers</span>
            <strong>{lead.accepts_dealer_contact ? "Sí" : "No"}</strong>
            <p>Permiso declarado por el vendedor.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Estado actual</span>
            <strong>{getStatusLabel(lead.status)}</strong>
            <p>Estado operativo de la solicitud.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Prioridad</span>
            <strong>{getPriorityLabel(lead.priority)}</strong>
            <p>Prioridad interna inicial.</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
           <span>Dealer asignado</span>
            <strong>{lead.assigned_dealer_name || "Sin asignar"}</strong>
             <p>
              Seleccioná el dealer que va a recibir esta oportunidad comercial.
             </p>

             {isPlatinumOpportunity && (
               <div className="sell-lead-platinum-badge">
                 <span>Oportunidad Platinum</span>
                 <p>Oportunidad comercial visible para dealer con plan Platinum.</p>
               </div>
             )}

             <AssignSellVehicleLeadDealer lead={lead} onAssigned={onUpdated} />
            </article>

          <article className="ticket-detail-card">
            <span>Fecha de creación</span>
            <strong>{formatDateTime(lead.created_at)}</strong>
            <p>Momento en que ingresó la solicitud.</p>
          </article>

          <article className="ticket-detail-card">
            <span>Última actualización</span>
            <strong>{formatDateTime(lead.updated_at)}</strong>
            <p>Último movimiento operativo.</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Mensaje del vendedor</span>
            <p>{lead.message || "Sin mensaje adicional."}</p>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
          <span>Notas del dealer</span>
          <p>{lead.dealer_notes ||"El dealer todavía no cargó notas sobre esta oportunidad."}
          </p>
          </article>

           <article className="ticket-detail-card ticket-detail-main">
  <span>Nota visible para dealer</span>

  <textarea
    className="lead-notes-textarea"
    value={adminDealerNote}
    onChange={(event) => {
      setAdminDealerNote(event.target.value);
      setNotesSaved(false);
      setNotesError("");
    }}
    rows={5}
    placeholder="Ej: Contactar al vendedor solo si acepta precio de referencia. Pedir fotos adicionales antes de avanzar."
  />

  <p>
    Esta nota será visible para el dealer asignado. No uses este campo para
    información privada del admin.
  </p>
</article>


          <article className="ticket-detail-card ticket-detail-main">
            <span>Notas internas</span>

            <textarea
              className="lead-notes-textarea"
              value={internalNotes}
              onChange={(event) => {
                setInternalNotes(event.target.value);
                setNotesSaved(false);
                setNotesError("");
              }}
              rows={6}
              placeholder="Ej: Vehículo interesante para Ruta 8. Solicitar fotos. Verificar deuda/prenda antes de asignar."
            />

            <div className="lead-notes-actions">
              <button
                className="table-action-btn"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? "Guardando..." : "Guardar notas"}
              </button>

              {notesSaved && <span>Notas guardadas</span>}
              {notesError && <small>{notesError}</small>}
            </div>
          </article>

          <article className="ticket-detail-card ticket-detail-main">
            <span>Gestión del estado</span>
            <SellVehicleLeadStatusSelect lead={lead} onUpdated={onUpdated} />
          </article>
        </div>
      </section>
    </div>,
    document.body
  );
}
