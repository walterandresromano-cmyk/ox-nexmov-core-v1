-- Add leads_count column to vehicles and keep it synced via trigger

alter table public.vehicles
  add column if not exists leads_count integer not null default 0;

-- Backfill current counts
update public.vehicles v
set leads_count = (
  select count(*)::integer
  from public.vehicle_action_leads l
  where l.vehicle_id = v.id
);

-- Trigger function to keep leads_count in sync
create or replace function public.sync_vehicle_leads_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.vehicles
    set leads_count = leads_count + 1
    where id = NEW.vehicle_id;
  elsif (TG_OP = 'DELETE') then
    update public.vehicles
    set leads_count = greatest(0, leads_count - 1)
    where id = OLD.vehicle_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_vehicle_leads_count on public.vehicle_action_leads;

create trigger trg_sync_vehicle_leads_count
  after insert or delete on public.vehicle_action_leads
  for each row execute function public.sync_vehicle_leads_count();
