import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

function normalizeVehicleStatus(row) {
  if (row.reserved) return "reserved";
  if (!row.is_active) return "paused";
  return row.publication_status || row.status || "active";
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
  const joinedDealer = row.dealers || null;

  if (joinedDealer) {
    const plan = normalizePlan(joinedDealer.plan_code);

    return {
      id: String(joinedDealer.id),
      commercialName:
        joinedDealer.name || row.dealer_name || "Dealer no informado",
      plan,
      planStatus: joinedDealer.plan_status || "active",
      province: joinedDealer.province || row.province || "",
      city: joinedDealer.city || row.city || "",
      logo: joinedDealer.logo_url || joinedDealer.image_url || null,
      phone:
        joinedDealer.phone_whatsapp ||
        joinedDealer.contact_phone ||
        row.dealer_phone ||
        "",
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

  return {
    id: row.dealer_id ? String(row.dealer_id) : "dealer-snapshot",
    commercialName: row.dealer_name || "Dealer no informado",
    plan: "inicio",
    planStatus: "active",
    province: row.province || "",
    city: row.city || "",
    logo: null,
    phone: row.dealer_phone || "",
    benefits: {},
    currentPeriod: {
      publicationsUsed: 0,
      expiresInDays: 30,
    },
  };
}

export function mapVehicleFromSupabase(row) {
  const dealer = buildDealerFromVehicleRow(row);
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

    badges: row.featured ? ["featured"] : [],
    raw: row,
  };
}

export async function listPublicVehicles() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicles: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select(
      `
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
      doors,
      reserved,
      reserved_by,
      delivery,
      months,
      rate,
      is_active,
      review_status,
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
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      vehicles: [],
      error,
    };
  }

  return {
    vehicles: (data || []).map(mapVehicleFromSupabase),
    error: null,
  };
}

export async function listPublicLatestVehicles({ limit = 8 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicles: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("get_public_latest_vehicles", {
    p_limit: Number(limit || 8),
  });

  if (error) {
    return {
      vehicles: [],
      error,
    };
  }

  return {
    vehicles: (data || []).map((row) => ({
      id: String(row.vehicle_id),
      brand: row.brand || "Marca no informada",
      model: row.model || "Modelo no informado",
      version: row.version || "Versión no informada",
      year: Number(row.year || 0),
      kilometers: Number(row.km || 0),
      price: Number(row.price || 0),
      city: row.city || "",
      province: row.province || "",
      mainImageUrl: row.main_image_url || "",
      imageUrl: row.main_image_url || "",
      createdAt: row.created_at || null,
      dealer: {
        commercialName: row.dealer_name || "Dealer no informado",
        logo: row.dealer_logo || null,
        plan: row.dealer_plan_code || "inicio",
      },
    })),
    error: null,
  };
}