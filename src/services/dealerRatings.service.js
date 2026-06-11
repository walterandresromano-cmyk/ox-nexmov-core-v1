/*
  SQL migration — ejecutar en Supabase SQL Editor:

  create table if not exists public.dealer_ratings (
    id bigserial primary key,
    dealer_id bigint not null,
    lead_id bigint not null unique,
    rating smallint not null check (rating between 1 and 5),
    comment text,
    created_at timestamptz not null default now()
  );

  create index if not exists dealer_ratings_dealer_idx
  on public.dealer_ratings (dealer_id);

  create index if not exists dealer_ratings_lead_idx
  on public.dealer_ratings (lead_id);

  alter table public.dealer_ratings enable row level security;

  drop policy if exists "public read dealer ratings"
  on public.dealer_ratings;

  drop policy if exists "authenticated insert dealer rating"
  on public.dealer_ratings;

  create policy "public read dealer ratings"
  on public.dealer_ratings
  for select
  to anon, authenticated
  using (true);

  create policy "buyer insert rating for own lead"
  on public.dealer_ratings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.vehicle_action_leads l
      join public.vehicles v on v.id = l.vehicle_id
      where l.id = dealer_ratings.lead_id
        and v.dealer_id = dealer_ratings.dealer_id
        and l.buyer_id = auth.uid()
    )
  );
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { reportSupabaseError } from "../lib/sentry.js";

const TABLE = "dealer_ratings";

/**
 * Envía la calificación de un dealer.
 * Requiere lead_id válido — la policy RLS verifica que el lead
 * pertenezca al comprador autenticado y al dealer indicado.
 */
export async function submitDealerRating({ dealerId, leadId, rating, comment = "" }) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: { message: "Supabase no configurado." } };
  }

  if (!Number(dealerId) || !Number(leadId) || !Number(rating)) {
    return { data: null, error: { message: "Datos inválidos para calificar." } };
  }

  const payload = {
    dealer_id: Number(dealerId),
    lead_id:   Number(leadId),
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
 * Útil para ocultar el widget si la calificación ya fue enviada.
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
