import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function createSellVehicleLead(form) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      lead: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("create_sell_vehicle_lead", {
    p_full_name: form.fullName,
    p_email: form.email,
    p_phone: form.phone,
    p_province: form.province || "Sin provincia",
    p_city: form.city || "Sin ciudad",
    p_brand: form.brand,
    p_model: form.model,
    p_version: form.version || null,
    p_year: form.year ? Number(form.year) : null,
    p_km: form.km ? Number(form.km) : null,
    p_expected_price: form.expectedPrice ? Number(form.expectedPrice) : null,
    p_condition: form.condition || null,
    p_has_debt: Boolean(form.hasDebt),
    p_has_financing: Boolean(form.hasFinancing),
    p_accepts_dealer_contact: Boolean(form.acceptsDealerContact),
    p_message: form.message || null,
  });

  return {
    lead: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function listSellVehicleLeadsForCurrentBuyer() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      leads: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_sell_vehicle_leads_for_current_buyer"
  );

  return {
    leads: data || [],
    error,
  };
}

export async function listSellVehicleLeadsForAdmin() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      leads: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("get_sell_vehicle_leads_for_admin");

  return {
    leads: data || [],
    error,
  };
}

export async function updateSellVehicleLeadAdmin({
  leadId,
  status,
  internalNotes = null,
  adminDealerNote = null,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      lead: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("update_sell_vehicle_lead_admin", {
    p_lead_id: Number(leadId),
    p_status: status,
    p_internal_notes: internalNotes,
    p_admin_dealer_note: adminDealerNote,
  });

  return {
    lead: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function listDealersAvailableForSellVehicleAssignment() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealers: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_dealers_available_for_sell_vehicle_assignment"
  );

  return {
    dealers: data || [],
    error,
  };
}

export async function assignSellVehicleLeadToDealer({ leadId, dealerId }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      assignment: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "assign_sell_vehicle_lead_to_dealer",
    {
      p_lead_id: Number(leadId),
      p_dealer_id: Number(dealerId),
    }
  );

  return {
    assignment: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function listSellVehicleLeadsForCurrentDealer() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      leads: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_sell_vehicle_leads_for_current_dealer"
  );

  return {
    leads: data || [],
    error,
  };
}

export async function updateSellVehicleLeadDealer({
  leadId,
  status,
  dealerNotes = null,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      lead: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("update_sell_vehicle_lead_dealer", {
    p_lead_id: Number(leadId),
    p_status: status,
    p_dealer_notes: dealerNotes,
  });

  return {
    lead: Array.isArray(data) ? data[0] : null,
    error,
  };
}