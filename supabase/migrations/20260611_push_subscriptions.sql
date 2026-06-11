-- ──────────────────────────────────────────────────────────────────────────
-- push_subscriptions: Web Push API subscriptions per authenticated user
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth_key   text        not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_unique unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;

-- users manage their own subscriptions; service_role bypasses RLS to send
create policy push_subscriptions_own
  on public.push_subscriptions
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
