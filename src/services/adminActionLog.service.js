/*
  SQL — run once in Supabase SQL editor before using this service:

  create table if not exists admin_action_logs (
    id          bigserial primary key,
    created_at  timestamptz default now() not null,
    action      text        not null,
    target      text        not null,
    detail      text,
    result      text        default 'success',
    admin_email text
  );

  alter table admin_action_logs enable row level security;

  create policy "Admins insert action logs"
    on admin_action_logs for insert to authenticated
    with check (
      exists (
        select 1 from profiles
        where profiles.id = auth.uid() and profiles.role = 'admin'
      )
    );

  create policy "Admins read action logs"
    on admin_action_logs for select to authenticated
    using (
      exists (
        select 1 from profiles
        where profiles.id = auth.uid() and profiles.role = 'admin'
      )
    );
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function persistAdminAction({ action, target, detail = "", result = "success", adminEmail = "" }) {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  const { error } = await supabase
    .from("admin_action_logs")
    .insert({
      action,
      target,
      detail: detail || null,
      result,
      admin_email: adminEmail || null,
    });

  return { error };
}

export async function listAdminActionLogs({ limit = 100 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return { logs: [], error: null };
  }

  const { data, error } = await supabase
    .from("admin_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return { logs: data || [], error };
}
