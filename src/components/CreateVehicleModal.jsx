import { useEffect, useMemo, useState } from "react";
import {
  attachImagesToCurrentDealerVehicle,
  createVehicleForCurrentDealer,
  uploadVehicleImages,
} from "../services/publish.service.js";
import { MAX_VEHICLE_IMAGES, MIN_VEHICLE_IMAGES } from "../config/constants.js";
import { canDealerPublish } from "../lib/permissions.js";
import {
  buildCatalogTree,
  listVehicleCatalog,
} from "../services/catalog.service.js";

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

const CURRENT_YEAR = new Date().getFullYear();
const INVALID_PLACEHOLDER_VALUES = new Set([
  "no informado",
  "no informada",
  "sin informar",
  "sin dato",
  "sin datos",
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isBlankOrPlaceholder(value) {
  const normalized = normalizeText(value);
  return !normalized || INVALID_PLACEHOLDER_VALUES.has(normalized);
}

function validateVehiclePublishForm(form, imageCount) {
  const errors = [];
  const year = getNumber(form.year);
  const km = getNumber(form.km);
  const price = getNumber(form.price);
  const reference = getNumber(form.marketReferencePrice);
  const delivery = getNumber(form.delivery);

  if (isBlankOrPlaceholder(form.brand)) {
    errors.push("Ingresá la marca del vehículo.");
  }

  if (isBlankOrPlaceholder(form.model)) {
    errors.push("Ingresá el modelo del vehículo.");
  }

  if (isBlankOrPlaceholder(form.version)) {
    errors.push("Ingresá la versión del vehículo.");
  }

  if (!year || year < 1950 || year > CURRENT_YEAR + 1) {
    errors.push("Ingresá un año válido.");
  }

  if (km === null || km < 0) {
    errors.push("Ingresá el kilometraje.");
  }

  if (!price || price <= 0) {
    errors.push("Ingresá el precio real total del vehículo.");
  }

  if (price && reference && reference > 0 && price < reference * 0.4) {
    errors.push(
      "Revisá el precio: podría estar cargado como entrega o anticipo."
    );
  }

  if (price && delivery && delivery > 0 && price <= delivery) {
    errors.push("El precio principal debe ser mayor que la entrega o anticipo.");
  }

  if (isBlankOrPlaceholder(form.province) || isBlankOrPlaceholder(form.city)) {
    errors.push("Completá provincia y ciudad.");
  }

  if (isBlankOrPlaceholder(form.bodyType)) {
    errors.push("Seleccioná la carrocería.");
  }

  if (isBlankOrPlaceholder(form.transmission)) {
    errors.push("Seleccioná la transmisión.");
  }

  if (isBlankOrPlaceholder(form.fuelType)) {
    errors.push("Seleccioná el combustible.");
  }

  if (String(form.details || "").trim().length < 10) {
    errors.push("Agregá detalles claros del estado y condiciones del vehículo.");
  }

  if (imageCount < MIN_VEHICLE_IMAGES) {
    errors.push(`Agregá al menos ${MIN_VEHICLE_IMAGES} fotos para publicar.`);
  }

  return errors;
}

function getCreateVehicleBlockMessage(dealer, publishCheck) {
  const status = String(dealer?.planStatus || "").toLowerCase();
  const reason = publishCheck?.reason;

  if (status === "expired_grace") {
    return "Tu plan venció y estás dentro del período de gracia. Podés consultar información existente, pero no crear nuevas publicaciones hasta reactivar el plan.";
  }

  if (status === "suspended") {
    return "Tu cuenta se encuentra suspendida operativamente. Contactá a administración para reactivar el servicio.";
  }

  if (status === "pending_activation") {
    return "Tu cuenta está pendiente de activación. Administración debe activar tu plan antes de publicar.";
  }

  if (status === "expired") {
    return "Tu plan comercial venció. Contactá a administración para reactivarlo.";
  }

  if (status === "inactive" || !status) {
    return "No detectamos un plan comercial activo. Contactá a administración.";
  }

  if (reason) {
    return reason;
  }

  return "No podés crear nuevas publicaciones hasta regularizar tu plan comercial o recuperar cupo disponible.";
}

function findByName(items = [], value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) return null;

  return (
    items.find((item) => normalizeText(item.name) === normalizedValue) || null
  );
}

export default function CreateVehicleModal({ dealer, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [createdVehicle, setCreatedVehicle] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [catalogTree, setCatalogTree] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const publishCheck = canDealerPublish(dealer || {});
  const planStatus = String(dealer?.planStatus || "").toLowerCase();
  const canCreateVehicle =
    publishCheck.allowed &&
    ["active", "expiring"].includes(planStatus);
  const createBlockMessage =
    !canCreateVehicle && getCreateVehicleBlockMessage(dealer, publishCheck);

  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      setCatalogError("");

      const { catalog, error: catalogLoadError } = await listVehicleCatalog();

      if (catalogLoadError) {
        setCatalogTree([]);
        setCatalogError(
          catalogLoadError.message ||
            "No se pudo cargar el catálogo de marcas, modelos y versiones."
        );
        setLoadingCatalog(false);
        return;
      }

      setCatalogTree(buildCatalogTree(catalog || []));
      setLoadingCatalog(false);
    }

    loadCatalog();
  }, []);

  const selectedBrand = useMemo(
    () => findByName(catalogTree, form.brand),
    [catalogTree, form.brand]
  );

  const availableModels = useMemo(() => {
    if (!selectedBrand) return [];

    return selectedBrand.models || [];
  }, [selectedBrand]);

  const selectedModel = useMemo(
    () => findByName(availableModels, form.model),
    [availableModels, form.model]
  );

  const availableVersions = useMemo(() => {
    if (!selectedModel) return [];

    return selectedModel.versions || [];
  }, [selectedModel]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateBrand(value) {
    setForm((current) => ({
      ...current,
      brand: value,
      model:
        selectedBrand && normalizeText(value) === normalizeText(current.brand)
          ? current.model
          : "",
      version:
        selectedBrand && normalizeText(value) === normalizeText(current.brand)
          ? current.version
          : "",
    }));
  }

  function updateModel(value) {
    setForm((current) => ({
      ...current,
      model: value,
      version:
        selectedModel && normalizeText(value) === normalizeText(current.model)
          ? current.version
          : "",
    }));
  }

  function handleImagesChange(event) {
    const files = Array.from(event.target.files || []);

    if (files.length > MAX_VEHICLE_IMAGES) {
      setError(`Podés cargar hasta ${MAX_VEHICLE_IMAGES} imágenes por vehículo.`);
      setImageFiles(files.slice(0, MAX_VEHICLE_IMAGES));
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

    if (!canCreateVehicle) {
      setError(
        createBlockMessage ||
          "No podés crear nuevas publicaciones hasta regularizar tu plan comercial o recuperar cupo disponible."
      );
      setSubmitting(false);
      return;
    }

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

    if (!form.year || Number(form.year) < 1950 || Number(form.year) > CURRENT_YEAR + 1) {
      setError("Ingresá un año válido.");
      setSubmitting(false);
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setError("Ingresá un precio válido.");
      setSubmitting(false);
      return;
    }

    const validationErrors = validateVehiclePublishForm(
      form,
      imageFiles.length
    );

    if (validationErrors.length > 0) {
      setError(
        `Revisá los datos obligatorios antes de publicar el vehículo. ${validationErrors.join(" ")}`
      );
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
            <h3>Publicación creada y enviada a revisión</h3>
            <p>
              Publicación creada y enviada a revisión. No será visible para
              compradores hasta que sea aprobada.
            </p>

            <div className="contact-summary">
              <span>Estado</span>
              <strong>
                {createdVehicle.publication_status === "review"
                  ? "En revisión"
                  : "Creada"}
              </strong>
              <span>
                Visibilidad: no visible hasta aprobación administrativa.
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
                <img
                  src={uploadSummary.mainImageUrl}
                  alt="Portada del vehículo"
                />
              </div>
            )}

            <button className="primary-action" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form className="zero-km-form" onSubmit={handleSubmit}>
            {catalogError && <div className="auth-warning">{catalogError}</div>}

            {createBlockMessage && (
              <div className="auth-warning">{createBlockMessage}</div>
            )}

            {loadingCatalog && (
              <div className="auth-message">
                Cargando catálogo de marcas, modelos y versiones...
              </div>
            )}

            <div className="form-grid-two">
              <label>
                Marca
                <input
                  list="vehicle-brand-options"
                  value={form.brand}
                  onChange={(event) => updateBrand(event.target.value)}
                  placeholder="Ej: Toyota"
                />
                <datalist id="vehicle-brand-options">
                  {catalogTree.map((brand) => (
                    <option key={brand.id} value={brand.name} />
                  ))}
                </datalist>
                <span className="form-hint">
                  Empezá a escribir y elegí una marca del catálogo.
                </span>
              </label>

              <label>
                Modelo
                <input
                  list="vehicle-model-options"
                  value={form.model}
                  onChange={(event) => updateModel(event.target.value)}
                  placeholder={
                    form.brand
                      ? "Ej: Corolla"
                      : "Primero seleccioná una marca"
                  }
                />
                <datalist id="vehicle-model-options">
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.name} />
                  ))}
                </datalist>
                <span className="form-hint">
                  {selectedBrand
                    ? "Modelos filtrados por la marca seleccionada."
                    : "Si elegís una marca del catálogo, se filtran los modelos."}
                </span>
              </label>

              <label>
                Versión
                <input
                  list="vehicle-version-options"
                  value={form.version}
                  onChange={(event) =>
                    updateField("version", event.target.value)
                  }
                  placeholder={
                    form.model
                      ? "Ej: 1.8 XEi CVT"
                      : "Primero seleccioná un modelo"
                  }
                />
                <datalist id="vehicle-version-options">
                  {availableVersions.map((version) => (
                    <option key={version.id} value={version.name} />
                  ))}
                </datalist>
                <span className="form-hint">
                  {selectedModel
                    ? "Versiones filtradas por el modelo seleccionado."
                    : "La versión puede cargarse manualmente si aún no está en catálogo."}
                </span>
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
                Entrada / anticipo
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
                Cantidad de cuotas
                <input
                  type="number"
                  value={form.months}
                  onChange={(event) => updateField("months", event.target.value)}
                  placeholder="Ej: 36"
                />
              </label>

              <label>
                Tasa anual
                <input
                  type="number"
                  value={form.rate}
                  onChange={(event) => updateField("rate", event.target.value)}
                  placeholder="Ej: 42"
                />
                <span className="form-hint">
                  No uses el precio principal para cargar solo una entrada o anticipo. Ejemplo: precio total del vehículo + entrada $500.000 + 48 cuotas. La financiación debe cargarse como dato complementario, no reemplaza el precio real del vehículo.
                </span>
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
                Mínimo {MIN_VEHICLE_IMAGES} fotos para publicar. Máximo{" "}
                {MAX_VEHICLE_IMAGES}. La primera imagen será la portada.
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

            <p className="dealer-legal-note">
              Declaro que la información publicada sobre vehículos, precios,
              disponibilidad, documentación y financiación es real, actualizada
              y bajo mi responsabilidad comercial.
            </p>

            <button
              className="primary-action"
              type="submit"
              disabled={submitting || !canCreateVehicle}
            >
              {submitting ? "Publicando..." : "Publicar vehículo"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
