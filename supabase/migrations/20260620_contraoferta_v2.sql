-- ============================================================
-- Contraoferta v2: counter-offer, expiry, buyer notifications
-- ============================================================

-- 1. Nuevas columnas
alter table public.vehicle_contraofertas
  add column if not exists dealer_precio_contraoferta integer;

-- 2. Ampliar status check para incluir 'contraofertada' y 'expirada'
alter table public.vehicle_contraofertas
  drop constraint if exists vehicle_contraofertas_status_check;

alter table public.vehicle_contraofertas
  add constraint vehicle_contraofertas_status_check
  check (status in ('pendiente', 'aceptada', 'rechazada', 'contraofertada', 'expirada'));

-- 3. RPC: notificar al comprador cuando el dealer responde
create or replace function public.notify_buyer_contraoferta_response(
  p_contraoferta_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec      record;
  v_title    text;
  v_body     text;
  v_severity text;
begin
  select
    c.buyer_id, c.status, c.dealer_precio_contraoferta, c.dealer_note,
    v.brand, v.model
  into v_rec
  from public.vehicle_contraofertas c
  join public.vehicles v on v.id = c.vehicle_id
  where c.id = p_contraoferta_id;

  if not found or v_rec.buyer_id is null then return; end if;

  -- Dedup: una sola notificación por respuesta
  if exists (
    select 1 from buyer_notifications
    where user_id = v_rec.buyer_id
      and metadata->>'contraoferta_id' = p_contraoferta_id::text
  ) then return; end if;

  case v_rec.status
    when 'aceptada' then
      v_title    := 'Tu oferta fue aceptada';
      v_body     := 'El dealer aceptó tu oferta por el '
                    || coalesce(v_rec.brand, '') || ' ' || coalesce(v_rec.model, '')
                    || '. Te contactarán a la brevedad.';
      v_severity := 'success';
    when 'rechazada' then
      v_title    := 'Tu oferta fue rechazada';
      v_body     := 'El dealer rechazó tu oferta por el '
                    || coalesce(v_rec.brand, '') || ' ' || coalesce(v_rec.model, '') || '.'
                    || case when v_rec.dealer_note is not null
                            then ' Nota: ' || v_rec.dealer_note else '' end;
      v_severity := 'info';
    when 'contraofertada' then
      v_title    := 'El dealer te envió una contraoferta';
      v_body     := 'El dealer propone $'
                    || to_char(v_rec.dealer_precio_contraoferta, 'FM999,999,999')
                    || ' por el ' || coalesce(v_rec.brand, '') || ' ' || coalesce(v_rec.model, '') || '.';
      v_severity := 'attention';
    else return;
  end case;

  insert into buyer_notifications (
    user_id, type, title, body,
    entity_type, entity_id, severity,
    action_label, action_route, metadata
  ) values (
    v_rec.buyer_id,
    'contraoferta_response',
    v_title, v_body,
    'contraoferta', p_contraoferta_id::text,
    v_severity,
    'Ver mis ofertas',
    '/mi-perfil',
    jsonb_build_object(
      'contraoferta_id', p_contraoferta_id,
      'status',          v_rec.status,
      'dealer_precio',   v_rec.dealer_precio_contraoferta
    )
  );
end;
$$;

-- 4. RPC: respond_contraoferta actualizado (acepta contraoferta del dealer + notifica)
create or replace function public.respond_contraoferta(
  p_id            uuid,
  p_status        text,
  p_dealer_note   text    default null,
  p_dealer_precio integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('aceptada', 'rechazada', 'contraofertada') then
    raise exception 'Estado inválido: usar aceptada, rechazada o contraofertada';
  end if;

  if p_status = 'contraofertada' and (p_dealer_precio is null or p_dealer_precio <= 0) then
    raise exception 'El estado contraofertada requiere un precio válido';
  end if;

  update public.vehicle_contraofertas
  set
    status                     = p_status,
    dealer_note                = coalesce(p_dealer_note, dealer_note),
    dealer_precio_contraoferta = case
                                   when p_status = 'contraofertada' then p_dealer_precio
                                   else dealer_precio_contraoferta
                                 end,
    updated_at                 = now()
  where
    id        = p_id
    and status = 'pendiente'
    and dealer_id in (
      select id from public.dealers where profile_id = auth.uid()
    );

  if not found then
    raise exception 'Contraoferta no encontrada, no pertenece al dealer, o ya fue resuelta';
  end if;

  perform public.notify_buyer_contraoferta_response(p_id);
end;
$$;

-- 5. RPC: list para dealer — incluye nuevos campos + lazy expiry
create or replace function public.list_contraofertas_for_dealer()
returns table (
  id                         uuid,
  vehicle_id                 bigint,
  buyer_id                   uuid,
  buyer_name                 text,
  buyer_phone                text,
  precio_ofertado            integer,
  dealer_precio_contraoferta integer,
  status                     text,
  dealer_note                text,
  expires_at                 timestamptz,
  created_at                 timestamptz,
  updated_at                 timestamptz,
  vehicle_brand              text,
  vehicle_model              text,
  vehicle_version            text,
  vehicle_year               integer,
  vehicle_price              integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Lazy expiry: marcar como expiradas las pendientes de más de 30 días
  update public.vehicle_contraofertas
  set status = 'expirada', updated_at = now()
  where status    = 'pendiente'
    and created_at < now() - interval '30 days'
    and dealer_id in (
      select id from public.dealers where profile_id = auth.uid()
    );

  return query
  select
    c.id,
    c.vehicle_id,
    c.buyer_id,
    c.buyer_name,
    c.buyer_phone,
    c.precio_ofertado,
    c.dealer_precio_contraoferta,
    c.status,
    c.dealer_note,
    (c.created_at + interval '30 days') as expires_at,
    c.created_at,
    c.updated_at,
    v.brand  as vehicle_brand,
    v.model  as vehicle_model,
    v.version as vehicle_version,
    v.year   as vehicle_year,
    v.price  as vehicle_price
  from public.vehicle_contraofertas c
  join public.vehicles v on v.id = c.vehicle_id
  where c.dealer_id in (
    select id from public.dealers where profile_id = auth.uid()
  )
  order by c.created_at desc;
end;
$$;

-- 6. RPC: list para buyer — ve el estado de sus propias ofertas
create or replace function public.list_contraofertas_for_buyer()
returns table (
  id                         uuid,
  vehicle_id                 bigint,
  precio_ofertado            integer,
  dealer_precio_contraoferta integer,
  status                     text,
  dealer_note                text,
  expires_at                 timestamptz,
  created_at                 timestamptz,
  vehicle_brand              text,
  vehicle_model              text,
  vehicle_year               integer,
  vehicle_price              integer
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.vehicle_id,
    c.precio_ofertado,
    c.dealer_precio_contraoferta,
    c.status,
    c.dealer_note,
    (c.created_at + interval '30 days') as expires_at,
    c.created_at,
    v.brand  as vehicle_brand,
    v.model  as vehicle_model,
    v.year   as vehicle_year,
    v.price  as vehicle_price
  from public.vehicle_contraofertas c
  join public.vehicles v on v.id = c.vehicle_id
  where c.buyer_id = auth.uid()
  order by c.created_at desc;
$$;
