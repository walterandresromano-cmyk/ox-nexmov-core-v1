import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rogqhxlqqgxgzqaycbdp.supabase.co";
const supabaseAnonKey = "sb_publishable_zT7hgBlAQvgDZ7HvGgOkrA__svhrybL";

function isValidSupabaseUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidAnonKey(value) {
  if (!value) return false;
  return value.length > 20;
}

export const isSupabaseConfigured =
  isValidSupabaseUrl(supabaseUrl) && isValidAnonKey(supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;