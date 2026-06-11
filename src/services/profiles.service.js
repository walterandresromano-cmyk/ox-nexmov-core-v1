/*
SQL MIGRATION — run once in Supabase SQL editor:

create or replace function public.update_current_buyer_profile(
  p_full_name     text,
  p_phone_visible text,
  p_phone_whatsapp text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    full_name      = p_full_name,
    phone_visible  = p_phone_visible,
    phone_whatsapp = p_phone_whatsapp,
    updated_at     = now()
  where id     = auth.uid()
    and role   = 'buyer'
    and status = 'active';
end;
$$;

revoke all on function public.update_current_buyer_profile(text, text, text) from public;
grant execute on function public.update_current_buyer_profile(text, text, text) to authenticated;
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function updateBuyerProfile({ fullName, phoneVisible, phoneWhatsapp }) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: { message: "Supabase no está configurado." } };
  }

  const { error } = await supabase.rpc("update_current_buyer_profile", {
    p_full_name:      fullName?.trim() || null,
    p_phone_visible:  phoneVisible?.trim() || null,
    p_phone_whatsapp: phoneWhatsapp?.trim() || null,
  });

  return { error: error || null };
}

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
      "id, role, full_name, email, phone_visible, phone_whatsapp, status, theme, created_at, updated_at"
    )
    .eq("id", userId)
    .single();

  return {
    profile: data || null,
    error,
  };
}

/*
  Para activar el sync de tema entre dispositivos, ejecutar en Supabase SQL Editor:

  alter table public.profiles
    add column if not exists theme text check (theme in ('dark', 'light'));
*/

/**
 * Guarda la preferencia de tema en el perfil del usuario autenticado.
 * Falla silenciosamente si la columna `theme` no existe todavía.
 */
export async function saveUserTheme(theme) {
  if (!isSupabaseConfigured || !supabase) return;
  if (theme !== "dark" && theme !== "light") return;

  await supabase
    .from("profiles")
    .update({ theme })
    .eq("id", (await supabase.auth.getUser()).data?.user?.id);
}