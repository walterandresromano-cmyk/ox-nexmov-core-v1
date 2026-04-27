import { useState } from "react";
import {
  attachImagesToCurrentDealerVehicle,
  createVehicleForCurrentDealer,
  uploadVehicleImages,
} from "../services/publish.service.js";

const initialForm = {
  brand: "",
  model: "",
  version: "",
  year: "",
  price: "",
  km: "",
  bodyType: "",
  transmission: "",
  fuelType: "",
  province: "",
  city: "",
  marketReferencePrice: "",
  financing: false,
  delivery: "",
  months: "",
  rate: "",
  details: "",
};

export default function CreateVehicleModal({ dealer, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [createdVehicle, setCreatedVehicle] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleImagesChange(event) {
    const files = Array.from(event.target.files || []);

    if (files.length > 12) {
      setError("Podés cargar hasta 12 imágenes por vehículo.");
      setImageFiles(files.slice(0, 12));
      return;
    }

    setError("");
    setImageFiles(files);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setCreatedVehicle(null);
    setUploadSummary(null);

    if (!form.brand.trim()) {
      setError("Ingresá la marca.");
      setSubmitting(false);
      return;
    }

    if (!form.model.trim()) {
      setError("Ingresá el modelo.");
      setSubmitting(false);
      return;
    }

    if (!form.year || Number(form.year) < 1980) {
      setError("Ingresá un año válido.");
      setSubmitting(false);
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setError("Ingresá un precio válido.");
      setSubmitting(false);
      return;
    }

    const { vehicle, error: publishError } = await createVehicleForCurrentDealer(
      form
    );

    if (publishError) {
      setError(publishError.message || "No se pudo publicar el vehículo.");
      setSubmitting(false);
      return;
    }

    let uploadedImages = [];

    if (imageFiles.length > 0) {
      const { images, error: uploadError } = await uploadVehicleImages({
        vehicleId: vehicle.vehicle_id,
        files: imageFiles,
      });

      if (uploadError) {
        setError(
          `La publicación fue creada, pero falló la subida de imágenes: ${
            uploadError.message || "error desconocido"
          }`
        );
        setCreatedVehicle(vehicle);
        setSubmitting(false);

        if (onCreated) {
          await onCreated();
        }

        return;
      }

      uploadedImages = images;

      const { error: attachError } = await attachImagesToCurrentDealerVehicle({
        vehicleId: vehicle.vehicle_id,
        images: uploadedImages,
      });

      if (attachError) {
        setError(
          `Las imágenes subieron, pero no se pudieron asociar al vehículo: ${
            attachError.message || "error desconocido"
          }`
        );
        setCreatedVehicle(vehicle);
        setSubmitting(false);

        if (onCreated) {
          await onCreated();
        }

        return;
      }
    }

    setCreatedVehicle(vehicle);
    setUploadSummary({
      count: uploadedImages.length,
      mainImageUrl: uploadedImages[0]?.url || null,
    });

    setSubmitting(false);

    if (onCreated) {
      await onCreated();
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="ticket-detail-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Alta de vehículo</p>
            <h2>Publicar vehículo</h2>
            <p>
              La publicación se asociará automáticamente a{" "}
              <strong>{dealer?.commercialName}</strong>.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {createdVehicle ? (
          <div className="lead-created-box">
            <h3>Publicación creada correctamente</h3>
            <p>
              El vehículo quedó registrado. Si pasó las validaciones, ya puede
              aparecer en la búsqueda pública.
            </p>

            <div className="contact-summary">
              <span>Estado</span>
              <strong>
                {createdVehicle.publication_status === "review"
                  ? "En revisión"
                  : "Activa"}
              </strong>
              <span>
                Revisión: {createdVehicle.review_status || "auto_approved"}
              </span>
            </div>

            {uploadSummary && (
              <div className="contact-summary">
                <span>Imágenes cargadas</span>
                <strong>{uploadSummary.count}</strong>
                <span>
                  {uploadSummary.count > 0
                    ? "La primera imagen quedó como portada."
                    : "Publicación sin imágenes."}
                </span>
              </div>
            )}

            {uploadSummary?.mainImageUrl && (
              <div className="vehicle-image-preview-grid">
                <img src={uploadSummary.mainImageUrl} alt="Portada del vehículo" />
              </div>
            )}

            <button className="primary-action" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form className="zero-km-form" onSubmit={handleSubmit}>
            <div className="form-grid-two">
              <label>
                Marca
                <input
                  value={form.brand}
                  onChange={(event) => updateField("brand", event.target.value)}
                  placeholder="Ej: Toyota"
                />
              </label>

              <label>
                Modelo
                <input
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  placeholder="Ej: Corolla"
                />
              </label>

              <label>
                Versión
                <input
                  value={form.version}
                  onChange={(event) =>
                    updateField("version", event.target.value)
                  }
                  placeholder="Ej: 1.8 XEi CVT"
                />
              </label>

              <label>
                Año
                <input
                  type="number"
                  value={form.year}
                  onChange={(event) => updateField("year", event.target.value)}
                  placeholder="Ej: 2021"
                />
              </label>

              <label>
                Precio publicado
                <input
                  type="number"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="Ej: 19300000"
                />
              </label>

              <label>
                Referencia mercado
                <input
                  type="number"
                  value={form.marketReferencePrice}
                  onChange={(event) =>
                    updateField("marketReferencePrice", event.target.value)
                  }
                  placeholder="Ej: 20500000"
                />
              </label>

              <label>
                Kilómetros
                <input
                  type="number"
                  value={form.km}
                  onChange={(event) => updateField("km", event.target.value)}
                  placeholder="Ej: 58000"
                />
              </label>

              <label>
                Carrocería
                <select
                  value={form.bodyType}
                  onChange={(event) =>
                    updateField("bodyType", event.target.value)
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="Sedán">Sedán</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="SUV">SUV</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Utilitario">Utilitario</option>
                  <option value="Coupé">Coupé</option>
                  <option value="Rural">Rural</option>
                </select>
              </label>

              <label>
                Transmisión
                <select
                  value={form.transmission}
                  onChange={(event) =>
                    updateField("transmission", event.target.value)
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="Manual">Manual</option>
                  <option value="Automática">Automática</option>
                  <option value="CVT">CVT</option>
                </select>
              </label>

              <label>
                Combustible
                <select
                  value={form.fuelType}
                  onChange={(event) =>
                    updateField("fuelType", event.target.value)
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="Nafta">Nafta</option>
                  <option value="Diésel">Diésel</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Eléctrico">Eléctrico</option>
                  <option value="GNC">GNC</option>
                </select>
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
                  placeholder="Ej: San Miguel"
                />
              </label>

              <label>
                Tiene financiación
                <select
                  value={form.financing ? "yes" : "no"}
                  onChange={(event) =>
                    updateField("financing", event.target.value === "yes")
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Sí</option>
                </select>
              </label>

              <label>
                Entrega
                <input
                  type="number"
                  value={form.delivery}
                  onChange={(event) =>
                    updateField("delivery", event.target.value)
                  }
                  placeholder="Ej: 3500000"
                />
              </label>

              <label>
                Cuotas / meses
                <input
                  type="number"
                  value={form.months}
                  onChange={(event) => updateField("months", event.target.value)}
                  placeholder="Ej: 36"
                />
              </label>

              <label>
                Tasa
                <input
                  type="number"
                  value={form.rate}
                  onChange={(event) => updateField("rate", event.target.value)}
                  placeholder="Ej: 42"
                />
              </label>
            </div>

            <label>
              Imágenes del vehículo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImagesChange}
              />
              <span className="form-hint">
                Hasta 12 imágenes. La primera imagen será la portada.
              </span>
            </label>

            {imageFiles.length > 0 && (
              <div className="vehicle-image-preview-grid">
                {imageFiles.slice(0, 12).map((file) => (
                  <img
                    key={`${file.name}-${file.size}`}
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                  />
                ))}
              </div>
            )}

            <label>
              Detalles / aclaraciones
              <textarea
                value={form.details}
                onChange={(event) => updateField("details", event.target.value)}
                rows={5}
                placeholder="Estado general, detalles de financiación, condiciones, observaciones."
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button className="primary-action" type="submit" disabled={submitting}>
              {submitting ? "Publicando..." : "Publicar vehículo"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}