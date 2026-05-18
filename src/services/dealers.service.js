import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { normalizeWhatsAppArgentina } from "../lib/formatters.js";

const DEALER_IMAGES_BUCKET = "vehicle-images";
const MAX_DEALER_LOGO_BYTES = 3 * 1024 * 1024;
const ALLOWED_DEALER_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_DEALER_LOGO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function sanitizeFileName(name) {
  return String(name || "imagen")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function getFileExtension(name) {
  const parts = String(name || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function getDaysUntil(dateValue) {
  if (!dateValue) return 30;

  const target = new Date(dateValue).getTime();
  const now = Date.now();

  if (!Number.isFinite(target)) return 30;

  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function normalizePlan(planCode) {
  const value = String(planCode || "inicio").trim().toLowerCase();

  if (["inicio", "pro", "elite", "platinum"].includes(value)) {
    return value;
  }

  return "inicio";
}

function normalizePlanStatus(status) {
  return String(status || "active").trim().toLowerCase();
}

function mapDealerFromSupabase(row) {
  const plan = normalizePlan(row.plan_code);
  const publicationsUsed = Number(row.publications_used || 0);

  return {
    id: String(row.id),
    profileId: row.profile_id || null,

    commercialName: row.name || "Dealer sin nombre",
    name: row.name || "Dealer sin nombre",
    slug: row.slug || "",

    plan,
    planCode: plan,
    planStatus: normalizePlanStatus(row.plan_status),

    province: row.province || "",
    city: row.city || "",

    logo: row.logo_url || row.image_url || null,
    phone: normalizeWhatsAppArgentina(row.phone_whatsapp || row.contact_phone),
    phoneWhatsapp: normalizeWhatsAppArgentina(
      row.phone_whatsapp || row.contact_phone
    ),
    contactPhone: row.contact_phone || "",

    isActive: row.is_active !== false,

    benefits: {
      sellVehicleLeads: Boolean(row.can_receive_sell_vehicle_leads),
      extraPublicationQuota: Number(row.extra_publish_slots || 0),
      intelligence: ["elite", "platinum"].includes(plan),
    },

    currentPeriod: {
      publicationsUsed,
      expiresInDays: getDaysUntil(row.plan_expires_at),
    },

    raw: row,
  };
}

export async function listDealersForCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealers: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      dealers: [],
      error: userError,
    };
  }

  if (!user?.id) {
    return {
      dealers: [],
      error: {
        message: "No hay usuario autenticado.",
      },
    };
  }

  const { data, error } = await supabase
    .from("dealers")
    .select(
      `
      id,
      profile_id,
      name,
      slug,
      plan_code,
      plan_status,
      publications_used,
      extra_publish_slots,
      plan_expires_at,
      province,
      city,
      logo_url,
      image_url,
      contact_phone,
      phone_whatsapp,
      can_receive_sell_vehicle_leads,
      is_active
    `
    )
    .eq("profile_id", user.id)
    .order("id", { ascending: true });

  if (error) {
    return {
      dealers: [],
      error,
    };
  }

  return {
    dealers: (data || []).map(mapDealerFromSupabase),
    error: null,
  };
}

export async function uploadCurrentDealerLogo({ dealerId, file }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        message: "Supabase no estÃ¡ configurado.",
      },
    };
  }

  const resolvedDealerId = String(dealerId || "").trim();
  const numericDealerId = Number(resolvedDealerId);

  if (!resolvedDealerId || !Number.isFinite(numericDealerId)) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        code: "dealer_id_missing",
        message: "No pudimos identificar tu perfil comercial.",
      },
    };
  }

  if (!file) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        code: "file_missing",
        message: "SeleccionÃ¡ una imagen institucional para subir.",
      },
    };
  }

  const extension = getFileExtension(file.name);
  const isAllowedType = ALLOWED_DEALER_LOGO_TYPES.has(file.type);
  const isAllowedExtension = ALLOWED_DEALER_LOGO_EXTENSIONS.has(extension);

  if (!isAllowedType || !isAllowedExtension) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        code: "invalid_file_type",
        message: "UsÃ¡ una imagen JPG, PNG o WebP.",
      },
    };
  }

  if (file.size > MAX_DEALER_LOGO_BYTES) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        code: "file_too_large",
        message: "La imagen no puede superar los 3 MB.",
      },
    };
  }

  const safeName = sanitizeFileName(file.name);
  const path = `dealers/${resolvedDealerId}/institutional/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DEALER_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return {
      dealer: null,
      logoUrl: null,
      error: uploadError,
    };
  }

  const { data: publicData } = supabase.storage
    .from(DEALER_IMAGES_BUCKET)
    .getPublicUrl(path);

  const logoUrl = publicData?.publicUrl || null;

  if (!logoUrl) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        code: "public_url_missing",
        message: "No se pudo obtener la URL pÃºblica de la imagen.",
      },
    };
  }

  const { data, error } = await supabase.rpc("update_current_dealer_logo", {
    p_dealer_id: numericDealerId,
    p_logo_url: logoUrl,
  });

  if (error) {
    return {
      dealer: null,
      logoUrl: null,
      error,
    };
  }

  return {
    dealer: Array.isArray(data) ? data[0] : data || null,
    logoUrl,
    error: null,
  };
}

export async function updateDealerWhatsappById(dealerId, normalizedWhatsapp) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const resolvedDealerId = String(dealerId || "").trim();

  if (!resolvedDealerId) {
    return {
      dealer: null,
      error: {
        code: "dealer_id_missing",
        message: "No pudimos identificar tu perfil comercial.",
      },
    };
  }

  const normalizedValue = normalizeWhatsAppArgentina(normalizedWhatsapp);

  if (!normalizedValue) {
    return {
      dealer: null,
      error: {
        message: "Ingresá un WhatsApp válido con característica.",
      },
    };
  }

  // Verificar que el usuario esté autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      dealer: null,
      error: {
        code: "auth_required",
        message: "Necesitás estar autenticado para actualizar el WhatsApp.",
      },
    };
  }

  // Verificar que el dealer existe y pertenece al usuario autenticado
  const { data: existingDealer, error: checkError } = await supabase
    .from("dealers")
    .select("id, profile_id, contact_phone, phone_whatsapp")
    .eq("id", resolvedDealerId)
    .eq("profile_id", user.id)
    .single();

  if (checkError) {
    console.log("[updateDealerWhatsapp] ownership check error:", checkError);
    return {
      dealer: null,
      error: {
        code: "dealer_not_found_or_not_owned",
        message: "No pudimos actualizar el WhatsApp. Intentá nuevamente.",
      },
    };
  }

  if (!existingDealer) {
    console.log("[updateDealerWhatsapp] dealer not found or not owned by user");
    return {
      dealer: null,
      error: {
        code: "dealer_not_found_or_not_owned",
        message: "No pudimos actualizar el WhatsApp. Intentá nuevamente.",
      },
    };
  }

  console.log("[updateDealerWhatsapp] payload:", {
    dealerId,
    resolvedDealerId,
    normalizedWhatsapp,
    normalizedValue,
    userId: user.id,
    existingDealerProfileId: existingDealer.profile_id
  });

  const { count, error } = await supabase
    .from("dealers")
    .update(
      {
        contact_phone: normalizedValue,
        phone_whatsapp: normalizedValue,
        updated_at: new Date().toISOString(),
      },
      { count: "exact" }
    )
    .eq("id", resolvedDealerId)
    .eq("profile_id", user.id); // Verificación adicional de ownership

  console.log("[updateDealerWhatsapp] result:", {
    data: null, // no mostrar data sensible
    error,
    count,
    status: null,
    statusText: null
  });

  if (error) {
    console.log("[updateDealerWhatsapp] update error:", error);
    return {
      dealer: null,
      error: {
        code: "update_error",
        message: "No pudimos actualizar el WhatsApp. Intentá nuevamente.",
      },
    };
  }

  if (count === 0) {
    console.log("[updateDealerWhatsapp] count = 0, dealer not updated");
    return {
      dealer: null,
      error: {
        code: "dealer_not_updated",
        message: "No pudimos actualizar el WhatsApp. Intentá nuevamente.",
      },
    };
  }

  const { data: refreshedDealers, error: refreshError } = await supabase
    .from("dealers")
    .select(
      `
      id,
      profile_id,
      name,
      slug,
      plan_code,
      plan_status,
      publications_used,
      extra_publish_slots,
      plan_expires_at,
      province,
      city,
      logo_url,
      image_url,
      contact_phone,
      phone_whatsapp,
      can_receive_sell_vehicle_leads,
      is_active
    `
    )
    .eq("id", resolvedDealerId)
    .limit(1);

  if (refreshError) {
    return {
      dealer: null,
      error: {
        message: "No pudimos actualizar el WhatsApp. Intentá nuevamente.",
      },
    };
  }

  const updatedDealer = Array.isArray(refreshedDealers)
    ? refreshedDealers[0]
    : null;

  return {
    dealer: updatedDealer
      ? mapDealerFromSupabase(updatedDealer)
      : {
          id: resolvedDealerId,
          phone: normalizedValue,
          phoneWhatsapp: normalizedValue,
          contactPhone: normalizedValue,
        },
    error: null,
  };
}

export async function updateDealerContactForCurrentUser({
  dealerId,
  whatsapp,
}) {
  const normalizedWhatsapp = normalizeWhatsAppArgentina(whatsapp);
  return updateDealerWhatsappById(dealerId, normalizedWhatsapp);
}
export async function listAllDealersForAdmin() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealers: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("list_dealers_for_admin");

  if (error) {
    return {
      dealers: [],
      error,
    };
  }

  return {
    dealers: (data || []).map(mapDealerFromSupabase),
    error: null,
  };
}


// Alias necesario porque AdminPanel.jsx importa este nombre.
export const listDealersForAdmin = listAllDealersForAdmin;
export async function listPublicActiveDealers() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealers: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("get_public_active_dealers");

  if (error) {
    return {
      dealers: [],
      error,
    };
  }

  return {
    dealers: (data || []).map((row) => ({
      id: String(row.dealer_id),
      commercialName: row.commercial_name || "Dealer sin nombre",
      city: row.city || "",
      province: row.province || "",
      logo: row.logo_url || null,
      plan: row.plan_code || "inicio",
      phone: normalizeWhatsAppArgentina(
        row.phone_whatsapp || row.contact_phone || row.dealer_phone
      ),
      phoneWhatsapp: normalizeWhatsAppArgentina(
        row.phone_whatsapp || row.contact_phone || row.dealer_phone
      ),
      contactPhone: row.contact_phone || row.dealer_phone || "",
      activeVehiclesCount: Number(row.active_vehicles_count || 0),
    })),
    error: null,
  };
}
