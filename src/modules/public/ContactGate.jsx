import { useState } from "react";
import { createPortal } from "react-dom";
import { normalizeWhatsAppArgentina } from "../../lib/formatters.js";
import { createVehicleContactLead } from "../../services/leads.service.js";

const initialForm = {
  message: "",
};

function getWhatsAppUrl(phone, message) {
  const digits = normalizeWhatsAppArgentina(phone);

  if (!digits) return "";

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function getDealerWhatsappFromVehicle(vehicle, dealer) {
  return (
    dealer?.dealerWhatsapp ||
    dealer?.dealer_whatsapp ||
    dealer?.phone ||
    dealer?.phoneWhatsapp ||
    dealer?.phone_whatsapp ||
    dealer?.contactPhone ||
    dealer?.contact_phone ||
    dealer?.phone_visible ||
    dealer?.dealerPhone ||
    dealer?.dealer_phone ||
    vehicle?.dealerWhatsapp ||
    vehicle?.dealer_whatsapp ||
    vehicle?.phoneWhatsapp ||
    vehicle?.phone_whatsapp ||
    vehicle?.contactPhone ||
    vehicle?.contact_phone ||
    vehicle?.dealerPhone ||
    vehicle?.dealer_phone ||
    vehicle?.dealer?.dealerWhatsapp ||
    vehicle?.dealer?.dealer_whatsapp ||
    vehicle?.dealer?.phone ||
    vehicle?.dealer?.phoneWhatsapp ||
    vehicle?.dealer?.phone_whatsapp ||
    vehicle?.dealer?.contactPhone ||
    vehicle?.dealer?.contact_phone ||
    vehicle?.dealer?.dealerPhone ||
    vehicle?.dealer?.dealer_phone ||
    vehicle?.raw?.dealerWhatsapp ||
    vehicle?.raw?.dealer_whatsapp ||
    vehicle?.raw?.phoneWhatsapp ||
    vehicle?.raw?.phone_whatsapp ||
    vehicle?.raw?.contactPhone ||
    vehicle?.raw?.contact_phone ||
    vehicle?.raw?.dealerPhone ||
    vehicle?.raw?.dealer_phone ||
    vehicle?.raw?.dealer_phone_whatsapp ||
    ""
  );
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
  const rawDealerWhatsapp = getDealerWhatsappFromVehicle(vehicle, dealer);
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
      setError("Para contactar al dealer primero tenés que iniciar sesión.");
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
        "El dealer no tiene un WhatsApp válido cargado. La consulta ya quedó registrada."
      );
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  const contactGateModal = (
    <div className="modal-backdrop">
      <section className="contact-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Registro de seguridad comercial</p>
            <h2>Contacto seguro</h2>
            <p>
              Para proteger la trazabilidad comercial, primero registramos el
              lead en oX NEXMOV y luego habilitamos el canal de contacto.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {!authUser ? (
          <div className="lead-created-box">
            <h3>Contacto seguro con trazabilidad</h3>
            <p>
              Para proteger a compradores y dealers, oX NEXMOV registra cada
              consulta comercial. Ingresá para continuar.
            </p>

            <div className="contact-summary">
              <strong>
                {vehicle.brand} {vehicle.model}
              </strong>
              <span>{dealer.commercialName}</span>
            </div>

            <p className="contact-legal-note">
              Este paso ayuda a evitar consultas falsas, spam y operaciones
              sospechosas.
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
              <span>Comprador registrado</span>
              <strong>{authProfile?.full_name || authUser.email}</strong>
              <span>Datos protegidos por oX NEXMOV</span>
            </div>

            <label>
              Consulta
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Ej: Hola, quiero consultar disponibilidad, financiación o coordinar una visita."
                rows={4}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <p className="contact-legal-note">
              Al continuar, oX NEXMOV registrará esta consulta para generar
              trazabilidad del contacto comercial.
            </p>

            <button className="primary-action" type="submit" disabled={submitting}>
              {submitting ? "Preparando contacto..." : "Generar lead y continuar"}
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
                ? "Ya tenés una consulta activa para este vehículo. Podés continuar el contacto con el dealer."
                : "Consulta registrada. Ya podés continuar el contacto con el dealer."}
            </p>

            <p>
              Registramos esta consulta para que el contacto sea trazable y el
              dealer pueda responderte mejor.
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
                  El dealer no tiene un WhatsApp válido cargado. La consulta ya
                  quedó registrada.
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
