import { useEffect, useMemo, useState } from "react";

import { updateAdminVehicleData } from "../services/adminVehicles.service.js";
import { updateCurrentDealerVehicleData } from "../services/dealerVehicles.service.js";
import { MIN_VEHICLE_IMAGES } from "../config/constants.js";
import {
  buildCatalogTree,
  listVehicleCatalog,
} from "../services/catalog.service.js";

function getInitialForm(vehicle) {
  return {
    vehicleId: vehicle?.vehicle_id,
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    version: vehicle?.version || "",
    year: vehicle?.year || "",
    price: vehicle?.price || "",
    km: vehicle?.km || "",
    bodyType: vehicle?.body_type || "",
    transmission: vehicle?.transmission || "",
    fuelType: vehicle?.fuel_type || "",
    province: vehicle?.province || "",
    city: vehicle?.city || "",
    marketReferencePrice: vehicle?.market_reference_price || "",
    financing: Boolean(vehicle?.financing),
    delivery: vehicle?.delivery || "",
    months: vehicle?.months || "",
    rate: vehicle?.rate || "",
    details: vehicle?.details || "",
    forceApprove: false,
  };
}

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

function getImageCount(vehicle) {
  const urls = new Set();
  let sawImageField = false;

  function addUrl(value) {
    const url = String(value || "").trim();
    if (url) urls.add(url);
  }

  [vehicle?.main_image_url, vehicle?.mainImageUrl, vehicle?.imageUrl].forEach(
    (value) => {
      if (value !== undefined) sawImageField = true;
      addUrl(value);
    }
  );

  [vehicle?.images, vehicle?.images_json, vehicle?.raw?.images_json].forEach(
    (source) => {
      if (source !== undefined) sawImageField = true;
      if (!Array.isArray(source)) return;

      source.forEach((image) => {
        if (typeof image === "string") {
          addUrl(image);
          return;
        }

        addUrl(image?.url || image?.publicUrl || image?.src);
      });
    }
  );

  return sawImageField ? urls.size : null;
}

function isVehicleActive(vehicle) {
  return (
    vehicle?.is_active === true ||
    vehicle?.active === true ||
    vehicle?.publication_status === "active" ||
    vehicle?.publicationStatus === "active" ||
    vehicle?.status === "active"
  );
}

function validateVehicleEditForm(form, { imageCount, requireImages }) {
  const errors = [];
  const year = getNumber(form.year);
  const km = getNumber(form.km);
  const price = getNumber(form.price);
  const reference = getNumber(form.marketReferencePrice);
  const delivery = getNumber(form.delivery);

  if (isBlankOrPlaceholder(form.brand)) errors.push("Ingresá la marca.");
  if (isBlankOrPlaceholder(form.model)) errors.push("Ingresá el modelo.");
  if (isBlankOrPlaceholder(form.version)) errors.push("Ingresá la versión.");

  if (!year || year < 1950 || year > CURRENT_YEAR + 1) {
    errors.push("Ingresá un año válido.");
  }

  if (km === null || km < 0) errors.push("Ingresá kilometraje válido.");
  if (!price || price <= 0) {
    errors.push("Ingresá el precio real total del vehículo.");
  }

  if (price && reference && reference > 0 && price < reference * 0.4) {
    errors.push(
      "El precio publicado parece demasiado bajo respecto de la referencia."
    );
  }

  if (price && delivery && delivery > 0 && price <= delivery) {
    errors.push("El precio principal debe ser mayor que la entrega o anticipo.");
  }

  if (isBlankOrPlaceholder(form.province) || isBlankOrPlaceholder(form.city)) {
    errors.push("Completá provincia y ciudad.");
  }

  if (isBlankOrPlaceholder(form.bodyType)) errors.push("Seleccioná carrocería.");
  if (isBlankOrPlaceholder(form.transmission)) {
    errors.push("Seleccioná transmisión.");
  }
  if (isBlankOrPlaceholder(form.fuelType)) errors.push("Seleccioná combustible.");

  if (String(form.details || "").trim().length < 10) {
    errors.push("Agregá detalles claros del estado y condiciones.");
  }

  if (requireImages && imageCount !== null && imageCount < MIN_VEHICLE_IMAGES) {
    errors.push(
      `Para mantenerla activa necesitás al menos ${MIN_VEHICLE_IMAGES} fotos.`
    );
  }

  return errors;
}

function findByName(items = [], value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) return null;

  return (
    items.find((item) => normalizeText(item.name) === normalizedValue) || null
  );
}

export default function EditVehicleModal({
  vehicle,
  mode = "dealer",
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState(() => getInitialForm(vehicle));
  const [submitting, setSubmitting] = useState(false);
  const [savedVehicle, setSavedVehicle] = useState(null);
  const [error, setError] = useState("");

  const [catalogTree, setCatalogTree] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");

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
    setForm((current) => {
      const previousBrand = current.brand;
      const brandChanged = normalizeText(value) !== normalizeText(previousBrand);

      return {
        ...current,
        brand: value,
        model: brandChanged ? "" : current.model,
        version: brandChanged ? "" : current.version,
      };
    });
  }

  function updateModel(value) {
    setForm((current) => {
      const previousModel = current.model;
      const modelChanged = normalizeText(value) !== normalizeText(previousModel);

      return {
        ...current,
        model: value,
        version: modelChanged ? "" : current.version,
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSavedVehicle(null);

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

    if (Number(form.km || 0) < 0) {
      setError("Ingresá kilometraje válido.");
      setSubmitting(false);
      return;
    }

    const imageCount = getImageCount(vehicle);
    const validationErrors = validateVehicleEditForm(form, {
      imageCount,
      requireImages: isVehicleActive(vehicle),
    });

    if (validationErrors.length > 0) {
      if (mode === "admin" && form.forceApprove) {
        const confirmed = window.confirm(
          `Esta publicación tiene datos incompletos o inconsistentes. Si la aprobás, quedará visible para compradores. Confirmá que revisaste la información.\n\n${validationErrors.join("\n")}`
        );

        if (!confirmed) {
          setSubmitting(false);
          return;
        }
      } else {
        setError(
          `Los cambios dejan la publicación incompleta. ${validationErrors.join(" ")}`
        );
        setSubmitting(false);
        return;
      }
    }

    const result =
      mode === "admin"
        ? await updateAdminVehicleData(form)
        : await updateCurrentDealerVehicleData(form);

    if (result.error) {
      setError(result.error.message || "No se pudo editar la publicación.");
      setSubmitting(false);
      return;
    }

    setSavedVehicle(result.vehicle);
    setSubmitting(false);

    if (onUpdated) {
      await onUpdated();
    }
  }

  if (!vehicle) return null;

  return (
    <div className="modal-backdrop">
      <section className="ticket-detail-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Editar publicación</p>
            <h2>
              {vehicle.brand} {vehicle.model}
            </h2>
            <p>
              Modificá datos principales, precio, referencia, ubicación,
              financiación y detalles.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {savedVehicle ? (
          <div className="lead-created-box">
            <h3>Publicación actualizada</h3>
            <p>Los cambios fueron guardados correctamente.</p>

            <div className="contact-summary">
              <span>Estado</span>
              <strong>{savedVehicle.publication_status}</strong>
              <span>Revisión: {savedVehicle.review_status}</span>
            </div>

            <button className="primary-action" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form className="zero-km-form" onSubmit={handleSubmit}>
            {catalogError && <div className="auth-warning">{catalogError}</div>}

            {loadingCatalog && (
              <div className="auth-message">
                Cargando catálogo de marcas, modelos y versiones...
              </div>
            )}

            <div className="form-grid-two">
              <label>
                Marca
                <input
                  list="edit-vehicle-brand-options"
                  value={form.brand}
                  onChange={(event) => updateBrand(event.target.value)}
                  placeholder="Ej: Toyota"
                />
                <datalist id="edit-vehicle-brand-options">
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
                  list="edit-vehicle-model-options"
                  value={form.model}
                  onChange={(event) => updateModel(event.target.value)}
                  placeholder={
                    form.brand
                      ? "Ej: Corolla"
                      : "Primero seleccioná una marca"
                  }
                />
                <datalist id="edit-vehicle-model-options">
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
                  list="edit-vehicle-version-options"
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
                <datalist id="edit-vehicle-version-options">
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
                />
              </label>

              <label>
                Precio publicado
                <input
                  type="number"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
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
                />
              </label>

              <label>
                Kilómetros
                <input
                  type="number"
                  value={form.km}
                  onChange={(event) => updateField("km", event.target.value)}
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
                />
              </label>

              <label>
                Ciudad
                <input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
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
                />
              </label>

              <label>
                Cuotas / meses
                <input
                  type="number"
                  value={form.months}
                  onChange={(event) => updateField("months", event.target.value)}
                />
              </label>

              <label>
                Tasa
                <input
                  type="number"
                  value={form.rate}
                  onChange={(event) => updateField("rate", event.target.value)}
                />
              </label>

              {mode === "admin" && (
                <label>
                  Aprobación admin
                  <select
                    value={form.forceApprove ? "yes" : "no"}
                    onChange={(event) =>
                      updateField("forceApprove", event.target.value === "yes")
                    }
                  >
                    <option value="no">Respetar validaciones</option>
                    <option value="yes">Forzar aprobación y activar</option>
                  </select>
                </label>
              )}
            </div>

            <label>
              Detalles / aclaraciones
              <textarea
                value={form.details}
                onChange={(event) => updateField("details", event.target.value)}
                rows={5}
                placeholder="Estado general, detalles comerciales, financiación, observaciones."
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <p className="dealer-legal-note">
              Declaro que la información actualizada sobre el vehículo, precio,
              disponibilidad, documentación y financiación es real y se
              encuentra bajo mi responsabilidad comercial.
            </p>

            <button
              className="primary-action"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Guardando cambios..." : "Guardar cambios"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
