import { useState } from "react";
import { createVehicleContactLead } from "../../services/leads.service.js";

const initialForm = {
  message: "",
};

function getWhatsAppUrl(phone, message) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits || digits.length < 8) return "";

  const normalizedPhone = digits.startsWith("54") ? digits : `54${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
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
  const whatsappUrl = createdLead
    ? getWhatsAppUrl(
        dealer?.phone || dealer?.phone_visible || dealer?.phone_whatsapp,
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
        "El dealer no tiene un WhatsApp valido cargado. La consulta ya quedo registrada."
      );
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="modal-backdrop">
      <section className="contact-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Contacto con trazabilidad</p>
            <h2>Contactar dealer</h2>
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
            <h3>Necesitás iniciar sesión</h3>
            <p>
              Podés explorar, ver detalles y comparar sin registrarte. Para
              contactar al dealer, oX NEXMOV necesita crear trazabilidad del
              lead.
            </p>

            <div className="contact-summary">
              <strong>
                {vehicle.brand} {vehicle.model}
              </strong>
              <span>{dealer.commercialName}</span>
            </div>

            <p className="contact-legal-note">
              Al continuar, oX NEXMOV registrará esta consulta para generar
              trazabilidad del contacto comercial.
            </p>

            <button className="primary-action" onClick={onRequireLogin}>
              Ingresar para contactar
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
              <span>{authProfile?.phone_visible || "Teléfono no informado"}</span>
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
                ? "Consulta activa reutilizada"
                : "Lead generado correctamente"}
            </h3>
            <p>
              La consulta quedó registrada para {dealer.commercialName}. En la
              próxima fase se abrirá WhatsApp o el canal comercial
              correspondiente luego de esta confirmación.
            </p>

            <p>
              Si el dealer tiene WhatsApp cargado, podés abrirlo ahora. También
              podés revisar esta consulta desde tu panel.
            </p>

            <div className="lead-debug">
              <span>ID lead</span>
              <strong>{createdLead.id || createdLead.lead_id}</strong>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="contact-next-actions">
              <button
                className="primary-action"
                type="button"
                onClick={handleOpenWhatsApp}
              >
                Abrir WhatsApp
              </button>

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
}
