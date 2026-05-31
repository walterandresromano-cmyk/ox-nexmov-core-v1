import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { normalizeWhatsAppArgentina } from "../lib/formatters.js";
import { mapVehicleFromSupabase, isPublicVehicleVisible } from "./vehicles.service.js";

export async function getDealerPublicProfile(dealerId) {
  if (!isSupabaseConfigured || !supabase || !dealerId) {
    return { dealer: null, error: { message: "Dealer no disponible." } };
  }

  const { data, error } = await supabase
    .from("dealers")
    .select(
      `id, name, slug, plan_code, plan_status,
       province, city, logo_url, image_url,
       contact_phone, phone_whatsapp, is_active`
    )
    .eq("id", dealerId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return {
      dealer: null,
      error: error || { message: "Dealer no encontrado." },
    };
  }

  return {
    dealer: {
      id: String(data.id),
      name: data.name || "Dealer",
      plan: String(data.plan_code || "inicio").toLowerCase(),
      province: data.province || "",
      city: data.city || "",
      logo: data.logo_url || data.image_url || null,
      phone: normalizeWhatsAppArgentina(
        data.phone_whatsapp || data.contact_phone
      ),
    },
    error: null,
  };
}

export async function getDealerPublicVehicles(dealerId) {
  if (!isSupabaseConfigured || !supabase || !dealerId) {
    return { vehicles: [], error: null };
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select(
      `id, created_at, brand, model, version, year, price, currency,
       km, body_type, transmission, fuel_type, dealer_id, dealer_name,
       dealer_phone, location, province, city, main_image_url, image_url,
       images_json, status, publication_status, financing, featured,
       description, details, avg, market_reference_price, usage, views,
       doors, reserved, reserved_by, delivery, months, rate, is_active,
       review_status, maintenance_info, show_maintenance_info,
       dealers (
         id, name, plan_code, plan_status, logo_url, image_url,
         contact_phone, phone_whatsapp, province, city,
         extra_publish_slots, publications_used, plan_expires_at,
         can_receive_sell_vehicle_leads
       )`
    )
    .eq("dealer_id", dealerId)
    .eq("is_active", true)
    .eq("publication_status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    return { vehicles: [], error };
  }

  return {
    vehicles: (data || []).map(mapVehicleFromSupabase).filter(isPublicVehicleVisible),
    error: null,
  };
}
