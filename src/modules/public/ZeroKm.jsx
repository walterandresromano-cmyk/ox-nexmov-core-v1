import "../../styles/zeroKm.css";
import { useState } from "react";
import { createZeroKmFinancingLead } from "../../services/zeroKm.service.js";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  province: "",
  city: "",
  brandInterest: "",
  modelInterest: "",
  budgetRange: "",
  downPayment: "",
  preferredTermMonths: "",
  employmentType: "",
  monthlyIncomeRange: "",
  message: "",
};

export default function ZeroKm({ authUser, authProfile }) {
  const [form, setForm] = useState(() => ({
    ...initialForm,
    fullName: authProfile?.full_name || "",
    email: authProfile?.email || authUser?.email || "",
    phone: authProfile?.phone_visible || authProfile?.phone_whatsapp || "",
  }));

  const [createdLead, setCreatedLead] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setCreatedLead(null);

    if (!form.fullName.trim()) {
      setError("Ingresá tu nombre completo.");
      setSubmitting(false);
      return;
    }

    if (!form.email.includes("@")) {
      setError("Ingresá un email válido.");
      setSubmitting(false);
      return;
    }

    if (!form.phone.trim()) {
      setError("Ingresá un teléfono o WhatsApp.");
      setSubmitting(false);
      return;
    }

    const { lead, error: leadError } = await createZeroKmFinancingLead(form);

    if (leadError) {
      setError(leadError.message || "No se pudo crear la consulta 0km.");
      setSubmitting(false);
      return;
    }

    setCreatedLead(lead);
    setSubmitting(false);

    setForm((current) => ({
      ...current,
      brandInterest: "",
      modelInterest: "",
      budgetRange: "",
      downPayment: "",
      preferredTermMonths: "",
      employmentType: "",
      monthlyIncomeRange: "",
      message: "",
    }));
  }

  return (
    <section className="zero-km-page ox-public-page">
      <section className="zero-km-panel ox-public-hero">
        <p className="ox-public-eyebrow">Financiación 0km</p>
        <h1 className="ox-public-title">
          Explorá opciones 0km con <span>condiciones claras</span>
        </h1>
        <p className="ox-public-lead">
          Consultá disponibilidad, entrega, plazos y condiciones comerciales
          declaradas para unidades 0km, sin cargar datos sensibles.
        </p>

        <div className="zero-km-hero-actions">
          <a className="primary-action" href="#zero-km-form">
            Consultar opciones 0km
          </a>
          <a className="secondary-action" href="#zero-km-how">
            Ver criterios
          </a>
        </div>
      </section>


      <div className="zero-km-grid ox-public-content">
          <form className="zero-km-form" id="zero-km-form" onSubmit={handleSubmit}>
            <div className="zero-km-form-head">
              <span>Consulta guiada</span>
              <h2>Tu consulta 0km</h2>
              <p>
                Dejanos una base simple para ubicar modelo, zona y preferencia
                comercial.
              </p>
            </div>

            <div className="zero-km-form-group">
              <div className="zero-km-form-group-head">
                <span>Datos de contacto</span>
              </div>

              <div className="form-grid-two">
              <label>
                Nombre completo
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="Tu nombre"
                />
              </label>

              <label>
                Email
                <input
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="tu@email.com"
                />
              </label>

              <label>
                Teléfono / WhatsApp
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="Ej: 11 3806 2294"
                />
              </label>

              <label>
                Provincia
                <input
                  value={form.province}
                  onChange={(event) =>
                    updateField("province", event.target.value)
                  }
                  placeholder="Ej: Buenos Aires"
                />
              </label>

              <label>
                Ciudad
                <input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="Ej: Pilar"
                />
              </label>
              </div>
            </div>

            <div className="zero-km-form-group">
              <div className="zero-km-form-group-head">
                <span>Vehículo y condiciones</span>
              </div>

              <div className="form-grid-two">
              <label>
                Marca de interés
                <input
                  value={form.brandInterest}
                  onChange={(event) =>
                    updateField("brandInterest", event.target.value)
                  }
                  placeholder="Ej: Toyota, Fiat, Peugeot"
                />
              </label>

              <label>
                Modelo de interés
                <input
                  value={form.modelInterest}
                  onChange={(event) =>
                    updateField("modelInterest", event.target.value)
                  }
                  placeholder="Ej: Corolla, Cronos, 208"
                />
              </label>

              <label>
                Rango de presupuesto
                <select
                  value={form.budgetRange}
                  onChange={(event) =>
                    updateField("budgetRange", event.target.value)
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="hasta_20m">Hasta 20 millones</option>
                  <option value="20m_30m">20 a 30 millones</option>
                  <option value="30m_45m">30 a 45 millones</option>
                  <option value="45m_60m">45 a 60 millones</option>
                  <option value="mas_60m">Más de 60 millones</option>
                </select>
              </label>

              <label>
                Entrega estimada
                <input
                  type="number"
                  value={form.downPayment}
                  onChange={(event) =>
                    updateField("downPayment", event.target.value)
                  }
                  placeholder="Ej: 5000000"
                />
              </label>

              <label>
                Plazo preferido
                <select
                  value={form.preferredTermMonths}
                  onChange={(event) =>
                    updateField("preferredTermMonths", event.target.value)
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="12">12 meses</option>
                  <option value="24">24 meses</option>
                  <option value="36">36 meses</option>
                  <option value="48">48 meses</option>
                  <option value="60">60 meses</option>
                  <option value="72">72 meses</option>
                </select>
              </label>
              </div>
            </div>

            <div className="zero-km-form-group zero-km-form-group-message">
              <div className="zero-km-form-group-head">
                <span>Mensaje</span>
              </div>

              <label>
              Detalle de la consulta
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                rows={4}
                placeholder="Contanos qué modelo, entrega o condición comercial querés consultar."
              />
              </label>
            </div>

            <p className="finance-legal-note">
              Dejanos tus datos para consultar opciones disponibles. La
              información final dependerá del proveedor, disponibilidad y condiciones
              vigentes.
            </p>

            {error && <p className="form-error">{error}</p>}

            {createdLead && (
              <div className="lead-created-box">
                <h3>Consulta enviada</h3>
                <p>
                  Un asesor podrá contactarte para continuar el proceso.
                </p>

                <div className="contact-summary">
                  <span>Estado inicial</span>
                  <strong>Recibida</strong>
                  <span>
                    No necesitás hacer nada más por ahora. Si corresponde, nos
                    pondremos en contacto por los datos que cargaste.
                  </span>
                </div>

                <button
                  type="button"
                  className="admin-refresh-btn"
                  onClick={() => setCreatedLead(null)}
                >
                  Hacer otra consulta
                </button>
              </div>
            )}

            {!createdLead && (
              <button
                className="primary-action"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Enviando consulta..." : "Consultar opciones 0km"}
              </button>
            )}

            <p className="form-legal-note">
              Al enviar esta consulta, aceptás que oX NEXMOV registre tus datos
              para gestionar el contacto comercial vinculado a unidades 0km.
              El envío de una consulta no implica reserva, contratación ni
              disponibilidad confirmada.
            </p>
          </form>

          <div className="zero-km-side-stack">
            <article className="zero-km-info-card" id="zero-km-how">
              <span>Consulta guiada</span>
              <h2>Datos justos para una primera lectura.</h2>
              <p>
                Una solicitud inicial clara, sin convertir la página en un
                formulario financiero pesado.
              </p>

              <div className="zero-km-steps">
                <div>
                  <strong>1</strong>
                  <span>Dejás una consulta 0km.</span>
                </div>
                <div>
                  <strong>2</strong>
                  <span>La oportunidad queda ordenada.</span>
                </div>
                <div>
                  <strong>3</strong>
                  <span>Se revisan disponibilidad y condiciones vigentes.</span>
                </div>
                <div>
                  <strong>4</strong>
                  <span>Avanzás solo si la propuesta tiene sentido.</span>
                </div>
              </div>
            </article>

            <article className="zero-km-responsible-note">
              <span>Lectura responsable</span>
              <p>
                La disponibilidad, valores, entrega, plazos y condiciones
                pueden variar según proveedor, modelo, plan y fecha de consulta.
                oX NEXMOV organiza la solicitud, pero no garantiza condiciones
                finales ni disponibilidad.
              </p>
            </article>
          </div>
      </div>
    </section>
  );
}
