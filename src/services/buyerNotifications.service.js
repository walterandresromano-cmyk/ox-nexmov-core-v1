/*
  SQL — run once in Supabase SQL editor.
  Sigue el patrón del proyecto: sin migrations/, SQL embebido en comentario.

  ────────────────────────────────────────────────────────────────
  1. TABLA buyer_notifications
  ────────────────────────────────────────────────────────────────

  create table if not exists buyer_notifications (
    id          uuid        primary key default gen_random_uuid(),
    user_id     uuid        not null,
    type        text        not null,
    title       text        not null,
    body        text        not null,
    entity_type text,
    entity_id   text,
    severity    text        not null default 'info',
    is_read     boolean     not null default false,
    action_label text,
    action_route text,
    metadata    jsonb       not null default '{}',
    created_at  timestamptz not null default now(),
    read_at     timestamptz
  );

  -- types: radar_match | vtv_due | insurance_due | maintenance_due
  --        lead_status_update | garage_update | system
  -- severity: info | attention | urgent | success

  alter table buyer_notifications enable row level security;

  -- Buyer solo lee sus propias notificaciones
  create policy "buyer_notifications_select" on buyer_notifications
    for select using (auth.uid() = user_id);

  -- Buyer puede marcar leídas solo las suyas (vía RPC)
  create policy "buyer_notifications_update" on buyer_notifications
    for update using (auth.uid() = user_id);

  -- Sin INSERT policy directa: solo funciones security definer pueden insertar.
  -- Esto previene que el cliente inserte notificaciones arbitrarias.

  create index if not exists buyer_notifications_user_id_idx
    on buyer_notifications (user_id, created_at desc);

  ────────────────────────────────────────────────────────────────
  2. TABLA buyer_radar_matches  (deduplicación de Radar matching)
  ────────────────────────────────────────────────────────────────

  create table if not exists buyer_radar_matches (
    id                uuid        primary key default gen_random_uuid(),
    radar_request_id  bigint      not null,
    user_id           uuid        not null,
    vehicle_id        bigint      not null,
    notification_id   uuid,
    created_at        timestamptz not null default now(),
    unique (radar_request_id, vehicle_id)
  );

  alter table buyer_radar_matches enable row level security;

  create policy "buyer_radar_matches_select" on buyer_radar_matches
    for select using (auth.uid() = user_id);

  create index if not exists buyer_radar_matches_user_id_idx
    on buyer_radar_matches (user_id, created_at desc);

  ────────────────────────────────────────────────────────────────
  3. RPCs — lectura y marcado de leídas
  ────────────────────────────────────────────────────────────────

  create or replace function get_buyer_notifications_for_current_user()
  returns setof buyer_notifications
  language sql
  security definer
  set search_path = public
  as $$
    select *
    from buyer_notifications
    where user_id = auth.uid()
    order by created_at desc
    limit 50;
  $$;

  -- ----

  create or replace function mark_buyer_notification_read(p_notification_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    update buyer_notifications
    set is_read = true, read_at = now()
    where id = p_notification_id
      and user_id = auth.uid()
      and is_read = false;
  end;
  $$;

  -- ----

  create or replace function mark_all_buyer_notifications_read()
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    update buyer_notifications
    set is_read = true, read_at = now()
    where user_id = auth.uid()
      and is_read = false;
  end;
  $$;

  ────────────────────────────────────────────────────────────────
  4. FUNCIÓN process_buyer_garage_due_alerts()
  ────────────────────────────────────────────────────────────────
  Revisa vtv_due_date e insurance_due_date en buyer_garage_owned_vehicles.
  Crea notificaciones tipo vtv_due / insurance_due con deduplicación por
  (user_id, type, entity_id, metadata->>'window') en ventana de 3 días.

  create or replace function process_buyer_garage_due_alerts()
  returns integer
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    rec         record;
    v_days      integer;
    v_window    text;
    v_severity  text;
    v_title     text;
    v_body      text;
    v_count     integer := 0;
    v_inserted  integer;
  begin
    for rec in
      select id, user_id, brand, model, year,
             vtv_due_date, insurance_due_date
      from buyer_garage_owned_vehicles
      where vtv_due_date is not null
         or insurance_due_date is not null
    loop

      -- VTV ──────────────────────────────────────────────────────
      if rec.vtv_due_date is not null then
        v_days := rec.vtv_due_date - current_date;

        if v_days < 0 then
          v_window := 'expired'; v_severity := 'urgent';
        elsif v_days <= 7 then
          v_window := '7d'; v_severity := 'urgent';
        elsif v_days <= 30 then
          v_window := '30d'; v_severity := 'attention';
        else
          v_window := null;
        end if;

        if v_window is not null and not exists (
          select 1 from buyer_notifications
          where user_id     = rec.user_id
            and type        = 'vtv_due'
            and entity_id   = rec.id::text
            and metadata->>'window' = v_window
            and created_at  > now() - interval '3 days'
        ) then
          v_title := case
            when v_days < 0 then 'VTV vencida: ' || coalesce(rec.brand,'') || ' ' || coalesce(rec.model,'')
            when v_days = 1 then 'VTV vence mañana'
            when v_days <= 7 then 'VTV vence en ' || v_days || ' días'
            else 'VTV vence en ' || v_days || ' días'
          end;
          v_body := case
            when v_days < 0
              then 'La VTV de tu ' || coalesce(rec.brand,'') || ' ' || coalesce(rec.model,'')
                   || ' está vencida. Renovála cuanto antes.'
            else 'La VTV de tu ' || coalesce(rec.brand,'') || ' ' || coalesce(rec.model,'')
                 || ' vence el ' || to_char(rec.vtv_due_date, 'DD/MM/YYYY') || '.'
          end;

          insert into buyer_notifications (
            user_id, type, title, body,
            entity_type, entity_id, severity,
            action_label, metadata
          ) values (
            rec.user_id, 'vtv_due', v_title, v_body,
            'garage_vehicle', rec.id::text, v_severity,
            'Ver vehículo',
            jsonb_build_object(
              'window',             v_window,
              'due_date',           rec.vtv_due_date::text,
              'days_until',         v_days,
              'garage_vehicle_id',  rec.id
            )
          );

          get diagnostics v_inserted = row_count;
          v_count := v_count + v_inserted;
        end if;
      end if;

      -- Seguro ───────────────────────────────────────────────────
      if rec.insurance_due_date is not null then
        v_days := rec.insurance_due_date - current_date;

        if v_days < 0 then
          v_window := 'expired'; v_severity := 'urgent';
        elsif v_days <= 7 then
          v_window := '7d'; v_severity := 'urgent';
        elsif v_days <= 30 then
          v_window := '30d'; v_severity := 'attention';
        else
          v_window := null;
        end if;

        if v_window is not null and not exists (
          select 1 from buyer_notifications
          where user_id     = rec.user_id
            and type        = 'insurance_due'
            and entity_id   = rec.id::text
            and metadata->>'window' = v_window
            and created_at  > now() - interval '3 days'
        ) then
          v_title := case
            when v_days < 0 then 'Seguro vencido: ' || coalesce(rec.brand,'') || ' ' || coalesce(rec.model,'')
            when v_days = 1 then 'Seguro vence mañana'
            when v_days <= 7 then 'Seguro vence en ' || v_days || ' días'
            else 'Seguro vence en ' || v_days || ' días'
          end;
          v_body := case
            when v_days < 0
              then 'El seguro de tu ' || coalesce(rec.brand,'') || ' ' || coalesce(rec.model,'')
                   || ' está vencido. Renovalo cuanto antes.'
            else 'El seguro de tu ' || coalesce(rec.brand,'') || ' ' || coalesce(rec.model,'')
                 || ' vence el ' || to_char(rec.insurance_due_date, 'DD/MM/YYYY') || '.'
          end;

          insert into buyer_notifications (
            user_id, type, title, body,
            entity_type, entity_id, severity,
            action_label, metadata
          ) values (
            rec.user_id, 'insurance_due', v_title, v_body,
            'garage_vehicle', rec.id::text, v_severity,
            'Ver vehículo',
            jsonb_build_object(
              'window',             v_window,
              'due_date',           rec.insurance_due_date::text,
              'days_until',         v_days,
              'garage_vehicle_id',  rec.id
            )
          );

          get diagnostics v_inserted = row_count;
          v_count := v_count + v_inserted;
        end if;
      end if;

    end loop;

    return v_count;
  end;
  $$;

  ────────────────────────────────────────────────────────────────
  5. FUNCIÓN process_buyer_radar_matches()
  ────────────────────────────────────────────────────────────────
  Cruza buyer_radar_requests activos contra vehicles públicos.
  Inserta en buyer_radar_matches (UNIQUE radar_request_id, vehicle_id).
  Crea buyer_notifications tipo radar_match solo para matches nuevos.
  Límite de 50 matches nuevos por ejecución para evitar spam.

  ASUME: buyer_radar_requests.user_id existe (necesario para RLS y para
  asociar la notificación al comprador correcto).

  create or replace function process_buyer_radar_matches()
  returns integer
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    rec              record;
    v_notification_id uuid;
    v_count          integer := 0;
    v_inserted       integer;
  begin
    for rec in
      select
        r.id         as radar_id,
        r.user_id,
        r.filters,
        r.parsed_intent,
        v.id         as vehicle_id,
        v.brand,
        v.model,
        v.year,
        v.price
      from buyer_radar_requests r
      cross join vehicles v
      where r.status = 'active'
        and v.is_active = true
        and v.publication_status = 'active'
        and (v.reserved is null or v.reserved = false)
        and (r.filters->>'brand' is null
             or lower(v.brand) = lower(r.filters->>'brand'))
        and (r.filters->>'model' is null
             or lower(v.model) like '%' || lower(r.filters->>'model') || '%')
        and (r.filters->>'province' is null
             or lower(v.province) = lower(r.filters->>'province'))
        and (r.filters->>'fuel' is null
             or lower(v.fuel_type) = lower(r.filters->>'fuel'))
        and (r.filters->>'transmission' is null
             or lower(v.transmission) = lower(r.filters->>'transmission'))
        and (r.filters->>'bodyType' is null
             or lower(v.body_type) = lower(r.filters->>'bodyType'))
        and (r.parsed_intent->>'maxPrice' is null
             or v.price <= (r.parsed_intent->>'maxPrice')::numeric)
        and (r.parsed_intent->>'maxKm' is null
             or v.km <= (r.parsed_intent->>'maxKm')::integer)
        and (
          r.parsed_intent->'years' is null
          or jsonb_array_length(r.parsed_intent->'years') = 0
          or v.year::text = any(
               array(select jsonb_array_elements_text(r.parsed_intent->'years'))
             )
        )
        and not exists (
          select 1 from buyer_radar_matches m
          where m.radar_request_id = r.id
            and m.vehicle_id = v.id
        )
      limit 50
    loop
      -- Insertar match (ON CONFLICT por seguridad ante concurrencia)
      insert into buyer_radar_matches (radar_request_id, user_id, vehicle_id)
      values (rec.radar_id, rec.user_id, rec.vehicle_id)
      on conflict (radar_request_id, vehicle_id) do nothing;

      get diagnostics v_inserted = row_count;

      if v_inserted > 0 then
        -- Solo si el match es nuevo → crear notificación
        insert into buyer_notifications (
          user_id, type, title, body,
          entity_type, entity_id, severity,
          action_label, action_route, metadata
        ) values (
          rec.user_id,
          'radar_match',
          'Radar oX encontró una oportunidad',
          case
            when rec.brand is not null
              then 'Apareció una unidad compatible con tu búsqueda activa: '
                   || rec.brand
                   || coalesce(' ' || rec.model, '')
                   || coalesce(' (' || rec.year::text || ')', '')
                   || '.'
            else 'Apareció una unidad compatible con tu búsqueda activa.'
          end,
          'vehicle',
          rec.vehicle_id::text,
          'success',
          'Ver unidad',
          '/vehiculo/' || rec.vehicle_id::text,
          jsonb_build_object(
            'radar_request_id', rec.radar_id,
            'vehicle_brand',    rec.brand,
            'vehicle_model',    rec.model,
            'vehicle_year',     rec.year,
            'vehicle_price',    rec.price
          )
        ) returning id into v_notification_id;

        -- Vincular notificación al match para trazabilidad
        update buyer_radar_matches
        set notification_id = v_notification_id
        where radar_request_id = rec.radar_id
          and vehicle_id = rec.vehicle_id;

        v_count := v_count + 1;
      end if;
    end loop;

    return v_count;
  end;
  $$;

  ────────────────────────────────────────────────────────────────
  6. pg_cron — programación automática (Sprint 3, Camino A)
  ────────────────────────────────────────────────────────────────

  DIAGNÓSTICO DE INFRAESTRUCTURA
  ─────────────────────────────
  - Sin supabase/migrations ni supabase/functions en el proyecto.
  - Sin Supabase CLI en package.json.
  - .env.local tiene solo VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
    Sin service role key → Edge Functions requieren setup adicional.
  - pg_cron está disponible en Supabase Free y Pro desde 2023.
  - RECOMENDADO: Camino A (pg_cron). Camino B documentado al final.

  CAMINO A — pg_cron en Supabase SQL Editor
  ──────────────────────────────────────────
  Ejecutar en orden en el SQL Editor de Supabase.

  Nota: se usan dollar-quoting ($$...$$) para evitar conflictos de
  escape en strings SQL. No usar cron expression con "x/y" en este
  archivo JS ya que rompe el bloque de comentario.

  -- 1. Habilitar la extensión (si no está activa)
  create extension if not exists pg_cron;

  -- 2. Programar alertas diarias de VTV / seguro a las 08:00 UTC
  select cron.schedule(
    'buyer-due-alerts',
    '0 8 * * *',
    $$select public.process_buyer_garage_due_alerts();$$
  );

  -- 3. Programar Radar matching a las 0:00, 6:00, 12:00 y 18:00 UTC
  select cron.schedule(
    'buyer-radar-matches',
    '0 0,6,12,18 * * *',
    $$select public.process_buyer_radar_matches();$$
  );

  -- 4. Verificar jobs registrados
  select jobid, jobname, schedule, command, active
  from cron.job
  order by jobname;

  -- 5. Para desactivar (si hace falta)
  -- select cron.unschedule('buyer-due-alerts');
  -- select cron.unschedule('buyer-radar-matches');

  -- 6. Para ver historial de ejecuciones
  -- select jobid, status, start_time, end_time, return_message
  -- from cron.job_run_details
  -- order by start_time desc limit 20;

  CAMINO B — Edge Function (si pg_cron no estuviera disponible)
  ─────────────────────────────────────────────────────────────
  Requiere: Supabase CLI + service role key en secrets.
  No implementado todavía — documentado para referencia.

  Pasos:
  1. npm install -g supabase
  2. supabase login
  3. supabase init (si no existe el directorio)
  4. supabase functions new garage-ox-jobs
  5. Escribir handler en supabase/functions/garage-ox-jobs/index.ts
     que llame process_buyer_garage_due_alerts() y process_buyer_radar_matches()
     via supabaseAdmin (service role).
  6. supabase functions deploy garage-ox-jobs --no-verify-jwt
  7. Configurar cron en Supabase Dashboard → Edge Functions → Schedule.

  CAMINO C — frontend-trigger (activo, se mantiene como fallback)
  ───────────────────────────────────────────────────────────────
  BuyerPanel.jsx dispara processBuyerGarageDueAlerts() y
  processBuyerRadarMatches() en useEffect([authUser.id]).
  Las funciones tienen dedup incorporado → no generan duplicados
  aunque se llamen desde cron Y desde frontend en el mismo día.
  No eliminar este camino aunque pg_cron esté activo.

  ────────────────────────────────────────────────────────────────
  7. SPRINT 2 — buyer_profiles.user_id + trigger lead status
  ────────────────────────────────────────────────────────────────

  -- A) Agregar user_id a buyer_profiles y backfill desde auth.users
  --    Ejecutar en orden: primero ALTER, luego UPDATE.

  alter table public.buyer_profiles
    add column if not exists user_id uuid references auth.users(id) on delete set null;

  create index if not exists buyer_profiles_user_id_idx
    on public.buyer_profiles (user_id)
    where user_id is not null;

  -- Backfill desde auth.users por coincidencia de email (case-insensitive)
  -- Solo actualiza filas donde user_id todavía está vacío.
  update public.buyer_profiles bp
  set user_id = u.id
  from auth.users u
  where lower(bp.email) = lower(u.email)
    and bp.user_id is null;

  -- B) Función trigger para notificar al comprador cuando cambia crm_status

  create or replace function public.notify_buyer_on_lead_status_change()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_user_id    uuid;
    v_vehicle    text;
    v_title      text;
    v_body       text;
    v_severity   text;
    v_already    boolean;
  begin
    -- Solo procesar cuando el status realmente cambia
    if old.crm_status is not distinct from new.crm_status then
      return new;
    end if;

    -- Solo estados comerciales notificables al comprador
    if new.crm_status not in (
      'contacted', 'contactado',
      'reserved',
      'sold',
      'closed',
      'lost', 'no_response', 'cancelled', 'cancelado', 'perdido'
    ) then
      return new;
    end if;

    -- Resolver user_id del comprador desde buyer_profiles
    select bp.user_id into v_user_id
    from buyer_profiles bp
    where bp.id = new.buyer_id
      and bp.user_id is not null
    limit 1;

    -- Si no hay user_id (lead anónimo o perfil sin auth), salir sin notificar
    if v_user_id is null then
      return new;
    end if;

    -- Deduplicar: no volver a notificar mismo lead + mismo estado en 24h
    select exists (
      select 1 from buyer_notifications
      where user_id = v_user_id
        and type = 'lead_status_update'
        and metadata->>'lead_id' = new.id::text
        and metadata->>'new_status' = new.crm_status
        and created_at > now() - interval '24 hours'
    ) into v_already;

    if v_already then
      return new;
    end if;

    -- Construir etiqueta del vehículo (solo vehicle_title_snapshot disponible)
    v_vehicle := coalesce(nullif(trim(new.vehicle_title_snapshot), ''), 'el vehículo');

    -- Copy y severity según estado
    case new.crm_status
      when 'contacted', 'contactado' then
        v_title    := 'Tu consulta fue recibida';
        v_body     := 'El dealer ya tomó tu consulta sobre ' || v_vehicle || '.';
        v_severity := 'info';
      when 'reserved' then
        v_title    := 'La unidad fue marcada como reservada';
        v_body     := 'El dealer actualizó el estado de la unidad que consultaste: ' || v_vehicle || '.';
        v_severity := 'attention';
      when 'sold' then
        v_title    := 'La operación fue cerrada';
        v_body     := 'El estado de tu consulta sobre ' || v_vehicle || ' fue actualizado.';
        v_severity := 'success';
      when 'closed' then
        v_title    := 'Tu consulta fue actualizada';
        v_body     := 'El dealer cerró la gestión sobre ' || v_vehicle || '.';
        v_severity := 'info';
      else -- lost, no_response, cancelled y variantes
        v_title    := 'La consulta cambió de estado';
        v_body     := 'El dealer actualizó el estado de la consulta sobre ' || v_vehicle || '.';
        v_severity := 'info';
    end case;

    insert into buyer_notifications (
      user_id, type, title, body,
      entity_type, entity_id, severity,
      action_label, metadata
    ) values (
      v_user_id,
      'lead_status_update',
      v_title,
      v_body,
      'lead',
      new.id::text,
      v_severity,
      'Ver consulta',
      jsonb_build_object(
        'lead_id',       new.id,
        'vehicle_id',    new.vehicle_id,
        'old_status',    old.crm_status,
        'new_status',    new.crm_status,
        'vehicle_label', v_vehicle
      )
    );

    return new;
  end;
  $$;

  -- C) Registrar el trigger sobre vehicle_action_leads

  drop trigger if exists trg_notify_buyer_lead_status on public.vehicle_action_leads;

  create trigger trg_notify_buyer_lead_status
    after update of crm_status on public.vehicle_action_leads
    for each row
    execute function public.notify_buyer_on_lead_status_change();

  ────────────────────────────────────────────────────────────────
  FIN SQL
  ────────────────────────────────────────────────────────────────
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { withRetry } from "../lib/withRetry.js";

// ── Lectura de notificaciones ─────────────────────────────────────────

export async function listBuyerNotifications() {
  if (!isSupabaseConfigured || !supabase) {
    return { notifications: [], error: null };
  }

  const { data, error } = await withRetry(() =>
    supabase.rpc("get_buyer_notifications_for_current_user")
  );

  if (error) {
    console.warn("[buyer] notifications unavailable:", error.message);
    return { notifications: [], error: null };
  }

  return { notifications: data || [], error: null };
}

// ── Marcado de leídas ─────────────────────────────────────────────────

export async function markBuyerNotificationRead(notificationId) {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  const { error } = await supabase.rpc("mark_buyer_notification_read", {
    p_notification_id: notificationId,
  });

  return { error };
}

export async function markAllBuyerNotificationsRead() {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  const { error } = await supabase.rpc("mark_all_buyer_notifications_read");

  return { error };
}

// ── Procesos backend (frontend-trigger) ──────────────────────────────
// Devuelven { count, error: null } siempre — nunca rompen la UI.
// Si la RPC aún no está instalada, devuelven count=0 silenciosamente.

export async function processBuyerGarageDueAlerts() {
  if (!isSupabaseConfigured || !supabase) return { count: 0, error: null };

  const { data, error } = await supabase.rpc(
    "process_buyer_garage_due_alerts"
  );

  if (error) {
    if (import.meta.env.DEV) {
      console.warn("process_buyer_garage_due_alerts no disponible:", error.message);
    }
    return { count: 0, error: null };
  }

  return { count: data || 0, error: null };
}

export async function processBuyerRadarMatches() {
  if (!isSupabaseConfigured || !supabase) return { count: 0, error: null };

  const { data, error } = await supabase.rpc(
    "process_buyer_radar_matches"
  );

  if (error) {
    if (import.meta.env.DEV) {
      console.warn("process_buyer_radar_matches no disponible:", error.message);
    }
    return { count: 0, error: null };
  }

  return { count: data || 0, error: null };
}
