-- ─────────────────────────────────────────────────────────────────────────────
-- buyer_notifications + buyer_radar_matches + RPCs de procesamiento
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. TABLA buyer_notifications ─────────────────────────────────────────────

create table if not exists buyer_notifications (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null,
  type         text        not null,
  title        text        not null,
  body         text        not null,
  entity_type  text,
  entity_id    text,
  severity     text        not null default 'info',
  is_read      boolean     not null default false,
  action_label text,
  action_route text,
  metadata     jsonb       not null default '{}',
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

-- types: radar_match | vtv_due | insurance_due | maintenance_due
--        lead_status_update | garage_update | system
-- severity: info | attention | urgent | success

alter table buyer_notifications enable row level security;

drop policy if exists "buyer_notifications_select" on buyer_notifications;
create policy "buyer_notifications_select" on buyer_notifications
  for select using (auth.uid() = user_id);

drop policy if exists "buyer_notifications_update" on buyer_notifications;
create policy "buyer_notifications_update" on buyer_notifications
  for update using (auth.uid() = user_id);

-- Sin INSERT policy directa: solo funciones security definer pueden insertar.

create index if not exists buyer_notifications_user_id_idx
  on buyer_notifications (user_id, created_at desc);


-- 2. TABLA buyer_radar_matches ──────────────────────────────────────────────

create table if not exists buyer_radar_matches (
  id                uuid    primary key default gen_random_uuid(),
  radar_request_id  bigint  not null,
  user_id           uuid    not null,
  vehicle_id        bigint  not null,
  notification_id   uuid,
  created_at        timestamptz not null default now(),
  unique (radar_request_id, vehicle_id)
);

alter table buyer_radar_matches enable row level security;

drop policy if exists "buyer_radar_matches_select" on buyer_radar_matches;
create policy "buyer_radar_matches_select" on buyer_radar_matches
  for select using (auth.uid() = user_id);

create index if not exists buyer_radar_matches_user_id_idx
  on buyer_radar_matches (user_id, created_at desc);


-- 3. RPCs lectura y marcado de leídas ────────────────────────────────────────

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


-- 4. process_buyer_garage_due_alerts() ────────────────────────────────────────
-- Revisa vtv_due_date e insurance_due_date en buyer_garage_owned_vehicles.
-- Dedup: no crea duplicados en ventana de 3 días.

create or replace function process_buyer_garage_due_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec        record;
  v_days     integer;
  v_window   text;
  v_severity text;
  v_title    text;
  v_body     text;
  v_count    integer := 0;
  v_inserted integer;
begin
  for rec in
    select id, user_id, brand, model, year,
           vtv_due_date, insurance_due_date
    from buyer_garage_owned_vehicles
    where vtv_due_date is not null
       or insurance_due_date is not null
  loop

    -- VTV ──────────────────────────────────────────────────────────────────
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
            'window',            v_window,
            'due_date',          rec.vtv_due_date::text,
            'days_until',        v_days,
            'garage_vehicle_id', rec.id
          )
        );

        get diagnostics v_inserted = row_count;
        v_count := v_count + v_inserted;
      end if;
    end if;

    -- Seguro ───────────────────────────────────────────────────────────────
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
            'window',            v_window,
            'due_date',          rec.insurance_due_date::text,
            'days_until',        v_days,
            'garage_vehicle_id', rec.id
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


-- 5. process_buyer_radar_matches() ─────────────────────────────────────────────
-- Cruza buyer_radar_requests activos contra vehicles públicos.
-- Inserta en buyer_radar_matches (UNIQUE radar_request_id, vehicle_id).
-- Crea buyer_notifications tipo radar_match solo para matches nuevos.
-- Límite de 50 matches por ejecución para evitar spam.
-- NOTA: usa filters->>'vehicleType' (no 'bodyType') para coincidir con
--       el estado de filtros del frontend.

create or replace function process_buyer_radar_matches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec               record;
  v_notification_id uuid;
  v_count           integer := 0;
  v_inserted        integer;
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
      -- Filtros de texto
      and (r.filters->>'brand' is null or r.filters->>'brand' = ''
           or lower(v.brand) = lower(r.filters->>'brand'))
      and (r.filters->>'model' is null or r.filters->>'model' = ''
           or lower(v.model) like '%' || lower(r.filters->>'model') || '%')
      and (r.filters->>'province' is null or r.filters->>'province' = ''
           or lower(v.province) = lower(r.filters->>'province'))
      and (r.filters->>'fuel' is null or r.filters->>'fuel' = ''
           or lower(v.fuel_type) = lower(r.filters->>'fuel'))
      and (r.filters->>'transmission' is null or r.filters->>'transmission' = ''
           or lower(v.transmission) = lower(r.filters->>'transmission'))
      -- vehicleType (clave correcta del frontend, mapea a body_type en la DB)
      and (r.filters->>'vehicleType' is null or r.filters->>'vehicleType' = ''
           or lower(v.body_type) like '%' || lower(r.filters->>'vehicleType') || '%')
      -- Precio máximo del parsed_intent
      and (r.parsed_intent->>'maxPrice' is null or r.parsed_intent->>'maxPrice' = ''
           or v.price <= (r.parsed_intent->>'maxPrice')::numeric)
      -- Km máximo
      and (r.parsed_intent->>'maxKm' is null or r.parsed_intent->>'maxKm' = ''
           or v.km <= (r.parsed_intent->>'maxKm')::integer)
      -- Años deseados
      and (
        r.parsed_intent->'years' is null
        or jsonb_array_length(r.parsed_intent->'years') = 0
        or v.year::text = any(
             array(select jsonb_array_elements_text(r.parsed_intent->'years'))
           )
      )
      -- Dedup: solo vehicles que aún no fueron matcheados para este radar
      and not exists (
        select 1 from buyer_radar_matches m
        where m.radar_request_id = r.id
          and m.vehicle_id = v.id
      )
    limit 50
  loop
    -- Registrar el match (ON CONFLICT por seguridad ante concurrencia)
    insert into buyer_radar_matches (radar_request_id, user_id, vehicle_id)
    values (rec.radar_id, rec.user_id, rec.vehicle_id)
    on conflict (radar_request_id, vehicle_id) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted > 0 then
      -- Crear notificación solo para matches nuevos
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
        '/buscar',
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


-- 6. pg_cron — scheduling automático ──────────────────────────────────────────
-- Ejecutar SOLO si pg_cron está habilitado en el proyecto de Supabase.
-- Verificar en: Dashboard → Database → Extensions → pg_cron.
--
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'buyer-due-alerts',
--   '0 8 * * *',
--   $$select public.process_buyer_garage_due_alerts();$$
-- );
--
-- select cron.schedule(
--   'buyer-radar-matches',
--   '0 0,6,12,18 * * *',
--   $$select public.process_buyer_radar_matches();$$
-- );
