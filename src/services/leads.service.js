import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

function toNumericVehicleId(vehicleId) {
  const value = Number(vehicleId);
  return Number.isFinite(value) ? value : null;
}

function safeText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

const DEDUPE_WINDOW_HOURS = 24;

const ACTIVE_LEAD_STATUSES = new Set([
  "new",
  "nuevo",
  "pending",
  "pendiente",
  "open",
  "abierto",
  "seen",
  "contacted",
  "contactado",
  "in_progress",
  "en_gestion",
  "assigned",
  "asignado",
  "negotiation",
]);

const CLOSED_LEAD_STATUSES = new Set([
  "closed",
  "cerrado",
  "lost",
  "perdido",
  "cancelled",
  "cancelado",
  "archived",
  "archivado",
  "sold",
]);

function splitName(fullName, email) {
  const safeName = String(fullName || "").trim();

  if (!safeName) {
    return {
      firstName: "Comprador",
      lastName: email || "oX",
    };
  }

  const parts = safeName.split(/\s+/);
  const firstName = parts.shift() || "Comprador";
  const lastName = parts.join(" ") || "Sin apellido";

  return {
    firstName,
    lastName,
  };
}

function normalizeLeadStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function normalizeLeadChannel(channel) {
  const value = String(channel || "contact_form").trim().toLowerCase();

  if (
    [
      "whatsapp",
      "contact_form",
      "phone",
      "detail_modal",
      "card",
      "compare",
      "contact_gate",
      "unknown",
    ].includes(value)
  ) {
    return value;
  }

  return "unknown";
}

function normalizeActionType(actionType) {
  const value = String(actionType || "contact_request").trim().toLowerCase();

  if (
    [
      "whatsapp_click",
      "contact_request",
      "detail_contact",
      "compare_contact",
      "reservation_interest",
      "vehicle_contact",
      "unknown",
    ].includes(value)
  ) {
    return value;
  }

  return "unknown";
}

function normalizeSourcePage(sourcePage) {
  const value = String(sourcePage || "contact_gate").trim().toLowerCase();

  if (
    [
      "home",
      "search",
      "vehicle_detail",
      "compare",
      "contact_gate",
      "unknown",
    ].includes(value)
  ) {
    return value;
  }

  return "unknown";
}

function isReusableLead(lead) {
  if (!lead) return false;

  const status = normalizeLeadStatus(lead.crm_status || lead.status);
  const createdAt = lead.created_at ? new Date(lead.created_at).getTime() : 0;
  const recentLimit = Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000;
  const isRecent = Number.isFinite(createdAt) && createdAt >= recentLimit;

  if (CLOSED_LEAD_STATUSES.has(status)) return false;
  if (ACTIVE_LEAD_STATUSES.has(status)) return true;

  return isRecent;
}

async function findReusableVehicleContactLead({
  buyerId,
  vehicleId,
  channel,
  actionType,
}) {
  const { data, error } = await supabase
    .from("vehicle_action_leads")
    .select("*")
    .eq("buyer_id", buyerId)
    .eq("vehicle_id", vehicleId)
    .eq("channel", channel)
    .eq("action_type", actionType)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return {
      lead: null,
      error,
    };
  }

  return {
    lead: (data || []).find(isReusableLead) || null,
    error: null,
  };
}

async function getOrCreateBuyerProfile({ authUser, authProfile }) {
  const email = safeText(authProfile?.email || authUser?.email, "").toLowerCase();

  if (!email) {
    return {
      buyerProfile: null,
      error: {
        message: "No se pudo identificar el email del comprador.",
      },
    };
  }

  const phone = safeText(
    authProfile?.phone_whatsapp ||
      authProfile?.phone_visible ||
      authUser?.user_metadata?.phone,
    "Sin teléfono"
  );

  const fullName = safeText(
    authProfile?.full_name || authUser?.user_metadata?.full_name,
    "Comprador oX"
  );

  const city = safeText(authProfile?.city, "Sin ciudad");
  const province = safeText(authProfile?.province, "Sin provincia");

  const { firstName, lastName } = splitName(fullName, email);

  // No usamos maybeSingle() porque si hay duplicados históricos rompe el flujo.
  // Tomamos el perfil más reciente y luego la base debe impedir nuevos duplicados.
  const { data: existingProfiles, error: readError } = await supabase
    .from("buyer_profiles")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (readError) {
    return {
      buyerProfile: null,
      error: readError,
    };
  }

  const existingByEmail = existingProfiles?.[0] || null;

  if (existingByEmail) {
    return {
      buyerProfile: existingByEmail,
      error: null,
    };
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    phone,
    email,
    city,
    province,
  };

  const { data, error } = await supabase
    .from("buyer_profiles")
    .insert(payload)
    .select("*")
    .single();

  return {
    buyerProfile: data || null,
    error,
  };
}

function getDealerSnapshot({ dealer, vehicle }) {
  return {
    dealerName:
      dealer?.commercialName ||
      vehicle?.dealer?.commercialName ||
      vehicle?.raw?.dealer_name ||
      "Dealer no informado",

    dealerPhone:
      dealer?.phone ||
      vehicle?.dealer?.phone ||
      vehicle?.raw?.dealer_phone ||
      "",
  };
}

export async function createVehicleContactLead({
  authUser,
  authProfile,
  vehicle,
  dealer,
  message,
  channel = "contact_form",
  sourcePage = "contact_gate",
  actionType = "contact_request",
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      lead: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  if (!authUser?.id) {
    return {
      lead: null,
      error: {
        message: "Para contactar al dealer primero tenés que iniciar sesión.",
      },
    };
  }

  const numericVehicleId = toNumericVehicleId(vehicle?.id || vehicle?.vehicle_id);

  if (!numericVehicleId) {
    return {
      lead: null,
      error: {
        message:
          "Este vehículo no tiene un ID real de Supabase. No se puede generar lead.",
      },
    };
  }

  const { buyerProfile, error: buyerError } = await getOrCreateBuyerProfile({
    authUser,
    authProfile,
  });

  if (buyerError) {
    return {
      lead: null,
      error: buyerError,
    };
  }

  if (!buyerProfile?.id) {
    return {
      lead: null,
      error: {
        message: "No se pudo crear o leer el perfil comprador.",
      },
    };
  }

  const vehicleTitle = [vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");

  const dealerSnapshot = getDealerSnapshot({ dealer, vehicle });
  const cleanChannel = normalizeLeadChannel(channel);
  const cleanActionType = normalizeActionType(actionType);
  const cleanSourcePage = normalizeSourcePage(sourcePage);

  const { lead: reusableLead } = await findReusableVehicleContactLead({
    buyerId: buyerProfile.id,
    vehicleId: numericVehicleId,
    channel: cleanChannel,
    actionType: cleanActionType,
  });

  if (reusableLead) {
    return {
      lead: reusableLead,
      error: null,
      reused: true,
    };
  }

  const payload = {
    buyer_id: buyerProfile.id,
    vehicle_id: numericVehicleId,
    action_type: cleanActionType,
    channel: cleanChannel,
    message: message || "El comprador solicitó contacto desde la publicación.",
    dealer_name_snapshot: dealerSnapshot.dealerName,
    dealer_phone_snapshot: dealerSnapshot.dealerPhone,
    vehicle_title_snapshot: vehicleTitle,
    vehicle_status_snapshot: vehicle?.status || "active",
    price_snapshot: vehicle?.price || null,
    crm_status: "new",
    notes: `sourcePage:${cleanSourcePage}`,
    vehicle_is_active_snapshot: true,
    vehicle_status_current: vehicle?.status || "active",
  };

  const { data, error } = await supabase
    .from("vehicle_action_leads")
    .insert(payload)
    .select("*")
    .single();

  return {
    lead: data || null,
    error,
    reused: false,
  };
}

export async function listVehicleLeadsForCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      leads: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_vehicle_leads_for_current_user"
  );

  if (error) {
    return {
      leads: [],
      error,
    };
  }

  return {
    leads: data || [],
    error: null,
  };
}

export async function updateVehicleLeadStatus({
  leadId,
  crmStatus,
  notes = null,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      updatedLead: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("update_vehicle_lead_status", {
    p_lead_id: leadId,
    p_crm_status: crmStatus,
    p_notes: notes,
  });

  return {
    updatedLead: Array.isArray(data) ? data[0] : null,
    error,
  };
}
