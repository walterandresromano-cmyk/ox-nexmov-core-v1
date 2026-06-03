import { useMemo, useState } from "react";

import {
  updateAdminVehicleImages,
  updateCurrentDealerVehicleImages,
  uploadVehicleImages,
} from "../services/publish.service.js";
import { MAX_VEHICLE_IMAGES, MIN_VEHICLE_IMAGES } from "../config/constants.js";

function getInitialImages(vehicle) {
  const images = [];

  if (vehicle?.main_image_url) {
    images.push({
      url: vehicle.main_image_url,
      name: "Portada",
    });
  }

  if (vehicle?.mainImageUrl) {
    images.push({
      url: vehicle.mainImageUrl,
      name: "Portada",
    });
  }

  if (vehicle?.imageUrl) {
    images.push({
      url: vehicle.imageUrl,
      name: "Imagen principal",
    });
  }

  const imageSources = [
    vehicle?.images,
    vehicle?.images_json,
    vehicle?.raw?.images_json,
  ];

  imageSources.forEach((source) => {
    if (!Array.isArray(source)) return;

    source.forEach((image, index) => {
      const url =
        typeof image === "string"
          ? image
          : image?.url || image?.publicUrl || image?.src || "";

      if (url && !images.some((item) => item.url === url)) {
        images.push({
          url,
          path: image?.path || null,
          name: image?.name || `Imagen ${index + 1}`,
          size: image?.size || null,
          type: image?.type || null,
        });
      }
    });
  });

  return images.slice(0, 12);
}

const IDEAL_PHOTOS = 8;

const PHOTO_GUIDE_GROUPS = [
  {
    label: "Exterior",
    items: [
      "Frente completo",
      "Lateral derecho",
      "Lateral izquierdo",
      "Parte trasera",
    ],
  },
  {
    label: "Interior",
    items: [
      "Tablero y kilometraje",
      "Butacas delanteras",
      "Asientos traseros",
      "Baúl",
    ],
  },
  {
    label: "Confianza",
    items: [
      "Motor",
      "Cubiertas",
      "Detalles o imperfecciones visibles",
      "Documentación o accesorios (sin datos sensibles)",
    ],
  },
];

export default function EditVehicleImagesModal({
  vehicle,
  mode = "dealer",
  onClose,
  onUpdated,
}) {
  const initialImages = useMemo(() => getInitialImages(vehicle), [vehicle]);
  const [images, setImages] = useState(initialImages);
  const [newFiles, setNewFiles] = useState([]);
  const [mainImageUrl, setMainImageUrl] = useState(
    vehicle?.main_image_url ||
      vehicle?.mainImageUrl ||
      vehicle?.imageUrl ||
      initialImages[0]?.url ||
      ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);

  if (!vehicle) return null;

  const vehicleId = vehicle.vehicle_id || vehicle.id;
  const totalPhotos = Math.min(images.length + newFiles.length, MAX_VEHICLE_IMAGES);
  const hasIdealPhotos = totalPhotos >= IDEAL_PHOTOS;

  function handleFilesChange(event) {
    const files = Array.from(event.target.files || []);
    const availableSlots = Math.max(MAX_VEHICLE_IMAGES - images.length, 0);

    if (files.length > availableSlots) {
      setError(`Solo podés agregar ${availableSlots} imagen/es más.`);
      setNewFiles(files.slice(0, availableSlots));
      return;
    }

    setError("");
    setNewFiles(files);
  }

  function removeImage(url) {
    const nextImages = images.filter((image) => image.url !== url);
    setImages(nextImages);

    if (mainImageUrl === url) {
      setMainImageUrl(nextImages[0]?.url || "");
    }
  }

  function setAsMain(url) {
    setMainImageUrl(url);

    setImages((current) => {
      const selected = current.find((image) => image.url === url);
      const others = current.filter((image) => image.url !== url);

      return selected ? [selected, ...others] : current;
    });
  }

  async function handleSave() {
    setSubmitting(true);
    setSaved(false);
    setError("");

    let uploadedImages = [];

    if (newFiles.length > 0) {
      const { images: uploaded, error: uploadError } =
        await uploadVehicleImages({
          vehicleId,
          files: newFiles,
        });

      if (uploadError) {
        setError(uploadError.message || "No se pudieron subir las imágenes.");
        setSubmitting(false);
        return;
      }

      uploadedImages = uploaded;
    }

    const mergedImages = [...images, ...uploadedImages].slice(0, MAX_VEHICLE_IMAGES);

    const finalMainImageUrl =
      mainImageUrl || uploadedImages[0]?.url || mergedImages[0]?.url || "";

    const finalImages = mergedImages.some(
      (image) => image.url === finalMainImageUrl
    )
      ? [
          ...mergedImages.filter((image) => image.url === finalMainImageUrl),
          ...mergedImages.filter((image) => image.url !== finalMainImageUrl),
        ]
      : mergedImages;

    const result =
      mode === "admin"
        ? await updateAdminVehicleImages({
            vehicleId,
            images: finalImages,
            mainImageUrl: finalMainImageUrl,
          })
        : await updateCurrentDealerVehicleImages({
            vehicleId,
            images: finalImages,
            mainImageUrl: finalMainImageUrl,
          });

    if (result.error) {
      setError(result.error.message || "No se pudieron guardar las imágenes.");
      setSubmitting(false);
      return;
    }

    setImages(finalImages);
    setNewFiles([]);
    setSaved(true);
    setSubmitting(false);

    if (onUpdated) {
      await onUpdated();
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="ticket-detail-modal edit-images-modal">
        <div className="contact-modal-head">
          <div>
            <p className="eyebrow">Editar imágenes</p>
            <h2>
              {vehicle.brand} {vehicle.model}
            </h2>
            <p>
              Agregá, eliminá o elegí portada. Mínimo {MIN_VEHICLE_IMAGES} fotos
              para publicar activa. Máximo {MAX_VEHICLE_IMAGES} imágenes por
              publicación.
            </p>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Photo quality guide */}
        <div className="vehicle-photo-guide">
          <div className="vehicle-photo-guide__head">
            <div>
              <strong>Guía de fotos recomendadas</strong>
              <p>Mejorá la confianza de la publicación mostrando el vehículo de forma clara y completa.</p>
            </div>
            <button
              type="button"
              className="vehicle-photo-guide__toggle"
              onClick={() => setGuideOpen((v) => !v)}
              aria-expanded={guideOpen}
            >
              {guideOpen ? "Ocultar guía" : "Mostrar guía"}
            </button>
          </div>

          {guideOpen && (
            <>
              <p className="vehicle-photo-guide__summary">
                Fotos cargadas: <strong>{totalPhotos}/{MAX_VEHICLE_IMAGES}</strong>
                {" · "}Ideal recomendado: 8 o más
              </p>

              <div className="vehicle-photo-guide__grid">
                {PHOTO_GUIDE_GROUPS.map((group) => (
                  <div key={group.label} className="vehicle-photo-guide__group">
                    <p className="vehicle-photo-guide__group-title">{group.label}</p>
                    <ul>
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <span className={`vehicle-photo-guide__status vehicle-photo-guide__status--${hasIdealPhotos ? "ok" : "suggest"}`}>
                {hasIdealPhotos
                  ? "Buen nivel visual para la publicación."
                  : "Sumar más fotos puede mejorar la confianza y la cantidad de consultas."}
              </span>

              <p className="vehicle-photo-guide__note">
                Estas fotos ayudan al comprador a entender mejor el estado declarado del vehículo. No reemplazan una inspección técnica.
              </p>
            </>
          )}
        </div>

        <div className="edit-images-current">
          {images.length === 0 ? (
            <div className="empty-state">Esta publicación todavía no tiene imágenes.</div>
          ) : (
            <div className="edit-images-grid">
              {images.map((image) => (
                <article
                  className={`edit-image-card ${
                    image.url === mainImageUrl ? "is-main" : ""
                  }`}
                  key={image.url}
                >
                  <img src={image.url} alt={image.name || "Imagen vehículo"} />

                  <div className="edit-image-actions">
                    <button
                      type="button"
                      onClick={() => setAsMain(image.url)}
                    >
                      {image.url === mainImageUrl ? "Portada" : "Usar portada"}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeImage(image.url)}
                    >
                      Quitar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <label className="edit-images-upload dealer-file-zone">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFilesChange}
            className="dealer-file-input"
          />
          <span className="dealer-file-zone__inner">
            <span className="dealer-file-zone__icon" aria-hidden="true">↑</span>
            <strong>
              {newFiles.length > 0
                ? `${newFiles.length} imagen${newFiles.length !== 1 ? "es" : ""} nueva${newFiles.length !== 1 ? "s" : ""} seleccionada${newFiles.length !== 1 ? "s" : ""}`
                : "Seleccionar imágenes"}
            </strong>
            <span>
              PNG, JPG o WEBP · {Math.max(MAX_VEHICLE_IMAGES - images.length, 0)} disponibles · mín. {MIN_VEHICLE_IMAGES}
            </span>
          </span>
        </label>

        {images.length + newFiles.length < MIN_VEHICLE_IMAGES && (
          <p className="form-legal-note">
            Para publicar un vehículo necesitás al menos {MIN_VEHICLE_IMAGES} fotos.
            Podés guardar la carga y completarla antes de activarla.
          </p>
        )}

        {newFiles.length > 0 && (
          <div className="vehicle-image-preview-grid">
            {newFiles.map((file) => (
              <img
                key={`${file.name}-${file.size}`}
                src={URL.createObjectURL(file)}
                alt={file.name}
              />
            ))}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {saved && (
          <div className="lead-created-box">
            <h3>Imágenes actualizadas</h3>
            <p>La galería y la portada fueron guardadas correctamente.</p>
          </div>
        )}

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
            type="button"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? "Guardando imágenes..." : "Guardar imágenes"}
          </button>
        </div>
      </section>
    </div>
  );
}
