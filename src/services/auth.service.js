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
    email: String(email || "").trim().toLowerCase(),
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
    email: String(email || "").trim().toLowerCase(),
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

export async function signUpDealer({ email, password, fullName, phone }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: "Supabase no está configurado. Revisá .env.local.",
      },
    };
  }

  const cleanEmail = String(email || "").trim().toLowerCase();

  const signUpResponse = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        role: "dealer",
        full_name: fullName,
        phone,
      },
    },
  });

  if (signUpResponse.error) {
    return signUpResponse;
  }

  const { data, error } = await supabase.rpc(
    "link_dealer_profile_after_signup",
    {
      p_full_name: fullName || null,
      p_phone: phone || null,
      p_email: cleanEmail,
    }
  );

  if (error) {
    return {
      data: signUpResponse.data,
      error,
    };
  }

  return {
    data: {
      ...signUpResponse.data,
      dealerLink: Array.isArray(data) ? data[0] : null,
    },
    error: null,
  };
}

export async function resetPasswordForEmail({ email }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: "Supabase no está configurado. Revisá .env.local.",
      },
    };
  }

  const cleanEmail = String(email || "").trim().toLowerCase();

  return supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  });
}

export async function updateCurrentUserPassword({ password }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: {
        message: "Supabase no está configurado. Revisá .env.local.",
      },
    };
  }

  return supabase.auth.updateUser({
    password,
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
