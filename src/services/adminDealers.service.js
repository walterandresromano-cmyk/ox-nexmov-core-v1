import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function grantExtraPublishSlots({
  dealerId,
  extraSlots,
  reason = "",
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      dealer: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("grant_extra_publish_slots", {
    p_dealer_id: Number(dealerId),
    p_extra_slots: Number(extraSlots),
    p_reason: reason || null,
  });

  return {
    dealer: Array.isArray(data) ? data[0] : null,
    error,
  };
}