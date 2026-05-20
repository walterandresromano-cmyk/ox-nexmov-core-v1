import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function registerVehicleDetailView(vehicleId) {
  if (!vehicleId) return { ok: false, error: new Error("vehicleId requerido") };

  const sessionKey = `ox_seen_vehicle_detail_view_${vehicleId}`;

  try {
    if (sessionStorage.getItem(sessionKey)) {
      return { ok: true, error: null };
    }
  } catch {
    // sessionStorage no disponible — continuar sin dedup
  }

  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: new Error("Supabase no configurado") };
  }

  const { error } = await supabase.rpc("increment_vehicle_view", {
    p_vehicle_id: Number(vehicleId),
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.warn("[vehicleViews] increment_vehicle_view falló:", error.message);
    }
    return { ok: false, error };
  }

  try {
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    // sessionStorage no disponible
  }

  return { ok: true, error: null };
}
