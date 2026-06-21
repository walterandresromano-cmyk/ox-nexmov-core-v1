import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  attachImagesToCurrentDealerVehicle,
  createVehicleForCurrentDealer,
  uploadVehicleImages,
} from "../services/publish.service.js";
import { MAX_VEHICLE_IMAGES, MIN_VEHICLE_IMAGES } from "../config/constants.js";
import { setVehicleContraoferta } from "../services/contraofertas.service.js";
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
  show_maintenance_info: false,
  insurance_monthly_amount: "",
  insurance_provider: "",
  insurance_coverage_type: "",
  fuel_consumption: "",
  fuel_tank_liters: "",
  fuel_full_tank_cost: "",
  patent_cost: "",
  estimated_service_cost: "",
  estimated_monthly_maintenance: "",
  maintenance_notes: "",
  maintenance_updated_at: "",
  contraoferta_habilitada: false,
  precio_min_contraoferta: "",
  precio_max_contraoferta: "",
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

function buildMaintenanceInfo(form) {
  function num(v) {
    const n = Number(v);
    return v !== "" && Number.isFinite(n) && n > 0 ? n : null;
  }
  function txt(v) {
    return String(v || "").trim() || null;
  }
  const info = {
    insurance_monthly_amount:      num(form.insurance_monthly_amount),
    insurance_provider:            txt(form.insurance_provider),
    insurance_coverage_type:       txt(form.insurance_coverage_type),
    fuel_consumption:              num(form.fuel_consumption),
    fuel_tank_liters:              num(form.fuel_tank_liters),
    fuel_full_tank_cost:           num(form.fuel_full_tank_cost),
    patent_cost:                   num(form.patent_cost),
    estimated_service_cost:        num(form.estimated_service_cost),
    estimated_monthly_maintenance: num(form.estimated_monthly_maintenance),
    maintenance_notes:             txt(form.maintenance_notes),
    maintenance_updated_at:        txt(form.maintenance_updated_at),
  };
  return Object.values(info).some((v) => v !== null) ? info : null;
}

const PREFILL_FIELDS = [
  "brand", "model", "version", "bodyType", "transmission", "fuelType",
  "province", "city", "financing", "delivery", "months", "rate",
  "show_maintenance_info", "insurance_monthly_amount", "insurance_provider",
  "insurance_coverage_type", "fuel_consumption", "fuel_tank_liters",
  "fuel_full_tank_cost", "patent_cost", "estimated_service_cost",
  "estimated_monthly_maintenance", "maintenance_notes",
];

function vehicleToForm(v) {
  return {
    brand: v.brand || "",
    model: v.model || "",
    version: v.version || "",
    bodyType: v.body_type || "",
    transmission: v.transmission || "",
    fuelType: v.fuel_type || "",
    province: v.province || "",
    city: v.city || "",
    financing: Boolean(v.financing),
    delivery: v.delivery ? String(v.delivery) : "",
    months: v.months ? String(v.months) : "",
    rate: v.rate ? String(v.rate) : "",
    show_maintenance_info: Boolean(v.show_maintenance_info),
    insurance_monthly_amount: v.insurance_monthly_amount ? String(v.insurance_monthly_amount) : "",
    insurance_provider: v.insurance_provider || "",
    insurance_coverage_type: v.insurance_coverage_type || "",
    fuel_consumption: v.fuel_consumption ? String(v.fuel_consumption) : "",
    fuel_tank_liters: v.fuel_tank_liters ? String(v.fuel_tank_liters) : "",
    fuel_full_tank_cost: v.fuel_full_tank_cost ? String(v.fuel_full_tank_cost) : "",
    patent_cost: v.patent_cost ? String(v.patent_cost) : "",
    estimated_service_cost: v.estimated_service_cost ? String(v.estimated_service_cost) : "",
    estimated_monthly_maintenance: v.estimated_monthly_maintenance ? String(v.estimated_monthly_maintenance) : "",
    maintenance_notes: v.maintenance_notes || "",
  };
}

export default function CreateVehicleModal({ dealer, onClose, onCreated, dealerVehicles = [], initialValues = {} }) {
  const [form, setForm] = useState({ ...initialForm, ...initialValues });
  const [prefillSource, setPrefillSource] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [createdVehicle, setCreatedVehicle] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [catalogTree, setCatalogTree] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [createGuideOpen, setCreateGuideOpen] = useState(true);

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

  function applyPrefill(vehicleId) {
    setPrefillSource(vehicleId);
    if (!vehicleId) return;
    const source = dealerVehicles.find((v) => String(v.vehicle_id) === vehicleId);
    if (!source) return;
    const mapped = vehicleToForm(source);
    setForm((current) => {
      const next = { ...current };
      PREFILL_FIELDS.forEach((k) => { if (mapped[k] !== undefined) next[k] = mapped[k]; });
      return next;
    });
  }

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

    const { vehicle, error: publishError } = await createVehicleForCurrentDealer({
      ...form,
      maintenance_info: buildMaintenanceInfo(form),
    });

    if (publishError) {
      setError(publishError.message || "No se pudo publicar el vehículo.");
      setSubmitting(false);
      return;
    }

    let uploadedImages = [];

    if (imageFiles.length > 0) {
      const { images, error: uploadError } = await uploadVehicleImages({
        vehicleId: vehicle.id ?? vehicle.vehicle_id,
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
        vehicleId: vehicle.id ?? vehicle.vehicle_id,
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

    // Contraoferta settings (fire-and-forget, non-blocking)
    if (form.contraoferta_habilitada) {
      setVehicleContraoferta({
        vehicleId: vehicle.id ?? vehicle.vehicle_id,
        habilitada: true,
        precioMin: form.precio_min_contraoferta ? Number(form.precio_min_contraoferta) : null,
        precioMax: form.precio_max_contraoferta ? Number(form.precio_max_contraoferta) : null,
      });
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

  const createDescLen   = String(form.details || "").length;
  const photoCount      = imageFiles.length;
  const photoStatusBand = photoCount < MIN_VEHICLE_IMAGES ? "weak"
    : photoCount < 8 ? "ok"
    : "good";
  const photoStatusMsg  = photoCount < MIN_VEHICLE_IMAGES
    ? `Faltan fotos obligatorias (mín. ${MIN_VEHICLE_IMAGES}).`
    : photoCount < 8
    ? "Mínimo completo. Podés sumar más fotos para mejorar la publicación."
    : "Buen nivel visual para la publicación.";

  return createPortal(
    <div className="modal-backdrop">
      <section className="ticket-detail-modal" role="dialog" aria-modal="true" aria-labelledby="create-vehicle-title">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Alta de vehículo</p>
            <h2 id="create-vehicle-title">Publicar vehículo</h2>
            <p>
              La publicación se asociará automáticamente a{" "}
              <strong>{dealer?.commercialName}</strong>.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
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
            {/* Quality guide panel */}
            <div className="vehicle-create-quality">
              <div className="vehicle-create-quality__head">
                <div>
                  <strong>Publicación de calidad</strong>
                  <p>Completá fotos, datos y descripción para que el comprador entienda mejor el vehículo.</p>
                </div>
                <button
                  type="button"
                  className="vehicle-create-quality__toggle"
                  onClick={() => setCreateGuideOpen((v) => !v)}
                  aria-expanded={createGuideOpen}
                >
                  {createGuideOpen ? "Ocultar" : "Ver guía"}
                </button>
              </div>

              {createGuideOpen && (
                <>
                  <div className="vehicle-create-quality__grid">
                    <div className="vehicle-create-quality__card">
                      <strong>Fotos</strong>
                      <ul>
                        <li>Mínimo {MIN_VEHICLE_IMAGES} para publicar</li>
                        <li>Recomendado: 8 o más</li>
                        <li>Exterior, interior, tablero/km</li>
                        <li>Detalles y zonas visibles</li>
                      </ul>
                    </div>
                    <div className="vehicle-create-quality__card">
                      <strong>Datos clave</strong>
                      <ul>
                        <li>Marca, modelo, versión, año, km</li>
                        <li>Precio y referencia de mercado</li>
                        <li>Ubicación y datos técnicos</li>
                      </ul>
                    </div>
                    <div className="vehicle-create-quality__card">
                      <strong>Descripción útil</strong>
                      <ul>
                        <li>Estado general visible</li>
                        <li>Detalles e imperfecciones</li>
                        <li>Condiciones de entrega</li>
                        <li>Aclaraciones importantes</li>
                      </ul>
                    </div>
                  </div>

                  <div className="vehicle-create-quality__summary">
                    <span className={`vehicle-create-quality__meter vehicle-create-quality__meter--${photoStatusBand}`}>
                      Fotos: {photoCount}/{MAX_VEHICLE_IMAGES} · {photoStatusMsg}
                    </span>
                    <span className="vehicle-create-quality__desc-meter">
                      Descripción: {createDescLen} caracteres · recomendado: 150+
                    </span>
                  </div>

                  <p className="vehicle-create-quality__note">
                    La información cargada es declarada por el vendedor y debe corresponder al estado real del vehículo.
                  </p>
                </>
              )}
            </div>

            {dealerVehicles.length > 0 && (
              <div className="create-vehicle-prefill">
                <label>
                  Completar desde publicación anterior
                  <select
                    value={prefillSource}
                    onChange={(e) => applyPrefill(e.target.value)}
                  >
                    <option value="">— Elegí un vehículo para precargar datos —</option>
                    {dealerVehicles.map((v) => (
                      <option key={v.vehicle_id} value={String(v.vehicle_id)}>
                        {v.brand} {v.model} {v.version || ""} · {v.year}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">
                    Precarga marca, modelo, versión, ubicación, financiación y datos de mantenimiento. El precio, km e imágenes se completan manualmente.
                  </span>
                </label>
              </div>
            )}

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
                  inputMode="numeric"
                  min="0"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="Ej: 19300000"
                />
              </label>

              <label>
                Referencia mercado
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
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
                  inputMode="numeric"
                  min="0"
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
                  inputMode="numeric"
                  min="0"
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
                  inputMode="numeric"
                  min="0"
                  value={form.months}
                  onChange={(event) => updateField("months", event.target.value)}
                  placeholder="Ej: 36"
                />
              </label>

              <label>
                Tasa anual
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={form.rate}
                  onChange={(event) => updateField("rate", event.target.value)}
                  placeholder="Ej: 42"
                />
                <span className="form-hint">
                  No uses el precio principal para cargar solo una entrada o anticipo. Ejemplo: precio total del vehículo + entrada $500.000 + 48 cuotas. La financiación debe cargarse como dato complementario, no reemplaza el precio real del vehículo.
                </span>
              </label>
            </div>

            <div className="vehicle-create-quality__block">
              <label className="contraoferta-toggle-label">
                <input
                  type="checkbox"
                  checked={form.contraoferta_habilitada}
                  onChange={(e) => updateField("contraoferta_habilitada", e.target.checked)}
                />
                Habilitar contraoferta en esta publicación
              </label>

              {form.contraoferta_habilitada && (
                <div className="contraoferta-range-fields">
                  <label>
                    Precio mínimo aceptable <span className="form-hint--inline">(privado, no visible al comprador)</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={form.precio_min_contraoferta}
                      onChange={(e) => updateField("precio_min_contraoferta", e.target.value)}
                      placeholder="Ej: 22000000"
                    />
                  </label>
                  <label>
                    Precio máximo de referencia <span className="form-hint--inline">(privado)</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={form.precio_max_contraoferta}
                      onChange={(e) => updateField("precio_max_contraoferta", e.target.value)}
                      placeholder="Ej: 25000000"
                    />
                  </label>
                </div>
              )}
            </div>

            <label>
              Imágenes del vehículo
              <span className="dealer-file-zone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleImagesChange}
                  className="dealer-file-input"
                />
                <span className="dealer-file-zone__inner">
                  <span className="dealer-file-zone__icon" aria-hidden="true">↑</span>
                  <strong>
                    {imageFiles.length > 0
                      ? `${imageFiles.length} imagen${imageFiles.length !== 1 ? "es" : ""} seleccionada${imageFiles.length !== 1 ? "s" : ""}`
                      : "Seleccionar imágenes"}
                  </strong>
                  <span>PNG, JPG o WEBP · mín. {MIN_VEHICLE_IMAGES} · La primera imagen será la portada.</span>
                </span>
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

            <div className="modal-form-section">
              <p className="eyebrow">Mantenimiento orientativo</p>
              <p className="form-hint">
                Estos datos son opcionales y serán mostrados como información orientativa declarada por el vendedor.
                oX NEXMOV no calcula ni garantiza estos importes.
              </p>

              <div className="dealer-toggle-row">
                <div className="dealer-toggle-row__content">
                  <strong>Mostrar mantenimiento orientativo en el detalle del vehículo</strong>
                  <span>Estos datos son informativos y declarados por el vendedor.</span>
                </div>
                <label className="dealer-toggle">
                  <input
                    type="checkbox"
                    checked={form.show_maintenance_info}
                    onChange={(event) => updateField("show_maintenance_info", event.target.checked)}
                    aria-label="Mostrar mantenimiento orientativo en el detalle del vehículo"
                  />
                  <span className="dealer-toggle__track" aria-hidden="true" />
                </label>
              </div>

              <div className="form-grid-two">
                <label>
                  Seguro mensual informado
                  <input
                    type="number"
                    value={form.insurance_monthly_amount}
                    onChange={(event) => updateField("insurance_monthly_amount", event.target.value)}
                    placeholder="Ej: 45000"
                  />
                </label>

                <label>
                  Proveedor del seguro
                  <input
                    value={form.insurance_provider}
                    onChange={(event) => updateField("insurance_provider", event.target.value)}
                    placeholder="Ej: MAPFRE"
                  />
                </label>

                <label>
                  Tipo de cobertura
                  <input
                    value={form.insurance_coverage_type}
                    onChange={(event) => updateField("insurance_coverage_type", event.target.value)}
                    placeholder="Ej: Todo riesgo"
                  />
                </label>

                <label>
                  Consumo estimado (L/100km)
                  <input
                    type="number"
                    value={form.fuel_consumption}
                    onChange={(event) => updateField("fuel_consumption", event.target.value)}
                    placeholder="Ej: 8.5"
                  />
                </label>

                <label>
                  Litros del tanque
                  <input
                    type="number"
                    value={form.fuel_tank_liters}
                    onChange={(event) => updateField("fuel_tank_liters", event.target.value)}
                    placeholder="Ej: 50"
                  />
                </label>

                <label>
                  Costo tanque lleno informado
                  <input
                    type="number"
                    value={form.fuel_full_tank_cost}
                    onChange={(event) => updateField("fuel_full_tank_cost", event.target.value)}
                    placeholder="Ej: 110000"
                  />
                </label>

                <label>
                  Patente informada
                  <input
                    type="number"
                    value={form.patent_cost}
                    onChange={(event) => updateField("patent_cost", event.target.value)}
                    placeholder="Ej: 28000"
                  />
                </label>

                <label>
                  Service aproximado
                  <input
                    type="number"
                    value={form.estimated_service_cost}
                    onChange={(event) => updateField("estimated_service_cost", event.target.value)}
                    placeholder="Ej: 85000"
                  />
                </label>

                <label>
                  Mantenimiento mensual orientativo
                  <input
                    type="number"
                    value={form.estimated_monthly_maintenance}
                    onChange={(event) => updateField("estimated_monthly_maintenance", event.target.value)}
                    placeholder="Ej: 55000"
                  />
                </label>

                <label>
                  Fecha de actualización del dato
                  <input
                    type="date"
                    value={form.maintenance_updated_at}
                    onChange={(event) => updateField("maintenance_updated_at", event.target.value)}
                  />
                </label>
              </div>

              <label>
                Detalle / aclaración de mantenimiento
                <textarea
                  value={form.maintenance_notes}
                  onChange={(event) => updateField("maintenance_notes", event.target.value)}
                  rows={3}
                  placeholder="Aclaraciones sobre los datos informados, condiciones de cobertura, etc."
                />
              </label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <p className="dealer-legal-note">
              Declaro que la información publicada sobre vehículos, precios,
              disponibilidad, documentación y financiación es real, actualizada
              y bajo mi responsabilidad comercial.
            </p>

            <div className="dealer-modal-footer">
              <button
                type="button"
                className="table-action-btn"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                className="primary-action"
                type="submit"
                disabled={submitting || !canCreateVehicle}
              >
                {submitting ? "Publicando..." : "Publicar vehículo"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body
  );
}
