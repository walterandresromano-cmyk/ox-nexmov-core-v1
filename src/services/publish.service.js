import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const VEHICLE_IMAGES_BUCKET = "vehicle-images";
const CURRENT_YEAR = new Date().getFullYear();

function buildValidationError(message) {
  return {
    vehicle: null,
    error: {
      message,
    },
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateVehiclePayload(form) {
  const year = getNumber(form.year);
  const km = getNumber(form.km);
  const price = getNumber(form.price);
  const reference = getNumber(form.marketReferencePrice);
  const delivery = getNumber(form.delivery);

  if (!cleanText(form.brand) || !cleanText(form.model) || !cleanText(form.version)) {
    return "Completá marca, modelo y versión antes de publicar.";
  }

  if (!year || year < 1950 || year > CURRENT_YEAR + 1) {
    return "Ingresá un año válido.";
  }

  if (km === null || km < 0) {
    return "Ingresá el kilometraje.";
  }

  if (!price || price <= 0) {
    return "Ingresá el precio real total del vehículo.";
  }

  if (reference && reference > 0 && price < reference * 0.4) {
    return "El precio publicado parece demasiado bajo respecto de la referencia de mercado.";
  }

  if (delivery && delivery > 0 && price <= delivery) {
    return "El precio principal debe ser mayor que la entrega o anticipo.";
  }

  if (!cleanText(form.province) || !cleanText(form.city)) {
    return "Completá provincia y ciudad.";
  }

  return "";
}

function sanitizeFileName(name) {
  return String(name || "imagen")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function getPublishFriendlyError(error) {
  const text = String(
    (error && (error.message || error.details || error.hint)) || ""
  ).toLowerCase();

  if (/(quota|cupo|limit|publications|publish_limit|publications_used|max vehicles)/.test(text)) {
    return {
      message:
        "No tenés cupo disponible para crear nuevas publicaciones en este período.",
    };
  }

  if (/expired|vencid|plan vencido|plan expired|plan expir|vencimiento/.test(text)) {
    return {
      message:
        "Tu plan comercial venció. Contactá a administración para reactivarlo.",
    };
  }

  if (/suspend|suspendido|suspended/.test(text)) {
    return {
      message:
        "Tu cuenta se encuentra suspendida operativamente. Contactá a administración.",
    };
  }

  if (/no active plan|active plan|plan activo|no detectamos un plan|sin plan|no plan/.test(text)) {
    return {
      message:
        "No detectamos un plan comercial activo. Contactá a administración.",
    };
  }

  return {
    message: "No pudimos crear la publicación. Revisá los datos e intentá nuevamente.",
  };
}

export async function createVehicleForCurrentDealer(form) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicle: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const validationError = validateVehiclePayload(form);

  if (validationError) {
    return buildValidationError(validationError);
  }

  const { data, error } = await supabase.rpc("create_vehicle_for_current_dealer", {
    p_brand: form.brand,
    p_model: form.model,
    p_version: form.version || null,
    p_year: form.year ? Number(form.year) : null,
    p_price: form.price ? Number(form.price) : null,
    p_km: form.km ? Number(form.km) : 0,
    p_body_type: form.bodyType || null,
    p_transmission: form.transmission || null,
    p_fuel_type: form.fuelType || null,
    p_province: form.province || null,
    p_city: form.city || null,
    p_financing: Boolean(form.financing),
    p_delivery: form.delivery ? Number(form.delivery) : 0,
    p_months: form.months ? Number(form.months) : 0,
    p_rate: form.rate ? Number(form.rate) : 0,
    p_market_reference_price: form.marketReferencePrice
      ? Number(form.marketReferencePrice)
      : null,
    p_details: form.details || null,
    p_maintenance_info: form.maintenance_info ?? form.maintenanceInfo ?? null,
    p_show_maintenance_info: Boolean(form.show_maintenance_info ?? form.showMaintenanceInfo ?? false),
  });

  return {
    vehicle: Array.isArray(data) ? data[0] : null,
    error: error ? getPublishFriendlyError(error) : null,
  };
}

export async function uploadVehicleImages({ vehicleId, files }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      images: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  if (!vehicleId) {
    return {
      images: [],
      error: {
        message: "Falta el ID del vehículo.",
      },
    };
  }

  const safeFiles = Array.from(files || []).slice(0, 12);

  if (!safeFiles.length) {
    return {
      images: [],
      error: null,
    };
  }

  const uploadedImages = [];

  for (const file of safeFiles) {
    const safeName = sanitizeFileName(file.name);
    const path = `vehicles/${vehicleId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return {
        images: uploadedImages,
        error: uploadError,
      };
    }

    const { data: publicData } = supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .getPublicUrl(path);

    uploadedImages.push({
      url: publicData.publicUrl,
      path,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }

  return {
    images: uploadedImages,
    error: null,
  };
}

export async function attachImagesToCurrentDealerVehicle({
  vehicleId,
  images,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicle: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const safeImages = Array.from(images || []).slice(0, 12);
  const mainImageUrl = safeImages[0]?.url || null;

  const { data, error } = await supabase.rpc(
    "attach_images_to_current_dealer_vehicle",
    {
      p_vehicle_id: Number(vehicleId),
      p_images_json: safeImages,
      p_main_image_url: mainImageUrl,
    }
  );

  return {
    vehicle: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function updateCurrentDealerVehicleImages({
  vehicleId,
  images,
  mainImageUrl,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicle: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const safeImages = Array.from(images || []).slice(0, 12);
  const safeMainImageUrl = mainImageUrl || safeImages[0]?.url || null;

  const { data, error } = await supabase.rpc(
    "update_current_dealer_vehicle_images",
    {
      p_vehicle_id: Number(vehicleId),
      p_images_json: safeImages,
      p_main_image_url: safeMainImageUrl,
    }
  );

  return {
    vehicle: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function updateAdminVehicleImages({
  vehicleId,
  images,
  mainImageUrl,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicle: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const safeImages = Array.from(images || []).slice(0, 12);
  const safeMainImageUrl = mainImageUrl || safeImages[0]?.url || null;

  const { data, error } = await supabase.rpc("update_admin_vehicle_images", {
    p_vehicle_id: Number(vehicleId),
    p_images_json: safeImages,
    p_main_image_url: safeMainImageUrl,
  });

  return {
    vehicle: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function canDealerPublish({ dealerId }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      allowed: false,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("can_dealer_publish", {
    p_dealer_id: Number(dealerId),
  });

  return {
    allowed: Boolean(data),
    error,
  };
}
