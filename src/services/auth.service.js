import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { reportSupabaseError, setSentryUser } from "../lib/sentry.js";

const LOGIN_ATTEMPTS_KEY = "ox_login_attempts";
const LOGIN_LOCKOUT_KEY = "ox_login_lockout";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

function getLoginThrottle() {
  try {
    const lockout = Number(localStorage.getItem(LOGIN_LOCKOUT_KEY) || 0);
    if (lockout && Date.now() < lockout) {
      return { locked: true, remainingMs: lockout - Date.now() };
    }
    if (lockout && Date.now() >= lockout) {
      localStorage.removeItem(LOGIN_LOCKOUT_KEY);
      localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    }
    return { locked: false, attempts: Number(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || 0) };
  } catch {
    return { locked: false, attempts: 0 };
  }
}

function recordLoginFailure() {
  try {
    const attempts = Number(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || 0) + 1;
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, String(attempts));
    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem(LOGIN_LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
    }
  } catch { /* localStorage no disponible */ }
}

function clearLoginThrottle() {
  try {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    localStorage.removeItem(LOGIN_LOCKOUT_KEY);
  } catch { /* noop */ }
}

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
      error: { message: "Supabase no está configurado. Revisá .env.local." },
    };
  }

  const throttle = getLoginThrottle();
  if (throttle.locked) {
    const secs = Math.ceil(throttle.remainingMs / 1000);
    return {
      data: null,
      error: { message: `Demasiados intentos fallidos. Esperá ${secs} segundos antes de reintentar.` },
    };
  }

  const result = await supabase.auth.signInWithPassword({
    email: String(email || "").trim().toLowerCase(),
    password,
  });

  if (result.error) {
    recordLoginFailure();
    reportSupabaseError(result.error, "auth.service / signInWithEmail");
  } else {
    clearLoginThrottle();
    setSentryUser(result.data?.user ?? null);
  }

  return result;
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

export async function signUpDealer({ email, password, fullName, phone, activationCode }) {
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

  let founderResult = null;
  if (activationCode) {
    const { data: claimData, error: claimError } = await supabase.rpc(
      "claim_and_set_founder",
      {
        p_code: String(activationCode).trim().toUpperCase(),
        p_email: cleanEmail,
      }
    );

    if (!claimError) {
      founderResult = claimData;
      // founderSet: false → código consumido pero dealer aún no existe en tabla.
      // El admin puede asignarlo manualmente desde el panel después de activar el dealer.
      if (claimData && !claimData.founderSet) {
        console.warn(
          "[claim_and_set_founder] Código consumido pero dealer no encontrado para",
          cleanEmail,
          "— asignar distintivo manualmente desde admin."
        );
      }
    }
  }

  return {
    data: {
      ...signUpResponse.data,
      dealerLink: Array.isArray(data) ? data[0] : null,
      founderResult,
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
    return { error: null };
  }

  setSentryUser(null);
  return supabase.auth.signOut();
}

export function localizeAuthError(error) {
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials"))
    return "Email o contraseña incorrectos.";
  if (msg.includes("email not confirmed"))
    return "Confirmá tu email antes de ingresar. Revisá tu casilla.";
  if (msg.includes("already registered") || msg.includes("already been registered"))
    return "Ya existe una cuenta con ese email. Podés iniciar sesión directamente.";
  if (msg.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("too many requests") || msg.includes("rate limit") || msg.includes("email rate limit"))
    return "Demasiados intentos. Esperá unos minutos antes de reintentar.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Error de conexión. Verificá tu internet e intentá de nuevo.";
  return error?.message || "Ocurrió un error inesperado.";
}

export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured || !supabase) return { unsubscribe: () => {} };
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
