import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const DEALER_IMAGES_BUCKET = "vehicle-images";

function sanitizeFileName(name) {
  return String(name || "imagen")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/* =========================
   GRANT EXTRA SLOTS
========================= */
export async function grantExtraPublishSlots({
  dealerId,
  extraSlots,
  reason = "",
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("grant_extra_publish_slots", {
    p_dealer_id: Number(dealerId),
    p_extra_slots: Number(extraSlots),
    p_reason: reason || null,
  });

  return {
    dealer: Array.isArray(data) ? data[0] : null,
    error,
  };
}

/* =========================
   CREATE DEALER FROM ADMIN
========================= */
export async function createDealerFromAdmin({
  name,
  slug,
  planCode = "inicio",
  province = "",
  city = "",
  contactPhone = "",
  accessEmail = "",
  phoneWhatsapp = "",
  logoUrl = "",
  profileId = null,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const cleanName = String(name || "").trim();

  const cleanSlug =
    String(slug || cleanName)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `dealer-${Date.now()}`;

  const normalizedPlan = ["inicio", "pro", "elite", "platinum"].includes(
    String(planCode || "").toLowerCase()
  )
    ? String(planCode).toLowerCase()
    : "inicio";

  if (!cleanName) {
    return {
      dealer: null,
      error: {
        message: "El nombre comercial del dealer es obligatorio.",
      },
    };
  }

  const { data, error } = await supabase
    .from("dealers")
    .insert({
      access_email: String(accessEmail || "").trim().toLowerCase() || null,
      profile_id: profileId,
      name: cleanName,
      slug: cleanSlug,
      plan_code: normalizedPlan,
      plan_status: "pending_activation",
      province: String(province || "").trim(),
      city: String(city || "").trim(),
      contact_phone: String(contactPhone || "").trim(),
      phone_whatsapp: String(phoneWhatsapp || contactPhone || "").trim(),
      logo_url: String(logoUrl || "").trim() || null,
      is_active: true,
      publications_used: 0,
      extra_publish_slots: 0,
      can_receive_sell_vehicle_leads: ["elite", "platinum"].includes(
        normalizedPlan
      ),
    })
    .select("*")
    .single();

  return {
    dealer: data || null,
    error,
  };
}

/* =========================
   ACTIVATE DEALER FROM ADMIN
========================= */
export async function activateDealerFromAdmin({ dealerId }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("activate_dealer_from_admin", {
    p_dealer_id: Number(dealerId),
  });

  return {
    dealer: Array.isArray(data) ? data[0] : null,
    error,
  };
}

/* =========================
   UPDATE DEALER PLAN FROM ADMIN
========================= */
export async function updateDealerPlanFromAdmin({ dealerId, planCode }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("update_dealer_plan_from_admin", {
    p_dealer_id: Number(dealerId),
    p_plan_code: planCode,
  });

  return {
    dealer: Array.isArray(data) ? data[0] : null,
    error,
  };
}

/* =========================
   SUSPEND DEALER FROM ADMIN
========================= */
export async function suspendDealerFromAdmin({ dealerId, reason = "" }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  if (!dealerId) {
    return {
      dealer: null,
      error: {
        message: "Falta el ID del dealer.",
      },
    };
  }

  const { data, error } = await supabase.rpc("suspend_dealer_from_admin", {
    p_dealer_id: Number(dealerId),
    p_reason: reason || null,
  });

  return {
    dealer: Array.isArray(data) ? data[0] : null,
    error,
  };
}

/* =========================
   UPLOAD DEALER LOGO FROM ADMIN
========================= */
export async function uploadDealerLogoFromAdmin({ dealerId, file }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  if (!dealerId) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        message: "Falta el ID del dealer.",
      },
    };
  }

  if (!file) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        message: "Seleccioná una imagen para subir.",
      },
    };
  }

  if (!String(file.type || "").startsWith("image/")) {
    return {
      dealer: null,
      logoUrl: null,
      error: {
        message: "El archivo debe ser una imagen.",
      },
    };
  }

  const safeName = sanitizeFileName(file.name);
  const path = `dealers/${dealerId}/logo-${Date.now()}-${crypto.randomUUID()}-${safeName}`;

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
        message: "No se pudo obtener la URL pública de la imagen.",
      },
    };
  }

  const { data, error } = await supabase.rpc("update_dealer_logo_from_admin", {
    p_dealer_id: Number(dealerId),
    p_logo_url: logoUrl,
  });

  return {
    dealer: Array.isArray(data) ? data[0] : null,
    logoUrl,
    error,
  };
}