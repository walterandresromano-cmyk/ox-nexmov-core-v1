import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

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