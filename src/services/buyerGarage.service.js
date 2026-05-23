import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

/*
Optional Supabase table for persistent Garage oX records:

create table if not exists buyer_garage_services (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  garage_vehicle_id text not null,
  service_date date not null,
  mileage integer,
  service_type text not null,
  cost numeric,
  notes text,
  created_at timestamptz not null default now()
);

alter table buyer_garage_services enable row level security;

create policy "buyer_garage_services_select" on buyer_garage_services
  for select using (auth.uid() = user_id);

create policy "buyer_garage_services_insert" on buyer_garage_services
  for insert with check (auth.uid() = user_id);

create policy "buyer_garage_services_delete" on buyer_garage_services
  for delete using (auth.uid() = user_id);

Direct vehicle assignment table/RPC for production Garage oX:

create table if not exists buyer_garage_vehicles (
  id bigserial primary key,
  buyer_profile_id bigint not null references buyer_profiles(id),
  vehicle_id bigint not null references vehicles(id),
  lead_id bigint references vehicle_action_leads(lead_id),
  dealer_id bigint references dealers(id),
  assigned_by uuid not null default auth.uid(),
  assigned_at timestamptz not null default now(),
  status text not null default 'active',
  assignment_note text,
  vehicle_snapshot jsonb not null default '{}'::jsonb,
  unique (buyer_profile_id, vehicle_id)
);

create or replace function public.assign_vehicle_to_buyer_garage(
  p_lead_id bigint,
  p_vehicle_id bigint,
  p_assignment_note text default null
)
returns buyer_garage_vehicles
language plpgsql
security definer
as $$
declare
  v_lead vehicle_action_leads%rowtype;
  v_dealer_id bigint;
  v_record buyer_garage_vehicles;
begin
  select id into v_dealer_id
  from dealers
  where user_id = auth.uid()
  limit 1;

  select * into v_lead
  from vehicle_action_leads
  where lead_id = p_lead_id
    and vehicle_id = p_vehicle_id
    and (dealer_id = v_dealer_id or exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    ))
  limit 1;

  if v_lead.lead_id is null then
    raise exception 'Lead no disponible para asignacion';
  end if;

  insert into buyer_garage_vehicles (
    buyer_profile_id,
    vehicle_id,
    lead_id,
    dealer_id,
    assignment_note,
    vehicle_snapshot
  )
  values (
    v_lead.buyer_id,
    v_lead.vehicle_id,
    v_lead.lead_id,
    coalesce(v_lead.dealer_id, v_dealer_id),
    p_assignment_note,
    jsonb_build_object(
      'title', v_lead.vehicle_title_snapshot,
      'brand', v_lead.vehicle_brand,
      'model', v_lead.vehicle_model,
      'version', v_lead.vehicle_version,
      'price', v_lead.price_snapshot,
      'dealer', v_lead.dealer_name_snapshot
    )
  )
  on conflict (buyer_profile_id, vehicle_id)
  do update set
    lead_id = excluded.lead_id,
    dealer_id = excluded.dealer_id,
    assigned_by = auth.uid(),
    assigned_at = now(),
    status = 'active',
    assignment_note = excluded.assignment_note,
    vehicle_snapshot = buyer_garage_vehicles.vehicle_snapshot || excluded.vehicle_snapshot
  returning * into v_record;

  return v_record;
end;
$$;

create or replace function public.get_buyer_garage_vehicles_for_current_user()
returns setof buyer_garage_vehicles
language sql
security definer
as $$
  select bgv.*
  from buyer_garage_vehicles bgv
  join buyer_profiles bp on bp.id = bgv.buyer_profile_id
  where lower(bp.email) = lower((select email from auth.users where id = auth.uid()))
  order by bgv.assigned_at desc;
$$;
*/

function getStorageKey(userId) {
  return `ox_garage_services_${userId || "anonymous"}`;
}

function readLocal(userId) {
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(userId, records) {
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(records));
  } catch {
    // localStorage can fail in private mode; UI will keep working in memory after refresh loss.
  }
}

function normalizeRecord(row) {
  return {
    id: row.id || row.local_id || crypto.randomUUID(),
    garageVehicleId: row.garage_vehicle_id || row.garageVehicleId,
    serviceDate: row.service_date || row.serviceDate,
    mileage: row.mileage ?? "",
    serviceType: row.service_type || row.serviceType || "",
    cost: row.cost ?? "",
    notes: row.notes || "",
    source: row.source || "supabase",
  };
}

function normalizeGarageVehicle(row) {
  const snapshot = row.vehicle_snapshot || row.snapshot || {};
  const title = [snapshot.brand, snapshot.model, snapshot.version]
    .filter(Boolean)
    .join(" ");

  return {
    id: String(row.id || row.garage_vehicle_id || row.vehicle_id || row.lead_id),
    garageAssignmentId: row.id,
    vehicleId: row.vehicle_id || snapshot.vehicle_id,
    leadId: row.lead_id || snapshot.lead_id,
    title: title || snapshot.title || row.vehicle_title || "Vehiculo asignado",
    price: snapshot.price ?? row.price_snapshot ?? row.price,
    dealer: snapshot.dealer || row.dealer_name || row.dealer_name_snapshot || "Dealer",
    status: row.status || "active",
    createdAt: row.assigned_at || row.created_at,
    assignedAt: row.assigned_at || row.created_at,
    source: row.source || "supabase",
  };
}

export async function listBuyerGarageVehicles() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicles: [],
      error: null,
      source: "unconfigured",
    };
  }

  const { data, error } = await supabase.rpc(
    "get_buyer_garage_vehicles_for_current_user"
  );

  if (error) {
    if (import.meta.env.DEV) {
      console.warn("No se pudieron cargar unidades asignadas a Garage oX.", error);
    }

    return {
      vehicles: [],
      error,
      source: "supabase",
    };
  }

  return {
    vehicles: (data || []).map(normalizeGarageVehicle),
    error: null,
    source: "supabase",
  };
}

export async function assignVehicleToBuyerGarage({ leadId, vehicleId, note = null }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      assignment: null,
      error: {
        message: "Supabase no esta configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("assign_vehicle_to_buyer_garage", {
    p_lead_id: leadId,
    p_vehicle_id: Number(vehicleId),
    p_assignment_note: note,
  });

  return {
    assignment: data ? normalizeGarageVehicle(data) : null,
    error,
  };
}

export async function listBuyerGarageServices({ userId }) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("buyer_garage_services")
      .select("*")
      .order("service_date", { ascending: false });

    if (!error) {
      return {
        services: (data || []).map(normalizeRecord),
        error: null,
        source: "supabase",
      };
    }
  }

  return {
    services: readLocal(userId).map(normalizeRecord),
    error: null,
    source: "local",
  };
}

export async function createBuyerGarageService({ userId, service }) {
  const payload = {
    garage_vehicle_id: service.garageVehicleId,
    service_date: service.serviceDate,
    mileage: service.mileage ? Number(service.mileage) : null,
    service_type: service.serviceType,
    cost: service.cost ? Number(service.cost) : null,
    notes: service.notes || null,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("buyer_garage_services")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return {
        service: normalizeRecord(data),
        error: null,
        source: "supabase",
      };
    }
  }

  const localRecord = normalizeRecord({
    ...payload,
    local_id: crypto.randomUUID(),
    source: "local",
  });
  const next = [localRecord, ...readLocal(userId)];
  writeLocal(userId, next);

  return {
    service: localRecord,
    error: null,
    source: "local",
  };
}
