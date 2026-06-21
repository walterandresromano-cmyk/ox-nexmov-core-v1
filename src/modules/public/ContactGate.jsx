import { useState } from "react";
import { createPortal } from "react-dom";
import { normalizeWhatsAppArgentina } from "../../lib/formatters.js";
import { createVehicleContactLead } from "../../services/leads.service.js";
import { getDealerPhone } from "../../lib/dealer.js";

const initialForm = {
  message: "",
};

function getWhatsAppUrl(phone, message) {
  const digits = normalizeWhatsAppArgentina(phone);

  if (!digits) return "";

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}


export default function ContactGate({
  vehicle,
  dealer,
  authUser,
  authProfile,
  onClose,
  onLeadCreated,
  onRequireLogin,
  onNavigate,
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [createdLead, setCreatedLead] = useState(null);
  const [leadWasReused, setLeadWasReused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const rawDealerWhatsapp = getDealerPhone(vehicle, dealer);
  const normalizedDealerWhatsapp = normalizeWhatsAppArgentina(rawDealerWhatsapp);
  const hasDealerWhatsapp = Boolean(normalizedDealerWhatsapp);

  const whatsappUrl = createdLead
    ? getWhatsAppUrl(
        normalizedDealerWhatsapp,
        `Hola, quiero consultar por ${vehicle?.brand || ""} ${
          vehicle?.model || ""
        } publicado en oX NEXMOV.`
      )
    : "";

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || createdLead) return;

    if (!authUser?.id) {
      setError("Para contactar al vendedor primero tenés que iniciar sesión.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { lead, error: leadError, reused } = await createVehicleContactLead({
      authUser,
      authProfile,
      vehicle,
      dealer,
      message:
        form.message.trim() ||
        "El comprador solicitó contacto desde la publicación.",
      channel: "contact_gate",
      sourcePage: "contact_gate",
      actionType: "vehicle_contact",
    });

    if (leadError) {
      setError("No pudimos registrar tu consulta. Intenta nuevamente.");
      setSubmitting(false);
      return;
    }

    setCreatedLead(lead);
    setLeadWasReused(Boolean(reused));
    setSubmitting(false);

    if (onLeadCreated) {
      onLeadCreated(lead);
    }
  }

  function handleOpenWhatsApp() {
    if (!createdLead) {
      setError("Primero necesitamos registrar tu consulta.");
      return;
    }

    if (!whatsappUrl) {
      setError(
        "El vendedor no tiene un WhatsApp válido cargado. La consulta ya quedó registrada."
      );
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  const contactGateModal = (
    <div className="modal-backdrop">
      <section className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-gate-title">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Contacto verificado</p>
            <h2 id="contact-gate-title">Contactar al vendedor</h2>
            <p>
              Dejá un mensaje para que el vendedor tenga contexto.
              Tu consulta queda registrada y se habilita el contacto por WhatsApp.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {!authUser ? (
          <div className="lead-created-box">
            <div className="contact-summary">
              <strong>
                {vehicle.brand} {vehicle.model}
              </strong>
              <span>{dealer.commercialName}</span>
            </div>

            <p className="contact-legal-note">
              Para contactar al vendedor necesitamos identificarte.
              No implica reserva ni compromiso de compra.
            </p>

            <button className="primary-action" onClick={onRequireLogin}>
              Continuar con email
            </button>
          </div>
        ) : !createdLead ? (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-summary">
              <strong>
                {vehicle.brand} {vehicle.model}
              </strong>
              <span>{vehicle.version}</span>
              <span>{dealer.commercialName}</span>
            </div>

            <div className="contact-summary">
              <span>Consultás como</span>
              <strong>{authProfile?.full_name || authUser.email}</strong>
            </div>

            <label>
              Tu mensaje
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Ej: Hola, quiero consultar disponibilidad, financiación o coordinar una visita."
                rows={4}
                maxLength={1000}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <p className="contact-legal-note">
              No implica reserva ni compromiso de compra.
            </p>

            <button className="primary-action" type="submit" disabled={submitting}>
              {submitting ? "Registrando consulta..." : "Enviar consulta"}
            </button>
          </form>
        ) : (
          <div className="lead-created-box">
            <h3>
              {leadWasReused
                ? "Ya tenés una consulta activa"
                : "Consulta registrada"}
            </h3>
            <p>
              {leadWasReused
                ? "Tu consulta para este vehículo ya estaba registrada. Podés continuar el contacto con el vendedor."
                : "Tu consulta quedó guardada. El vendedor tiene el contexto y puede responderte."}
            </p>

            {error && <p className="form-error">{error}</p>}

            <div className="contact-next-actions">
              {hasDealerWhatsapp ? (
                <button
                  className="primary-action"
                  type="button"
                  onClick={handleOpenWhatsApp}
                >
                  Continuar por WhatsApp
                </button>
              ) : (
                <div className="contact-warning" role="status">
                  El vendedor no tiene WhatsApp cargado. Tu consulta ya quedó registrada.
                </div>
              )}

              <button
                className="primary-action secondary-action"
                type="button"
                onClick={() => {
                  onClose?.();
                  onNavigate?.("buyer");
                }}
              >
                Ver mis consultas
              </button>

              <button
                className="primary-action secondary-action"
                type="button"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  if (typeof document === "undefined") {
    return contactGateModal;
  }

  return createPortal(contactGateModal, document.body);
}
