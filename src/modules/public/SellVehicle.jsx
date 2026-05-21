import "../../styles/sellVehicle.css";
import { useState } from "react";
import { createSellVehicleLead } from "../../services/sellVehicle.service.js";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  province: "",
  city: "",
  brand: "",
  model: "",
  version: "",
  year: "",
  km: "",
  expectedPrice: "",
  condition: "",
  hasDebt: false,
  hasFinancing: false,
  acceptsDealerContact: true,
  message: "",
};

export default function SellVehicle({ authUser, authProfile, onNavigate }) {
  const [form, setForm] = useState(() => ({
    ...initialForm,
    fullName: authProfile?.full_name || "",
    email: authProfile?.email || authUser?.email || "",
    phone: authProfile?.phone_visible || authProfile?.phone_whatsapp || "",
    province: authProfile?.province || "",
    city: authProfile?.city || "",
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

    if (!authUser?.id) {
      setError("Para vender tu vehículo primero tenés que iniciar sesión.");
      setSubmitting(false);
      return;
    }

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

    if (!form.brand.trim()) {
      setError("Ingresá la marca del vehículo.");
      setSubmitting(false);
      return;
    }

    if (!form.model.trim()) {
      setError("Ingresá el modelo del vehículo.");
      setSubmitting(false);
      return;
    }

    if (form.year && Number(form.year) < 1980) {
      setError("Ingresá un año válido.");
      setSubmitting(false);
      return;
    }

    if (form.km && Number(form.km) < 0) {
      setError("Ingresá un kilometraje válido.");
      setSubmitting(false);
      return;
    }

    const { lead, error: leadError } = await createSellVehicleLead(form);

    if (leadError) {
      setError(leadError.message || "No se pudo crear la solicitud de venta.");
      setSubmitting(false);
      return;
    }

    setCreatedLead(lead);
    setSubmitting(false);

    setForm((current) => ({
      ...current,
      brand: "",
      model: "",
      version: "",
      year: "",
      km: "",
      expectedPrice: "",
      condition: "",
      hasDebt: false,
      hasFinancing: false,
      acceptsDealerContact: true,
      message: "",
    }));
  }

         return (
          <section className="page-section sell-vehicle-page">
         <div className="container panel sell-vehicle-panel">
        <p className="eyebrow">Vender mi vehículo</p>
        <h1>Ofrecé tu vehículo a dealers de la red</h1>
        <p>
          Cargá los datos principales de tu vehículo y generá una solicitud
          para que pueda ser evaluada dentro de oX NEXMOV.
        </p>

        {/*
          <div className="auth-warning">
            Para enviar una solicitud de venta tenés que iniciar sesión. Esto nos
            permite generar trazabilidad y evitar consultas anónimas.
            <div style={{ marginTop: 12 }}>
              <button
                className="primary-action"
                type="button"
                onClick={() => onNavigate?.("login")}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        */}

        {!authUser?.id ? (
          <div className="sell-vehicle-login-gate">
            <article className="sell-vehicle-info-card">
              <span>Acceso requerido</span>
              <h2>Ingresá para enviar los datos de tu vehículo</h2>
              <p>
                Para enviar los datos de tu vehículo necesitamos que inicies
                sesión y podamos registrar la trazabilidad de la consulta.
              </p>

              <button
                className="primary-action"
                type="button"
                onClick={() => onNavigate?.("login")}
              >
                Iniciar sesión
              </button>
            </article>
          </div>
        ) : (
        <div className="sell-vehicle-grid">
          <article className="sell-vehicle-info-card">
            <span>Cómo funciona</span>
            <h2>Tu vehículo puede ser evaluado por dealers habilitados</h2>
            <p>
              Esta solicitud no publica automáticamente tu auto como una unidad
              de dealer. Primero queda registrada para evaluación interna y
              posibles contactos comerciales con dealers habilitados.
            </p>

            <div className="sell-vehicle-steps">
              <div>
                <strong>1</strong>
                <span>Cargás los datos del vehículo.</span>
              </div>
              <div>
                <strong>2</strong>
                <span>oX NEXMOV registra la solicitud.</span>
              </div>
              <div>
                <strong>3</strong>
                <span>Dealers habilitados pueden evaluarla.</span>
              </div>
              <div>
                <strong>4</strong>
                <span>Recibís contacto comercial si hay interés.</span>
              </div>
            </div>

            <div className="sell-vehicle-trust-list">
              <span>Consulta trazable</span>
              <span>Red de dealers</span>
              <span>Sin exposición pública innecesaria</span>
              <span>Datos ordenados para evaluar mejor</span>
            </div>
          </article>

          <form className="sell-vehicle-form" onSubmit={handleSubmit}>
            <div className="form-grid-two">
              <label>
                Nombre completo
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="Tu nombre"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Email
                <input
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="tu@email.com"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Teléfono / WhatsApp
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="Ej: 11 3806 2294"
                  disabled={!authUser?.id}
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
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Ciudad
                <input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="Ej: Pilar"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Marca
                <input
                  value={form.brand}
                  onChange={(event) => updateField("brand", event.target.value)}
                  placeholder="Ej: Renault"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Modelo
                <input
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  placeholder="Ej: Logan"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Versión
                <input
                  value={form.version}
                  onChange={(event) =>
                    updateField("version", event.target.value)
                  }
                  placeholder="Ej: 1.6 Life"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Año
                <input
                  type="number"
                  value={form.year}
                  onChange={(event) => updateField("year", event.target.value)}
                  placeholder="Ej: 2021"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Kilómetros
                <input
                  type="number"
                  value={form.km}
                  onChange={(event) => updateField("km", event.target.value)}
                  placeholder="Ej: 62000"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Precio esperado
                <input
                  type="number"
                  value={form.expectedPrice}
                  onChange={(event) =>
                    updateField("expectedPrice", event.target.value)
                  }
                  placeholder="Ej: 12500000"
                  disabled={!authUser?.id}
                />
              </label>

              <label>
                Estado general
                <select
                  value={form.condition}
                  onChange={(event) =>
                    updateField("condition", event.target.value)
                  }
                  disabled={!authUser?.id}
                >
                  <option value="">Seleccionar</option>
                  <option value="excelente">Excelente</option>
                  <option value="muy_bueno">Muy bueno</option>
                  <option value="bueno">Bueno</option>
                  <option value="regular">Regular</option>
                  <option value="a_revisar">A revisar</option>
                </select>
              </label>

              <label>
                ¿Tiene deuda/prenda?
                <select
                  value={form.hasDebt ? "yes" : "no"}
                  onChange={(event) =>
                    updateField("hasDebt", event.target.value === "yes")
                  }
                  disabled={!authUser?.id}
                >
                  <option value="no">No</option>
                  <option value="yes">Sí</option>
                </select>
              </label>

              <label>
                ¿Tiene financiación vigente?
                <select
                  value={form.hasFinancing ? "yes" : "no"}
                  onChange={(event) =>
                    updateField("hasFinancing", event.target.value === "yes")
                  }
                  disabled={!authUser?.id}
                >
                  <option value="no">No</option>
                  <option value="yes">Sí</option>
                </select>
              </label>

              <label>
                ¿Aceptás contacto de dealers?
                <select
                  value={form.acceptsDealerContact ? "yes" : "no"}
                  onChange={(event) =>
                    updateField(
                      "acceptsDealerContact",
                      event.target.value === "yes"
                    )
                  }
                  disabled={!authUser?.id}
                >
                  <option value="yes">Sí</option>
                  <option value="no">No, solo quiero evaluación inicial</option>
                </select>
              </label>
            </div>

            <label>
              Mensaje / aclaraciones
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                rows={5}
                placeholder="Contanos estado general, detalles, urgencia de venta, si aceptás permuta o cualquier dato relevante."
                disabled={!authUser?.id}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            {createdLead && (
              <div className="lead-created-box">
                <h3>Solicitud enviada correctamente</h3>
                <p>
                  Tu vehículo quedó registrado para evaluación. Si corresponde,
                  la plataforma o un dealer habilitado podrá contactarte.
                </p>

                <div className="contact-summary">
                  <span>Estado inicial</span>
                  <strong>Recibida</strong>
                  <span>
                    No necesitás hacer nada más por ahora. Si corresponde, la
                    plataforma o un dealer habilitado podrá contactarte.
                  </span>
                </div>

                <button
                  className="primary-action"
                  type="button"
                  onClick={() => onNavigate?.("buyer")}
                >
                  Ir a mi panel
                </button>
              </div>
            )}

            <button
              className="primary-action"
              type="submit"
              disabled={submitting || !authUser?.id}
            >
              {submitting
                ? "Enviando solicitud..."
                : "Cargar mi vehículo"}
            </button>

            <p className="form-legal-note">
              Al enviar los datos de tu vehículo, aceptás que oX NEXMOV registre
              la información para gestionar posibles contactos comerciales con
              dealers habilitados. El envío de datos no garantiza una oferta ni
              una compra; la operación queda sujeta a evaluación, disponibilidad
              de dealers interesados y condiciones comerciales acordadas entre
              las partes.
            </p>
          </form>
        </div>
        )}
      </div>
    </section>
  );
}
