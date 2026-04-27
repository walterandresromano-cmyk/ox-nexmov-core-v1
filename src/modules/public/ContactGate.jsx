import { useState } from "react";
import { createVehicleContactLead } from "../../services/leads.service.js";

const initialForm = {
  message: "",
};

export default function ContactGate({
  vehicle,
  dealer,
  authUser,
  authProfile,
  onClose,
  onLeadCreated,
  onRequireLogin,
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [createdLead, setCreatedLead] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!authUser?.id) {
      setError("Para contactar al dealer primero tenés que iniciar sesión.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { lead, error: leadError } = await createVehicleContactLead({
      authUser,
      authProfile,
      vehicle,
      dealer,
      message:
        form.message.trim() ||
        "El comprador solicitó contacto desde la publicación.",
      channel: "contact_gate",
    });

    if (leadError) {
      setError(leadError.message || "No se pudo generar el lead.");
      setSubmitting(false);
      return;
    }

    setCreatedLead(lead);
    setSubmitting(false);

    if (onLeadCreated) {
      onLeadCreated(lead);
    }
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

            <button className="primary-action" type="submit" disabled={submitting}>
              {submitting ? "Generando lead..." : "Generar lead y continuar"}
            </button>
          </form>
        ) : (
          <div className="lead-created-box">
            <h3>Lead generado correctamente</h3>
            <p>
              La consulta quedó registrada para {dealer.commercialName}. En la
              próxima fase se abrirá WhatsApp o el canal comercial
              correspondiente luego de esta confirmación.
            </p>

            <div className="lead-debug">
              <span>ID lead</span>
              <strong>{createdLead.id}</strong>
            </div>

            <button className="primary-action" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}