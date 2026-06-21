-- ============================================================
-- Contraoferta v3: incluir contacto del dealer en vista del comprador
-- ============================================================

-- Actualizar list_contraofertas_for_buyer para incluir datos de contacto del dealer
-- (phone_whatsapp y commercial_name) para que el comprador pueda responder
-- a una contraoferta o coordinar una venta aceptada directamente.

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
  vehicle_price              integer,
  dealer_name                text,
  dealer_whatsapp            text
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
    v.price  as vehicle_price,
    coalesce(d.name, 'Concesionaria')              as dealer_name,
    coalesce(d.phone_whatsapp, d.contact_phone)   as dealer_whatsapp
  from public.vehicle_contraofertas c
  join public.vehicles v on v.id = c.vehicle_id
  left join public.dealers d on d.id = c.dealer_id
  where c.buyer_id = auth.uid()
  order by c.created_at desc;
$$;
