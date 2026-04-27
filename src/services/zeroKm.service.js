import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function createZeroKmFinancingLead(form) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      lead: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("create_zero_km_financing_lead", {
    p_full_name: form.fullName,
    p_email: form.email,
    p_phone: form.phone,
    p_province: form.province || "Sin provincia",
    p_city: form.city || "Sin ciudad",
    p_brand_interest: form.brandInterest || null,
    p_model_interest: form.modelInterest || null,
    p_budget_range: form.budgetRange || null,
    p_down_payment: form.downPayment ? Number(form.downPayment) : null,
    p_preferred_term_months: form.preferredTermMonths
      ? Number(form.preferredTermMonths)
      : null,
    p_employment_type: form.employmentType || null,
    p_monthly_income_range: form.monthlyIncomeRange || null,
    p_message: form.message || null,
  });

  return {
    lead: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function listZeroKmFinancingLeadsForCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      leads: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_zero_km_financing_leads_for_current_user"
  );

  return {
    leads: data || [],
    error,
  };
}

export async function updateZeroKmFinancingLeadStatus({
  leadId,
  status,
  internalNotes = null,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      lead: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "update_zero_km_financing_lead_status",
    {
      p_lead_id: Number(leadId),
      p_status: status,
      p_internal_notes: internalNotes,
    }
  );

  return {
    lead: Array.isArray(data) ? data[0] : null,
    error,
  };
}