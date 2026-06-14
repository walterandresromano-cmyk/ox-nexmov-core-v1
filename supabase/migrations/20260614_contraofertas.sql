-- ============================================================
-- Contraoferta feature
-- ============================================================

-- 1. Add contraoferta config columns to vehicles (private to dealer)
alter table public.vehicles
  add column if not exists contraoferta_habilitada boolean not null default false,
  add column if not exists precio_min_contraoferta integer,
  add column if not exists precio_max_contraoferta integer;

-- 2. Table for buyer counter-offers
create table if not exists public.vehicle_contraofertas (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      bigint  not null references public.vehicles(id) on delete cascade,
  dealer_id       bigint  references public.dealers(id),
  buyer_id        uuid    references auth.users(id) on delete set null,
  buyer_name      text,
  buyer_phone     text,
  precio_ofertado integer not null,
  status          text    not null default 'pendiente'
                  check (status in ('pendiente','aceptada','rechazada')),
  dealer_note     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_contraofertas_vehicle   on public.vehicle_contraofertas(vehicle_id);
create index if not exists idx_contraofertas_dealer    on public.vehicle_contraofertas(dealer_id);
create index if not exists idx_contraofertas_buyer     on public.vehicle_contraofertas(buyer_id);

alter table public.vehicle_contraofertas enable row level security;

-- Buyers can insert on vehicles with contraoferta enabled
create policy "buyers_insert_contraoferta"
  on public.vehicle_contraofertas for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.vehicles
      where id = vehicle_id and contraoferta_habilitada = true
    )
  );

-- Authenticated buyers can read their own offers
create policy "buyers_read_own_contraoferta"
  on public.vehicle_contraofertas for select
  to authenticated
  using (buyer_id = auth.uid());

-- Dealers can read offers on their vehicles
create policy "dealers_read_contraoferta"
  on public.vehicle_contraofertas for select
  to authenticated
  using (
    dealer_id in (
      select id from public.dealers where profile_id = auth.uid()
    )
  );

-- Dealers can update status/note on their vehicles' offers
create policy "dealers_update_contraoferta"
  on public.vehicle_contraofertas for update
  to authenticated
  using (
    dealer_id in (
      select id from public.dealers where profile_id = auth.uid()
    )
  )
  with check (true);

-- Admin full access
create policy "admin_all_contraoferta"
  on public.vehicle_contraofertas for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. RPC: dealer sets contraoferta settings on their vehicle
create or replace function public.set_vehicle_contraoferta(
  p_vehicle_id        bigint,
  p_habilitada        boolean,
  p_precio_min        integer default null,
  p_precio_max        integer default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.vehicles
  set
    contraoferta_habilitada = p_habilitada,
    precio_min_contraoferta = p_precio_min,
    precio_max_contraoferta = p_precio_max
  where
    id = p_vehicle_id
    and dealer_id in (
      select id from public.dealers where profile_id = auth.uid()
    );

  if not found then
    raise exception 'Vehículo no encontrado o no pertenece al dealer actual';
  end if;
end;
$$;

-- 4. RPC: buyer submits a counter-offer
create or replace function public.create_contraoferta(
  p_vehicle_id      bigint,
  p_buyer_name      text,
  p_buyer_phone     text,
  p_precio_ofertado integer
)
returns public.vehicle_contraofertas
language plpgsql
security definer
as $$
declare
  v_vehicle public.vehicles;
  v_result  public.vehicle_contraofertas;
begin
  select * into v_vehicle from public.vehicles where id = p_vehicle_id;

  if not found then
    raise exception 'Vehículo no encontrado';
  end if;

  if not v_vehicle.contraoferta_habilitada then
    raise exception 'Este vehículo no acepta contraofertas';
  end if;

  if p_precio_ofertado <= 0 then
    raise exception 'El precio ofertado debe ser mayor a cero';
  end if;

  insert into public.vehicle_contraofertas (
    vehicle_id, dealer_id, buyer_id, buyer_name, buyer_phone, precio_ofertado
  ) values (
    p_vehicle_id,
    v_vehicle.dealer_id,
    auth.uid(),
    nullif(trim(p_buyer_name), ''),
    nullif(trim(p_buyer_phone), ''),
    p_precio_ofertado
  )
  returning * into v_result;

  return v_result;
end;
$$;

-- 5. RPC: dealer responds to a counter-offer
create or replace function public.respond_contraoferta(
  p_id          uuid,
  p_status      text,
  p_dealer_note text default null
)
returns void
language plpgsql
security definer
as $$
begin
  if p_status not in ('aceptada', 'rechazada') then
    raise exception 'Estado inválido: usar aceptada o rechazada';
  end if;

  update public.vehicle_contraofertas
  set
    status      = p_status,
    dealer_note = coalesce(p_dealer_note, dealer_note),
    updated_at  = now()
  where
    id = p_id
    and dealer_id in (
      select id from public.dealers where profile_id = auth.uid()
    );

  if not found then
    raise exception 'Contraoferta no encontrada o no pertenece al dealer';
  end if;
end;
$$;

-- 6. RPC: list contraofertas for current dealer
create or replace function public.list_contraofertas_for_dealer()
returns table (
  id              uuid,
  vehicle_id      bigint,
  buyer_id        uuid,
  buyer_name      text,
  buyer_phone     text,
  precio_ofertado integer,
  status          text,
  dealer_note     text,
  created_at      timestamptz,
  updated_at      timestamptz,
  vehicle_brand   text,
  vehicle_model   text,
  vehicle_version text,
  vehicle_year    integer,
  vehicle_price   integer
)
language sql
security definer
as $$
  select
    c.id,
    c.vehicle_id,
    c.buyer_id,
    c.buyer_name,
    c.buyer_phone,
    c.precio_ofertado,
    c.status,
    c.dealer_note,
    c.created_at,
    c.updated_at,
    v.brand        as vehicle_brand,
    v.model        as vehicle_model,
    v.version      as vehicle_version,
    v.year         as vehicle_year,
    v.price        as vehicle_price
  from public.vehicle_contraofertas c
  join public.vehicles v on v.id = c.vehicle_id
  where c.dealer_id in (
    select id from public.dealers where profile_id = auth.uid()
  )
  order by c.created_at desc;
$$;
