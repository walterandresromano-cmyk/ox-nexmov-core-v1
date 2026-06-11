-- ──────────────────────────────────────────────────────────────────────────
-- ticket_messages: threaded chat replies on support tickets
-- Run in Supabase SQL editor or via `supabase db push`
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.ticket_messages (
  id          bigint generated always as identity primary key,
  ticket_id   bigint      not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid        not null default auth.uid(),
  sender_role text        not null default 'dealer',
  sender_name text,
  content     text        not null,
  created_at  timestamptz not null default now(),
  constraint ticket_messages_content_length
    check (char_length(content) between 1 and 2000)
);

create index if not exists ticket_messages_ticket_id_idx
  on public.ticket_messages (ticket_id);

create index if not exists ticket_messages_created_at_idx
  on public.ticket_messages (created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────

alter table public.ticket_messages enable row level security;

drop policy if exists "ticket_messages_select" on public.ticket_messages;
drop policy if exists "ticket_messages_insert" on public.ticket_messages;

-- SELECT: ticket creator or admin/support
create policy "ticket_messages_select"
  on public.ticket_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_messages.ticket_id
        and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'support', 'soporte')
    )
  );

-- INSERT: sender must be authenticated and have access to the ticket
create policy "ticket_messages_insert"
  on public.ticket_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1 from public.support_tickets t
        where t.id = ticket_messages.ticket_id
          and t.created_by = auth.uid()
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'support', 'soporte')
      )
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────
-- Run this separately if the above already succeeded once:
alter publication supabase_realtime add table public.ticket_messages;
