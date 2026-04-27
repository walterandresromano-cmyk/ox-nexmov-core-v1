import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function listVehicleLeadsForCurrentBuyer() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      leads: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_vehicle_leads_for_current_buyer"
  );

  return {
    leads: data || [],
    error,
  };
}

export async function listZeroKmLeadsForCurrentBuyer() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      leads: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_zero_km_leads_for_current_buyer"
  );

  return {
    leads: data || [],
    error,
  };
}