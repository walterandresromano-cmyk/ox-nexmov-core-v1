import { useState } from "react";
import { grantExtraPublishSlots } from "../services/adminDealers.service.js";

const initialForm = {
  extraSlots: "5",
  reason: "",
};

export default function GrantExtraSlotsModal({ dealer, onClose, onGranted }) {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setResult(null);

    if (!dealer?.id) {
      setError("Dealer inválido.");
      setSubmitting(false);
      return;
    }

    if (!form.extraSlots || Number(form.extraSlots) <= 0) {
      setError("Ingresá un cupo extra mayor a 0.");
      setSubmitting(false);
      return;
    }

    const { dealer: updatedDealer, error: grantError } =
      await grantExtraPublishSlots({
        dealerId: dealer.id,
        extraSlots: form.extraSlots,
        reason: form.reason,
      });

    if (grantError) {
      setError(grantError.message || "No se pudo otorgar cupo extra.");
      setSubmitting(false);
      return;
    }

    setResult(updatedDealer);
    setSubmitting(false);

    if (onGranted) {
      await onGranted();
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="contact-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Beneficio admin</p>
            <h2>Otorgar cupo extra</h2>
            <p>
              Este cupo se suma al período comercial actual del dealer. No
              modifica el plan base. No es acumulativo ni permanente.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {result ? (
          <div className="lead-created-box">
            <h3>Cupo extra otorgado</h3>
            <p>
              {result.name} ahora tiene {result.extra_publish_slots} cupos extra
              disponibles sobre su plan {result.plan_code}.
            </p>

            <div className="contact-summary">
              <span>Publicaciones usadas</span>
              <strong>{result.publications_used}</strong>
              <span>Cupo extra actual: {result.extra_publish_slots}</span>
            </div>

            <button className="primary-action" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-summary">
              <span>Dealer</span>
              <strong>{dealer?.commercialName || "Sin dealer"}</strong>
              <span>Plan actual: {dealer?.plan || "Sin plan"}</span>
            </div>

            <label>
              Cupos extra a otorgar
              <input
                type="number"
                min="1"
                max="100"
                value={form.extraSlots}
                onChange={(event) =>
                  updateField("extraSlots", event.target.value)
                }
                placeholder="Ej: 10"
              />
            </label>

            <label>
              Motivo interno
              <textarea
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                rows={4}
                placeholder="Ej: beneficio comercial temporal, favor de la casa, prueba operativa, campaña puntual."
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button
              className="primary-action"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Otorgando cupo..." : "Otorgar cupo extra"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}