/*
  SQL migration — ejecutar en Supabase SQL Editor antes de usar este servicio:

  create table if not exists vehicle_price_history (
    id          bigserial primary key,
    vehicle_id  bigint not null references vehicles(id) on delete cascade,
    price       numeric not null,
    recorded_at timestamptz not null default now()
  );

  create index if not exists vehicle_price_history_vehicle_idx
    on vehicle_price_history (vehicle_id, recorded_at desc);

  alter table vehicle_price_history enable row level security;

  -- Lectura pública (para mostrar el historial en la ficha)
  create policy "public read price history"
    on vehicle_price_history for select
    using (true);

  -- Solo el dealer dueño del vehículo puede insertar
  create policy "dealer insert own price history"
    on vehicle_price_history for insert
    with check (
      vehicle_id in (
        select v.id from vehicles v
        join dealers d on d.id = v.dealer_id
        where d.user_id = auth.uid()
      )
    );
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const TABLE = "vehicle_price_history";

/**
 * Registra un cambio de precio.
 * Falla silenciosamente si la tabla no existe todavía (migration pendiente).
 */
export async function logPriceChange({ vehicleId, price }) {
  if (!isSupabaseConfigured || !supabase) return;
  const numericId = Number(vehicleId);
  const numericPrice = Number(price);
  if (!numericId || !numericPrice || numericPrice <= 0) return;

  await supabase
    .from(TABLE)
    .insert({ vehicle_id: numericId, price: numericPrice });
}

/**
 * Devuelve el historial de precios de un vehículo, del más antiguo al más nuevo.
 * Retorna [] si la tabla no existe o no hay datos.
 */
export async function getVehiclePriceHistory(vehicleId) {
  if (!isSupabaseConfigured || !supabase) return [];
  const numericId = Number(vehicleId);
  if (!numericId) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("price, recorded_at")
    .eq("vehicle_id", numericId)
    .order("recorded_at", { ascending: true })
    .limit(20);

  if (error) return [];
  return data || [];
}
