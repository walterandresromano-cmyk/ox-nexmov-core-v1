/*
SQL MIGRATION — run once in Supabase SQL editor:

create table if not exists buyer_favorites (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  vehicle_id uuid not null,
  vehicle_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, vehicle_id)
);

alter table buyer_favorites enable row level security;

create policy "buyer_favorites_select" on buyer_favorites
  for select using (auth.uid() = user_id);

create policy "buyer_favorites_insert" on buyer_favorites
  for insert with check (auth.uid() = user_id);

create policy "buyer_favorites_delete" on buyer_favorites
  for delete using (auth.uid() = user_id);
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function listBuyerFavorites() {
  if (!isSupabaseConfigured) return { favorites: [], error: null };

  const { data, error } = await supabase
    .from("buyer_favorites")
    .select("vehicle_id, vehicle_snapshot, created_at")
    .order("created_at", { ascending: false });

  if (error) return { favorites: [], error };

  const favorites = (data || []).map((row) => ({
    id: row.vehicle_id,
    ...(row.vehicle_snapshot || {}),
  }));

  return { favorites, error: null };
}

export async function addBuyerFavorite({ vehicleId, vehicleSnapshot }) {
  if (!isSupabaseConfigured) return { error: null };

  const { error } = await supabase
    .from("buyer_favorites")
    .insert({ vehicle_id: vehicleId, vehicle_snapshot: vehicleSnapshot });

  if (error?.code === "23505") return { error: null };

  return { error: error || null };
}

export async function removeBuyerFavorite(vehicleId) {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  const { error } = await supabase
    .from("buyer_favorites")
    .delete()
    .eq("vehicle_id", vehicleId);

  return { error: error || null };
}
