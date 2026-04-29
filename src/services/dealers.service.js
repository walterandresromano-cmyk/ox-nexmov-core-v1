import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

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
    phone: row.phone_whatsapp || row.contact_phone || "",

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
      activeVehiclesCount: Number(row.active_vehicles_count || 0),
    })),
    error: null,
  };
}