import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { reportSupabaseError } from "../lib/sentry.js";

export async function createAccessRequest({ name, email, company, phone }) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: { message: "Supabase no configurado." } };
  }

  const { error } = await supabase
    .from("access_requests")
    .insert({ name: name.trim(), email: email.trim().toLowerCase(), company: company?.trim() || null, phone: phone?.trim() || null });

  if (error) reportSupabaseError(error, "accessRequests.service / createAccessRequest");

  return { ok: !error, error: error || null };
}

export async function listAccessRequestsForAdmin() {
  if (!isSupabaseConfigured || !supabase) {
    return { requests: [], error: { message: "Supabase no configurado." } };
  }

  const { data, error } = await supabase
    .from("access_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return { requests: data || [], error: error || null };
}

export async function updateAccessRequestStatus({ id, status, notes }) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: { message: "Supabase no configurado." } };
  }

  const { error } = await supabase
    .from("access_requests")
    .update({ status, notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) reportSupabaseError(error, "accessRequests.service / updateAccessRequestStatus");

  return { ok: !error, error: error || null };
}
