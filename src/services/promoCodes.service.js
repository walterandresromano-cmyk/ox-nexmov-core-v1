import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

// El código válido NO vive en el frontend — solo la RPC server-side lo conoce.
// checkPromoCodeAvailable() es solo feedback visual: llama a la misma RPC
// con un email vacío para saber el estado sin consumir el cupo.

export async function checkPromoCodeAvailable(code) {
  const normalized = String(code || "").trim().toUpperCase();

  if (!normalized) return { available: false, reason: "invalid" };

  if (!isSupabaseConfigured || !supabase) {
    return { available: true, uses: 0, maxUses: 10 };
  }

  try {
    const { data, error } = await supabase.rpc("check_promo_code", {
      p_code: normalized,
    });

    if (error) return { available: true, uses: 0, maxUses: 10 };

    return data;
  } catch {
    return { available: true, uses: 0, maxUses: 10 };
  }
}

// Atómica: valida + consume el cupo en una sola transacción server-side.
export async function claimPromoCode(code, email) {
  const normalized = String(code || "").trim().toUpperCase();

  if (!normalized) return { ok: false, reason: "invalid" };

  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, reason: null, uses: 0, maxUses: 10 };
  }

  try {
    const { data, error } = await supabase.rpc("claim_promo_code", {
      p_code: normalized,
      p_email: String(email || "").trim().toLowerCase(),
    });

    if (error) return { ok: false, reason: "error", error };

    return data;
  } catch (error) {
    return { ok: false, reason: "error", error };
  }
}
