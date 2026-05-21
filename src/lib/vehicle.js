function resolveImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return image.trim();
  return (
    image.url ||
    image.publicUrl ||
    image.src ||
    image.imageUrl ||
    image.image_url ||
    image.thumbnail ||
    image.thumbnailUrl ||
    ""
  );
}

function addCollectionToImages(value, results, seen, namePrefix) {
  if (!value) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        addCollectionToImages(JSON.parse(trimmed), results, seen, namePrefix);
        return;
      } catch {
        // fall through to treat as plain url
      }
    }
    addSingleToImages(trimmed, null, results, seen, namePrefix);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      addSingleToImages(item, null, results, seen, `${namePrefix} ${i + 1}`)
    );
    return;
  }

  addSingleToImages(value, null, results, seen, namePrefix);
}

function addSingleToImages(raw, explicitName, results, seen, fallbackName) {
  const url = String(resolveImageUrl(raw) || "").trim();
  if (!url || seen.has(url)) return;
  seen.add(url);
  const name =
    explicitName ||
    (typeof raw === "object" && raw !== null
      ? raw.name || raw.alt || fallbackName || `Imagen ${results.length + 1}`
      : fallbackName || `Imagen ${results.length + 1}`);
  results.push({ url, name });
}

export function getVehicleImages(vehicle) {
  if (!vehicle) return [];

  const results = [];
  const seen = new Set();

  const add = (raw, name) => addSingleToImages(raw, name, results, seen, name);
  const addCol = (value, prefix) => addCollectionToImages(value, results, seen, prefix);

  add(vehicle.mainImageUrl, "Portada");
  add(vehicle.main_image_url, "Portada");
  add(vehicle.coverImage, "Portada");
  add(vehicle.cover_image, "Portada");
  add(vehicle.imageUrl, "Imagen principal");
  add(vehicle.image_url, "Imagen principal");
  add(vehicle.image, "Imagen principal");
  add(vehicle.thumbnail, "Miniatura");

  addCol(vehicle.images, "Imagen");
  addCol(vehicle.images_json, "Imagen");
  addCol(vehicle.imageUrls, "Imagen");
  addCol(vehicle.image_urls, "Imagen");
  addCol(vehicle.photos, "Foto");

  add(vehicle.raw?.main_image_url, "Portada");
  add(vehicle.raw?.cover_image, "Portada");
  add(vehicle.raw?.image_url, "Imagen principal");
  add(vehicle.raw?.image, "Imagen principal");
  add(vehicle.raw?.thumbnail, "Miniatura");
  addCol(vehicle.raw?.images_json, "Imagen");
  addCol(vehicle.raw?.images, "Imagen");
  addCol(vehicle.raw?.image_urls, "Imagen");
  addCol(vehicle.raw?.photos, "Foto");

  return results.slice(0, 12);
}

export function getVehicleImageUrl(vehicle) {
  return getVehicleImages(vehicle)[0]?.url || "";
}

export function isVehicleReserved(vehicle) {
  return (
    vehicle?.reserved === true ||
    vehicle?.status === "reserved" ||
    vehicle?.publicationStatus === "reserved" ||
    vehicle?.raw?.reserved === true ||
    vehicle?.raw?.publication_status === "reserved" ||
    vehicle?.raw?.status === "reserved"
  );
}

export function getVehicleTitle(vehicle) {
  return (
    [vehicle?.brand || vehicle?.make, vehicle?.model]
      .filter(Boolean)
      .join(" ") || "Vehículo disponible"
  );
}

export function getLocationLabel(vehicle) {
  if (vehicle?.location) return vehicle.location;

  const city = String(vehicle?.city || vehicle?.raw?.city || "").trim();
  const province = String(
    vehicle?.province || vehicle?.raw?.province || ""
  ).trim();

  if (city && province) return `${city}, ${province}`;
  if (city) return city;
  if (province) return province;

  return "Ubicación a confirmar";
}

export function getVehicleStatus(vehicle) {
  if (isVehicleReserved(vehicle)) return "Reservado";
  if (vehicle?.status === "paused") return "Pausado";
  if (vehicle?.publicationStatus === "paused_by_system")
    return "Pausado por sistema";
  return "Activo";
}

export function getVehicleKey(vehicle, index = 0) {
  return (
    vehicle?.id ||
    vehicle?.vehicle_id ||
    vehicle?.slug ||
    `${vehicle?.brand || vehicle?.make || "vehicle"}-${vehicle?.model || index}`
  );
}
