-- Tabla de page views para analytics del sitio público
create table if not exists public.site_page_views (
  id           uuid primary key default gen_random_uuid(),
  page         text,
  route        text,
  user_role    text,
  visitor_id   text,
  session_id   text,
  referrer     text,
  user_agent   text,
  visited_at   timestamptz not null default now()
);

-- Índices para las queries más frecuentes (rango de fecha, visitor, sesión)
create index if not exists site_page_views_visited_at_idx on public.site_page_views (visited_at desc);
create index if not exists site_page_views_visitor_idx   on public.site_page_views (visitor_id);

-- RLS: admins leen todo, cualquier usuario (incluido anon) puede insertar
alter table public.site_page_views enable row level security;

create policy "admin_read_site_page_views"
  on public.site_page_views for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "anon_insert_site_page_views"
  on public.site_page_views for insert
  with check (true);

-- Función RPC: registra un page view desde el cliente
create or replace function public.track_site_page_view(
  p_page       text,
  p_route      text,
  p_user_role  text default null,
  p_visitor_id text default null,
  p_session_id text default null,
  p_referrer   text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.site_page_views (page, route, user_role, visitor_id, session_id, referrer, user_agent)
  values (p_page, p_route, p_user_role, p_visitor_id, p_session_id, p_referrer, p_user_agent);
end;
$$;

-- Permitir que usuarios anónimos llamen al RPC
grant execute on function public.track_site_page_view to anon, authenticated;
