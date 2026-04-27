import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function getCurrentSession() {
  if (!isSupabaseConfigured) {
    return {
      session: null,
      error: "Supabase no está configurado.",
    };
  }

  const { data, error } = await supabase.auth.getSession();

  return {
    session: data?.session || null,
    error,
  };
}

export async function signInWithEmail({ email, password }) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: {
        message: "Supabase no está configurado. Revisá .env.local.",
      },
    };
  }

  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpBuyer({ email, password, fullName, phone }) {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: {
        message: "Supabase no está configurado. Revisá .env.local.",
      },
    };
  }

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "buyer",
        full_name: fullName,
        phone,
      },
    },
  });
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    return {
      error: null,
    };
  }

  return supabase.auth.signOut();
}