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
  <div className="zero-km-panel ox-public-hero">
    <p className="ox-public-eyebrow">Financiación 0km</p>
    <h1 className="ox-public-title">
      Consultá financiación para tu próximo <span>0km</span>
    </h1>
    <p className="ox-public-lead">
          Completá tus datos mínimos y el equipo de oX NEXMOV revisará la
          consulta. La operación queda trazada dentro de la plataforma sin pedir
          datos sensibles desde el inicio.
        </p>

        <div className="zero-km-grid ox-public-content">
          <article className="zero-km-info-card">
            <span>Cómo funciona</span>
            <h2>Consulta guiada, sin cargar datos sensibles</h2>
            <p>
              No pedimos DNI desde el inicio. La primera etapa solo registra
              datos de contacto, ubicación, interés de vehículo y condiciones
              aproximadas.
            </p>

            <div className="zero-km-steps">
              <div>
                <strong>1</strong>
                <span>Completás la consulta.</span>
              </div>
              <div>
                <strong>2</strong>
                <span>El equipo interno revisa el caso.</span>
              </div>
              <div>
                <strong>3</strong>
                <span>Se avanza con alternativas reales.</span>
              </div>
            </div>
          </article>

          <form className="zero-km-form" onSubmit={handleSubmit}>
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

              <label>
                Situación laboral
                <select
                  value={form.employmentType}
                  onChange={(event) =>
                    updateField("employmentType", event.target.value)
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="relacion_dependencia">
                    Relación de dependencia
                  </option>
                  <option value="monotributo">Monotributo</option>
                  <option value="autonomo">Autónomo</option>
                  <option value="empresa">Empresa</option>
                  <option value="jubilado">Jubilado</option>
                  <option value="otro">Otro</option>
                </select>
              </label>

              <label>
                Rango de ingresos
                <select
                  value={form.monthlyIncomeRange}
                  onChange={(event) =>
                    updateField("monthlyIncomeRange", event.target.value)
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="hasta_500k">Hasta $500.000</option>
                  <option value="500k_1m">$500.000 a $1.000.000</option>
                  <option value="1m_2m">$1.000.000 a $2.000.000</option>
                  <option value="2m_4m">$2.000.000 a $4.000.000</option>
                  <option value="mas_4m">Más de $4.000.000</option>
                </select>
              </label>
            </div>

            <label>
              Mensaje
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                rows={5}
                placeholder="Contanos qué estás buscando o qué condición querés consultar."
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            {createdLead && (
              <div className="lead-created-box">
                <h3>Consulta 0km enviada correctamente</h3>
                <p>
                  Tu consulta quedó registrada. El equipo de oX NEXMOV la
                  revisará y podrá contactarte para continuar con la evaluación.
                </p>

                <div className="contact-summary">
                  <span>Estado inicial</span>
                  <strong>Recibida</strong>
                  <span>
                    No necesitás hacer nada más por ahora. Si corresponde, nos
                    pondremos en contacto por los datos que cargaste.
                  </span>
                </div>
              </div>
            )}

            <button
              className="primary-action"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Enviando consulta..." : "Enviar consulta 0km"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

