import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { normalizeWhatsAppArgentina } from "../lib/formatters.js";

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
    // Sprint 2: si el perfil existe pero no tiene user_id, intentar asociarlo.
    // Fire-and-forget — no bloquea el flujo si falla por RLS u otro motivo.
    if (!existingByEmail.user_id && authUser?.id) {
      supabase
        .from("buyer_profiles")
        .update({ user_id: authUser.id })
        .eq("id", existingByEmail.id)
        .then(() => {})
        .catch(() => {});
    }
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

  // Sprint 2: vincular user_id al crear un perfil nuevo con usuario autenticado.
  if (authUser?.id) {
    payload.user_id = authUser.id;
  }

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

    dealerPhone: normalizeWhatsAppArgentina(
      dealer?.phone ||
        dealer?.phoneWhatsapp ||
        dealer?.phone_whatsapp ||
        dealer?.contactPhone ||
        dealer?.contact_phone ||
        vehicle?.dealer?.phone ||
        vehicle?.dealer?.phoneWhatsapp ||
        vehicle?.dealer?.phone_whatsapp ||
        vehicle?.raw?.dealer_phone
    ),
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

  // Fire-and-forget: notify dealer via email + push
  if (data && typeof window !== "undefined") {
    const dealerEmail =
      dealer?.raw?.email ||
      dealer?.raw?.contact_email ||
      dealer?.raw?.auth_email ||
      null;

    const resolvedDealerId = dealer?.raw?.id ? Number(dealer.raw.id) : (dealer?.id ? Number(dealer.id) : null);
    if (!resolvedDealerId || !Number.isFinite(resolvedDealerId)) {
      console.warn("[leads.service] notify-lead skipped: dealerId resolved to", resolvedDealerId, "— dealer:", dealer);
    }

    fetch("/api/notify-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealerEmail,
        dealerName: dealerSnapshot.dealerName,
        dealerId: resolvedDealerId,
        vehicleTitle,
        vehiclePrice: vehicle?.price || null,
        buyerName:
          `${buyerProfile.first_name || ""} ${buyerProfile.last_name || ""}`.trim() ||
          null,
        buyerEmail: buyerProfile.email || authUser?.email || null,
        buyerPhone: buyerProfile.phone || null,
        message: message || null,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("[leads.service] notify-lead HTTP error:", res.status);
        }
      })
      .catch((err) => {
        console.error("[leads.service] notify-lead fetch failed:", err?.message);
      });
  }

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

// MIGRATION – run in Supabase SQL editor before using next_action fields:
//
// alter table vehicle_action_leads
//   add column if not exists next_action_note text,
//   add column if not exists next_action_date date;
//
// create or replace function public.update_vehicle_lead_status(
//   p_lead_id        bigint,
//   p_crm_status     text,
//   p_notes          text    default null,
//   p_next_action_note text  default null,
//   p_next_action_date date  default null
// )
// returns setof vehicle_action_leads
// language plpgsql security definer as $$
// begin
//   return query
//   update vehicle_action_leads
//   set
//     crm_status         = p_crm_status,
//     notes              = coalesce(p_notes, notes),
//     next_action_note   = coalesce(p_next_action_note, next_action_note),
//     next_action_date   = coalesce(p_next_action_date, next_action_date),
//     updated_at         = now()
//   where lead_id = p_lead_id
//     and (
//       dealer_id in (select id from dealers where profile_id = auth.uid())
//       or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
//     )
//   returning *;
// end;
// $$;
//
// Note: get_vehicle_leads_for_current_user must select next_action_note and
// next_action_date (add them to the select list or use select * on the table).

export async function updateVehicleLeadStatus({
  leadId,
  crmStatus,
  notes = null,
  nextActionNote = null,
  nextActionDate = null,
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
    p_next_action_note: nextActionNote,
    p_next_action_date: nextActionDate,
  });

  return {
    updatedLead: Array.isArray(data) ? data[0] : null,
    error,
  };
}
