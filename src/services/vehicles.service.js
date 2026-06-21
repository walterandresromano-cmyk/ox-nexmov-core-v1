import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { normalizeWhatsAppArgentina } from "../lib/formatters.js";
import { withRetry } from "../lib/withRetry.js";

const PUBLIC_VEHICLE_SELECT = `
  id,
  created_at,
  brand,
  model,
  version,
  year,
  price,
  currency,
  km,
  body_type,
  transmission,
  fuel_type,
  dealer_id,
  dealer_name,
  dealer_phone,
  location,
  province,
  city,
  main_image_url,
  image_url,
  images_json,
  status,
  publication_status,
  financing,
  featured,
  description,
  details,
  avg,
  market_reference_price,
  usage,
  views,
  leads_count,
  contraoferta_habilitada,
  doors,
  reserved,
  reserved_by,
  delivery,
  months,
  rate,
  is_active,
  review_status,
  maintenance_info,
  show_maintenance_info,
  dealers (
    id,
    name,
    plan_code,
    plan_status,
    logo_url,
    image_url,
    contact_phone,
    phone_whatsapp,
    province,
    city,
    extra_publish_slots,
    publications_used,
    plan_expires_at,
    can_receive_sell_vehicle_leads
  )
`;

function normalizeVehicleStatus(row) {
  if (row.reserved) return "reserved";
  if (!row.is_active) return "paused";
  return row.publication_status || row.status || "active";
}

/**
 * Regla única de visibilidad pública para vehículos.
 * Un vehículo solo puede aparecer en espacios públicos si:
 *   - is_active = true
 *   - publication_status = "active" (o vacío/desconocido → se permite por compatibilidad)
 *   - status !== "sold" / "vendido"
 * Los vehículos reservados pasan si el publication_status es "active".
 */
export function isPublicVehicleVisible(vehicle) {
  if (!vehicle) return false;

  // is_active debe ser true (vía raw si el campo no fue mapeado)
  if (vehicle.raw?.is_active === false) return false;
  if (vehicle.active === false || vehicle.is_active === false) return false;

  // publication_status "active" y "reserved" son públicos; todo lo demás queda oculto
  const pubStatus = String(
    vehicle.publicationStatus ||
    vehicle.publication_status ||
    vehicle.raw?.publication_status ||
    ""
  )
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();

  if (pubStatus && pubStatus !== "active" && pubStatus !== "reserved") return false;

  // status "sold" / "vendido" nunca es público
  const st = String(vehicle.status || vehicle.raw?.status || "").toLowerCase();
  if (st.includes("sold") || st.includes("vendido")) return false;

  return true;
}

function getDaysUntil(dateValue) {
  if (!dateValue) return 0;

  const target = new Date(dateValue).getTime();
  const now = Date.now();

  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function normalizePlan(planCode) {
  const value = String(planCode || "inicio").trim().toLowerCase();

  if (["inicio", "pro", "elite", "platinum"].includes(value)) {
    return value;
  }

  return "inicio";
}

function buildDealerFromVehicleRow(row) {
  const joinedDealer = Array.isArray(row.dealers)
    ? row.dealers[0]
    : row.dealers || null;
  const rowDealerWhatsapp =
    row.dealerWhatsapp ||
    row.dealer_whatsapp ||
    row.phoneWhatsapp ||
    row.phone_whatsapp ||
    row.contactPhone ||
    row.contact_phone ||
    row.dealerPhone ||
    row.dealer_phone ||
    row.dealer_phone_whatsapp ||
    "";

  if (joinedDealer) {
    const plan = normalizePlan(joinedDealer.plan_code);
    const dealerWhatsapp =
      joinedDealer.phone_whatsapp ||
      joinedDealer.contact_phone ||
      joinedDealer.dealer_phone ||
      rowDealerWhatsapp;
    const normalizedDealerWhatsapp = normalizeWhatsAppArgentina(dealerWhatsapp);

    return {
      id: String(joinedDealer.id),
      commercialName:
        joinedDealer.name || row.dealer_name || "Dealer no informado",
      plan,
      planStatus: joinedDealer.plan_status || "active",
      province: joinedDealer.province || row.province || "",
      city: joinedDealer.city || row.city || "",
      logo: joinedDealer.logo_url || joinedDealer.image_url || null,
      phone: normalizedDealerWhatsapp,
      phoneWhatsapp: normalizedDealerWhatsapp,
      phone_whatsapp: normalizedDealerWhatsapp,
      dealerWhatsapp: normalizedDealerWhatsapp,
      dealer_whatsapp: normalizedDealerWhatsapp,
      contactPhone: joinedDealer.contact_phone || normalizedDealerWhatsapp,
      contact_phone: joinedDealer.contact_phone || normalizedDealerWhatsapp,
      benefits: {
        sellVehicleLeads: Boolean(joinedDealer.can_receive_sell_vehicle_leads),
        extraPublicationQuota: Number(joinedDealer.extra_publish_slots || 0),
      },
      currentPeriod: {
        publicationsUsed: Number(joinedDealer.publications_used || 0),
        expiresInDays: getDaysUntil(joinedDealer.plan_expires_at),
      },
    };
  }

  const normalizedDealerWhatsapp = normalizeWhatsAppArgentina(rowDealerWhatsapp);

  return {
    id: row.dealer_id ? String(row.dealer_id) : "dealer-snapshot",
    commercialName: row.dealer_name || "Dealer no informado",
    plan: "inicio",
    planStatus: "active",
    province: row.province || "",
    city: row.city || "",
    logo: null,
    phone: normalizedDealerWhatsapp,
    phoneWhatsapp: normalizedDealerWhatsapp,
    phone_whatsapp: normalizedDealerWhatsapp,
    dealerWhatsapp: normalizedDealerWhatsapp,
    dealer_whatsapp: normalizedDealerWhatsapp,
    contactPhone: row.contact_phone || row.dealer_phone || normalizedDealerWhatsapp,
    contact_phone: row.contact_phone || row.dealer_phone || normalizedDealerWhatsapp,
    benefits: {},
    currentPeriod: {
      publicationsUsed: 0,
      expiresInDays: 30,
    },
  };
}
export function mapVehicleFromSupabase(row) {
  const dealer = buildDealerFromVehicleRow(row);
  const normalizedDealerWhatsapp = normalizeWhatsAppArgentina(
    dealer?.dealerWhatsapp ||
      dealer?.phoneWhatsapp ||
      dealer?.contactPhone ||
      row.dealer_whatsapp ||
      row.phone_whatsapp ||
      row.contact_phone ||
      row.dealer_phone ||
      row.dealer_phone_whatsapp
  );
  const images = Array.isArray(row.images_json) ? row.images_json : [];
  const mainImageUrl =
    row.main_image_url || row.image_url || images[0]?.url || "";

  return {
    id: String(row.id),

    dealerId: dealer?.id || String(row.dealer_id || ""),
    brand: row.brand || "Marca no informada",
    model: row.model || "Modelo no informado",
    version: row.version || "Versión no informada",
    year: Number(row.year || 0),
    kilometers: Number(row.km || 0),
    price: Number(row.price || 0),
    marketReferencePrice: Number(row.market_reference_price || row.avg || 0),

    province: row.province || "Sin provincia",
    city: row.city || "Sin ciudad",
    location: row.location || "",

    status: normalizeVehicleStatus(row),
    publicationStatus: row.publication_status || row.status || "",
    hasFinancing: Boolean(row.financing),
    reserved: Boolean(row.reserved),

    bodyType: row.body_type || "",
    transmission: row.transmission || "",
    fuelType: row.fuel_type || "",
    doors: row.doors || null,

    delivery: Number(row.delivery || 0),
    months: Number(row.months || 0),
    rate: Number(row.rate || 0),

    imageUrl: mainImageUrl,
    mainImageUrl,
    images,

    details: row.details || row.description || "",

    dealer,
    dealerWhatsapp: normalizedDealerWhatsapp,
    dealer_whatsapp: normalizedDealerWhatsapp,
    phoneWhatsapp: normalizedDealerWhatsapp,
    phone_whatsapp: normalizedDealerWhatsapp,
    contactPhone: dealer?.contactPhone || normalizedDealerWhatsapp,
    contact_phone: dealer?.contactPhone || normalizedDealerWhatsapp,

    maintenance_info: row.maintenance_info ?? null,
    show_maintenance_info: Boolean(row.show_maintenance_info ?? false),

    views: Number(row.views ?? 0),
    leads_count: Number(row.leads_count ?? 0),
    contraoferta_habilitada: Boolean(row.contraoferta_habilitada ?? false),
    badges: row.featured ? ["featured"] : [],
    raw: row,
  };
}

let _publicVehiclesCache = null;
let _publicVehiclesCacheAt = 0;
const PUBLIC_VEHICLES_TTL_MS = 2 * 60 * 1000;

export async function listPublicVehicles() {
  if (!isSupabaseConfigured || !supabase) {
    return { vehicles: [], error: { message: "Supabase no está configurado." } };
  }

  if (_publicVehiclesCache && Date.now() - _publicVehiclesCacheAt < PUBLIC_VEHICLES_TTL_MS) {
    return { vehicles: _publicVehiclesCache, error: null };
  }

  const { data, error } = await withRetry(() =>
    supabase
      .from("vehicles")
      .select(PUBLIC_VEHICLE_SELECT)
      .eq("is_active", true)
      .in("publication_status", ["active", "reserved"])
      .order("created_at", { ascending: false })
  );

  if (error) return { vehicles: [], error };

  const vehicles = (data || []).map(mapVehicleFromSupabase).filter(isPublicVehicleVisible);
  _publicVehiclesCache = vehicles;
  _publicVehiclesCacheAt = Date.now();
  return { vehicles, error: null };
}

export async function listPublicLatestVehicles({ limit = 8 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return { vehicles: [], error: { message: "Supabase no está configurado." } };
  }

  const { data, error } = await withRetry(() =>
    supabase
      .from("vehicles")
      .select(PUBLIC_VEHICLE_SELECT)
      .eq("is_active", true)
      .in("publication_status", ["active", "reserved"])
      .order("created_at", { ascending: false })
      .limit(Number(limit || 8))
  );

  return {
    vehicles: error ? [] : (data || []).map(mapVehicleFromSupabase).filter(isPublicVehicleVisible),
    error: error || null,
  };
}

export async function getPublicVehicleById(id) {
  const vehicleId = String(id || "").trim();

  if (!vehicleId) {
    return {
      vehicle: null,
      error: {
        message: "ID de vehÃ­culo invÃ¡lido.",
      },
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicle: null,
      error: {
        message: "Supabase no estÃ¡ configurado.",
      },
    };
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select(PUBLIC_VEHICLE_SELECT)
    .eq("id", vehicleId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return {
      vehicle: null,
      error,
    };
  }

  return {
    vehicle: data ? mapVehicleFromSupabase(data) : null,
    error: null,
  };
}

export async function listDealerPublicVehicles(dealerId, excludeId, limit = 5) {
  if (!isSupabaseConfigured || !supabase || !dealerId) return [];
  const { data } = await supabase
    .from("vehicles")
    .select(PUBLIC_VEHICLE_SELECT)
    .eq("dealer_id", dealerId)
    .eq("is_active", true)
    .in("publication_status", ["active", "reserved"])
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []).map(mapVehicleFromSupabase).filter(isPublicVehicleVisible);
}

export async function getPublicInventoryStats() {
  if (!isSupabaseConfigured || !supabase) {
    return { brands: 0, reserved: 0, sold: 0, withFinancing: 0, contacts: 0, activeDealers: 0 };
  }

  const [brandsRes, reservedRes, soldRes, financingRes, contactsRes, activeDealersRes] = await Promise.all([
    supabase.from("vehicles").select("brand").eq("is_active", true).not("brand", "is", null),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("is_active", true).eq("reserved", true),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("publication_status", "sold"),
    supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("is_active", true).not("financing", "is", null),
    supabase.from("vehicle_action_leads").select("*", { count: "exact", head: true }),
    // Cuenta dealers con plan activo o por vencer, independientemente de si tienen vehículos
    supabase.from("dealers").select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .in("plan_status", ["active", "expiring"]),
  ]);

  const brands = new Set(
    (brandsRes.data || []).map((r) => r.brand?.trim().toLowerCase()).filter(Boolean)
  ).size;

  return {
    brands,
    reserved: reservedRes.count || 0,
    sold: soldRes.count || 0,
    withFinancing: financingRes.count || 0,
    contacts: contactsRes.count || 0,
    activeDealers: activeDealersRes.count || 0,
  };
}
