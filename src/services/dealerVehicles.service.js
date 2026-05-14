import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const CURRENT_YEAR = new Date().getFullYear();

function buildValidationError(message) {
  return {
    vehicle: null,
    error: {
      message,
    },
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateVehiclePayload(form) {
  const year = getNumber(form.year);
  const km = getNumber(form.km);
  const price = getNumber(form.price);
  const reference = getNumber(form.marketReferencePrice);
  const delivery = getNumber(form.delivery);

  if (!cleanText(form.brand) || !cleanText(form.model) || !cleanText(form.version)) {
    return "Completá marca, modelo y versión.";
  }

  if (!year || year < 1950 || year > CURRENT_YEAR + 1) {
    return "Ingresá un año válido.";
  }

  if (km === null || km < 0) {
    return "Ingresá kilometraje válido.";
  }

  if (!price || price <= 0) {
    return "Ingresá el precio real total del vehículo.";
  }

  if (reference && reference > 0 && price < reference * 0.4) {
    return "El precio publicado parece demasiado bajo respecto de la referencia de mercado.";
  }

  if (delivery && delivery > 0 && price <= delivery) {
    return "El precio principal debe ser mayor que la entrega o anticipo.";
  }

  if (!cleanText(form.province) || !cleanText(form.city)) {
    return "Completá provincia y ciudad.";
  }

  return "";
}

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
    vehicles: (data || []).map(vehicle => ({
      ...vehicle,
      images: vehicle.images_json || [],
    })),
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

  const validationError = validateVehiclePayload(form);

  if (validationError) {
    return buildValidationError(validationError);
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
      p_maintenance_info: form.maintenance_info ?? form.maintenanceInfo ?? null,
      p_show_maintenance_info: Boolean(form.show_maintenance_info ?? form.showMaintenanceInfo ?? false),
    }
  );

  return {
    vehicle: Array.isArray(data) ? data[0] : null,
    error,
  };
}
