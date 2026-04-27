import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function getProfileByUserId(userId) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      profile: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  if (!userId) {
    return {
      profile: null,
      error: {
        message: "No hay usuario autenticado.",
      },
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, email, phone_visible, phone_whatsapp, status, created_at, updated_at"
    )
    .eq("id", userId)
    .single();

  return {
    profile: data || null,
    error,
  };
}