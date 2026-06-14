import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function setVehicleContraoferta({ vehicleId, habilitada, precioMin, precioMax }) {
  if (!isSupabaseConfigured || !supabase) return { error: { message: "Supabase no configurado." } };

  const { error } = await supabase.rpc("set_vehicle_contraoferta", {
    p_vehicle_id: Number(vehicleId),
    p_habilitada: Boolean(habilitada),
    p_precio_min: habilitada && precioMin ? Number(precioMin) : null,
    p_precio_max: habilitada && precioMax ? Number(precioMax) : null,
  });

  return { error: error || null };
}

export async function createContraoferta({ vehicleId, buyerName, buyerPhone, precioOfertado }) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: { message: "Supabase no configurado." } };

  const { data, error } = await supabase.rpc("create_contraoferta", {
    p_vehicle_id:      Number(vehicleId),
    p_buyer_name:      buyerName || "",
    p_buyer_phone:     buyerPhone || "",
    p_precio_ofertado: Number(precioOfertado),
  });

  return { data: data || null, error: error || null };
}

export async function listContraofertasForDealer() {
  if (!isSupabaseConfigured || !supabase) return { data: [], error: null };

  const { data, error } = await supabase.rpc("list_contraofertas_for_dealer");

  return { data: data || [], error: error || null };
}

export async function respondContraoferta({ id, status, dealerNote }) {
  if (!isSupabaseConfigured || !supabase) return { error: { message: "Supabase no configurado." } };

  const { error } = await supabase.rpc("respond_contraoferta", {
    p_id:          id,
    p_status:      status,
    p_dealer_note: dealerNote || null,
  });

  return { error: error || null };
}
