import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function listVehiclesForCurrentDealer() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicles: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("get_vehicles_for_current_dealer");

  return {
    vehicles: data || [],
    error,
  };
}

export async function updateCurrentDealerVehicleStatus({ vehicleId, action }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicle: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "update_current_dealer_vehicle_status",
    {
      p_vehicle_id: Number(vehicleId),
      p_action: action,
    }
  );

  return {
    vehicle: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function updateCurrentDealerVehicleData(form) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicle: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "update_current_dealer_vehicle_data",
    {
      p_vehicle_id: Number(form.vehicleId),
      p_brand: form.brand,
      p_model: form.model,
      p_version: form.version || null,
      p_year: form.year ? Number(form.year) : null,
      p_price: form.price ? Number(form.price) : null,
      p_km: form.km ? Number(form.km) : 0,
      p_body_type: form.bodyType || null,
      p_transmission: form.transmission || null,
      p_fuel_type: form.fuelType || null,
      p_province: form.province || null,
      p_city: form.city || null,
      p_financing: Boolean(form.financing),
      p_delivery: form.delivery ? Number(form.delivery) : 0,
      p_months: form.months ? Number(form.months) : 0,
      p_rate: form.rate ? Number(form.rate) : 0,
      p_market_reference_price: form.marketReferencePrice
        ? Number(form.marketReferencePrice)
        : null,
      p_details: form.details || null,
    }
  );

  return {
    vehicle: Array.isArray(data) ? data[0] : null,
    error,
  };
}