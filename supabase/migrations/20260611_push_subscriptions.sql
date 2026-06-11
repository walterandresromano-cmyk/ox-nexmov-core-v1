-- ──────────────────────────────────────────────────────────────────────────
-- push_subscriptions: Web Push API subscriptions per dealer
-- Schema matches production: dealer_id bigint, auth text (not auth_key)
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  dealer_id  bigint      not null references public.dealers(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_unique unique (dealer_id, endpoint)
);

create index if not exists push_subscriptions_dealer_id_idx
  on public.push_subscriptions (dealer_id);

-- Used by the expired-subscription cleanup (DELETE WHERE endpoint IN (...))
create index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);

-- ── Row Level Security ────────────────────────────────────────────────────

alter table public.push_subscriptions enable row level security;

drop policy if exists "Dealers manage own push subscriptions"
  on public.push_subscriptions;

create policy "Dealers manage own push subscriptions"
  on public.push_subscriptions
  for all to authenticated
  using (
    exists (
      select 1 from public.dealers d
      where d.id = push_subscriptions.dealer_id
        and d.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.dealers d
      where d.id = push_subscriptions.dealer_id
        and d.profile_id = auth.uid()
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────
-- Run separately if the table already exists:
-- alter publication supabase_realtime add table public.push_subscriptions;
