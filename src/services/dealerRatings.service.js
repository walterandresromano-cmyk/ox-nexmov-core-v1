/*
  SQL migration — ejecutar en Supabase SQL Editor:

  create table if not exists public.dealer_ratings (
    id          bigserial primary key,
    dealer_id   bigint not null,
    lead_id     bigint unique,
    rating      smallint not null check (rating between 1 and 5),
    comment     text,
    created_at  timestamptz not null default now()
  );

  create index if not exists dealer_ratings_dealer_idx
    on public.dealer_ratings (dealer_id);

  alter table public.dealer_ratings enable row level security;

  create policy "public read dealer ratings"
    on public.dealer_ratings for select using (true);

  create policy "authenticated insert dealer rating"
    on public.dealer_ratings for insert
    with check (auth.uid() is not null);
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { reportSupabaseError } from "../lib/sentry.js";

const TABLE = "dealer_ratings";

/**
 * Envía la calificación de un dealer.
 * Si ya existe una calificación para ese lead_id, falla por UNIQUE constraint.
 */
export async function submitDealerRating({ dealerId, leadId, rating, comment = "" }) {
  if (!isSupabaseConfigured || !supabase) return { error: { message: "Supabase no configurado." } };

  const payload = {
    dealer_id: Number(dealerId),
    lead_id:   leadId ? Number(leadId) : null,
    rating:    Number(rating),
    comment:   comment?.trim() || null,
  };

  const { data, error } = await supabase.from(TABLE).insert(payload).select("id").single();

  if (error) reportSupabaseError(error, "dealerRatings.service / submitDealerRating");

  return { data, error };
}

/**
 * Devuelve el promedio y cantidad de calificaciones de un dealer.
 * Retorna null si la tabla no existe o no hay datos.
 */
export async function getDealerRatingStats(dealerId) {
  if (!isSupabaseConfigured || !supabase) return null;
  const id = Number(dealerId);
  if (!id) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("rating")
    .eq("dealer_id", id);

  if (error || !data?.length) return null;

  const count   = data.length;
  const average = data.reduce((sum, r) => sum + r.rating, 0) / count;

  return {
    average: Math.round(average * 10) / 10,
    count,
  };
}

/**
 * Devuelve los lead_ids que el usuario ya calificó.
 * Útil para saber si mostrar o no el botón de calificar.
 */
export async function getRatedLeadIds(leadIds) {
  if (!isSupabaseConfigured || !supabase || !leadIds?.length) return new Set();

  const { data, error } = await supabase
    .from(TABLE)
    .select("lead_id")
    .in("lead_id", leadIds.map(Number).filter(Boolean));

  if (error || !data) return new Set();
  return new Set(data.map(r => r.lead_id));
}
