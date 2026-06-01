import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

/*
Optional Supabase table for persistent Garage oX records:

create table if not exists buyer_garage_owned_vehicles (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  brand text not null,
  model text not null,
  version text,
  year integer,
  km integer,
  plate text,
  province text,
  city text,
  expected_price numeric,
  condition text,
  vtv_due_date date,
  insurance_due_date date,
  insurance_company text,
  policy_number text,
  notes text,
  status text not null default 'owned',
  created_at timestamptz not null default now()
);

alter table buyer_garage_owned_vehicles enable row level security;

create policy "buyer_garage_owned_vehicles_select" on buyer_garage_owned_vehicles
  for select using (auth.uid() = user_id);

create policy "buyer_garage_owned_vehicles_insert" on buyer_garage_owned_vehicles
  for insert with check (auth.uid() = user_id);

create policy "buyer_garage_owned_vehicles_update" on buyer_garage_owned_vehicles
  for update using (auth.uid() = user_id);

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
  lead_id bigint references vehicle_action_leads(id),
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
    raise exception 'Lead no disponible para asignación';
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

function getVehicleStorageKey(userId) {
  return `ox_garage_vehicles_${userId || "anonymous"}`;
}

function getVehicleOverrideStorageKey(userId) {
  return `ox_garage_vehicle_overrides_${userId || "anonymous"}`;
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

function readLocalVehicles(userId) {
  try {
    const raw = window.localStorage.getItem(getVehicleStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalVehicles(userId, records) {
  try {
    window.localStorage.setItem(getVehicleStorageKey(userId), JSON.stringify(records));
  } catch {
    // localStorage can fail in private mode; UI will keep working in memory after refresh loss.
  }
}

function readLocalVehicleOverrides(userId) {
  try {
    const raw = window.localStorage.getItem(getVehicleOverrideStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalVehicleOverrides(userId, records) {
  try {
    window.localStorage.setItem(getVehicleOverrideStorageKey(userId), JSON.stringify(records));
  } catch {
    // localStorage can fail in private mode; UI will keep working without photo overrides.
  }
}

function upsertLocalVehicleOverride(userId, vehicleId, override) {
  if (!vehicleId) return;
  const current = readLocalVehicleOverrides(userId);
  writeLocalVehicleOverrides(userId, {
    ...current,
    [String(vehicleId)]: {
      ...(current[String(vehicleId)] || {}),
      ...override,
    },
  });
}

function applyLocalVehicleOverrides(userId, vehicles) {
  const overrides = readLocalVehicleOverrides(userId);
  return (vehicles || []).map((vehicle) => ({
    ...vehicle,
    ...(overrides[String(vehicle.id)] || {}),
  }));
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const cleaned = String(value)
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeFileName(name) {
  return String(name || "garage-photo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function getGarageVehicleDbId(vehicleId) {
  const rawId = String(vehicleId || "").replace(/^own-/, "");
  const parsed = Number(rawId);
  return Number.isFinite(parsed) ? parsed : null;
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

  const PRESET_XY = { center: [50,50], top: [50,0], bottom: [50,100], left: [0,50], right: [100,50] };
  function resolvePosition(xKey, yKey, legacyKey) {
    const xRaw = xKey != null ? Number(xKey) : NaN;
    const yRaw = yKey != null ? Number(yKey) : NaN;
    if (Number.isFinite(xRaw) && Number.isFinite(yRaw)) return [xRaw, yRaw];
    const preset = String(legacyKey || "").toLowerCase();
    return PRESET_XY[preset] || [50, 50];
  }
  const [px, py] = resolvePosition(
    row.image_position_x ?? row.imagePositionX ?? snapshot.image_position_x ?? snapshot.imagePositionX,
    row.image_position_y ?? row.imagePositionY ?? snapshot.image_position_y ?? snapshot.imagePositionY,
    row.image_position || row.imagePosition || snapshot.image_position || snapshot.imagePosition
  );

  return {
    id: String(row.id || row.garage_vehicle_id || row.vehicle_id || row.lead_id),
    garageAssignmentId: row.id,
    vehicleId: row.vehicle_id || snapshot.vehicle_id,
    leadId: row.lead_id || snapshot.lead_id,
    title: title || snapshot.title || row.vehicle_title || "Vehículo asignado",
    price:
      snapshot.price ??
      row.price_snapshot ??
      row.price ??
      snapshot.expected_price ??
      row.expected_price ??
      row.expectedPrice,
    dealer: snapshot.dealer || row.dealer_name || row.dealer_name_snapshot || "Dealer",
    status: row.status || "active",
    createdAt: row.assigned_at || row.created_at,
    assignedAt: row.assigned_at || row.created_at,
    brand: snapshot.brand || row.brand || "",
    model: snapshot.model || row.model || "",
    version: snapshot.version || row.version || "",
    year: snapshot.year || row.year || "",
    km: snapshot.km || row.km || "",
    plate: snapshot.plate || row.plate || "",
    province: snapshot.province || row.province || "",
    city: snapshot.city || row.city || "",
    expectedPrice: snapshot.expected_price ?? row.expected_price ?? row.expectedPrice ?? "",
    condition: snapshot.condition || row.condition || "",
    vtvDueDate: snapshot.vtv_due_date || row.vtv_due_date || row.vtvDueDate || "",
    insuranceDueDate: snapshot.insurance_due_date || row.insurance_due_date || row.insuranceDueDate || "",
    insuranceCompany: snapshot.insurance_company || row.insurance_company || row.insuranceCompany || "",
    policyNumber: snapshot.policy_number || row.policy_number || row.policyNumber || "",
    notes: snapshot.notes || row.notes || "",
    photoUrl:
      snapshot.photo_url ||
      snapshot.image_url ||
      row.photo_url ||
      row.image_url ||
      row.photoUrl ||
      "",
    imagePositionX: Math.max(0, Math.min(100, px)),
    imagePositionY: Math.max(0, Math.min(100, py)),
    source: row.source || "supabase",
  };
}

function normalizeOwnedGarageVehicle(row) {
  const id = row.id || row.local_id || row.localId || crypto.randomUUID();
  const ownId = String(id).startsWith("own-") ? String(id) : `own-${id}`;
  const title = [row.brand, row.model, row.version].filter(Boolean).join(" ");

  return normalizeGarageVehicle({
    ...row,
    id: ownId,
    garage_vehicle_id: ownId,
    vehicle_title: title || "Vehículo propio",
    image_position_x: row.image_position_x ?? row.imagePositionX,
    image_position_y: row.image_position_y ?? row.imagePositionY,
    image_position: row.image_position || row.imagePosition,
    vehicle_snapshot: {
      title: title || "Vehículo propio",
      brand: row.brand,
      model: row.model,
      version: row.version,
      year: row.year,
      km: row.km,
      plate: row.plate,
      province: row.province,
      city: row.city,
      expected_price: row.expected_price ?? row.expectedPrice,
      condition: row.condition,
      vtv_due_date: row.vtv_due_date || row.vtvDueDate,
      insurance_due_date: row.insurance_due_date || row.insuranceDueDate,
      insurance_company: row.insurance_company || row.insuranceCompany,
      policy_number: row.policy_number || row.policyNumber,
      notes: row.notes,
      photo_url: row.photo_url || row.image_url || row.photoUrl,
      image_position_x: row.image_position_x ?? row.imagePositionX,
      image_position_y: row.image_position_y ?? row.imagePositionY,
      dealer: "Garage oX",
    },
    status: row.status || "owned",
    source: row.source || "owned",
  });
}

async function listOwnedGarageVehicles({ userId }) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("buyer_garage_owned_vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      return {
        vehicles: (data || []).map(normalizeOwnedGarageVehicle),
        source: "supabase",
      };
    }

    if (import.meta.env.DEV) {
      console.warn("Garage oX owned vehicles fallback local.", error.message);
    }
  }

  return {
    vehicles: applyLocalVehicleOverrides(
      userId,
      readLocalVehicles(userId).map(normalizeOwnedGarageVehicle)
    ),
    source: "local",
  };
}

export async function listBuyerGarageVehicles({ userId } = {}) {
  const owned = await listOwnedGarageVehicles({ userId });

  if (!isSupabaseConfigured || !supabase) {
    return {
      vehicles: applyLocalVehicleOverrides(userId, owned.vehicles),
      error: null,
      source: owned.source,
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
      vehicles: applyLocalVehicleOverrides(userId, owned.vehicles),
      error: null,
      source: owned.source,
    };
  }

  return {
    vehicles: applyLocalVehicleOverrides(userId, [
      ...(data || []).map(normalizeGarageVehicle),
      ...owned.vehicles,
    ]),
    error: null,
    source: owned.source === "local" ? "mixed-local" : "supabase",
  };
}

export async function createBuyerGarageVehicle({ userId, vehicle }) {
  const payload = {
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version || null,
    year: parseOptionalNumber(vehicle.year),
    km: parseOptionalNumber(vehicle.km),
    plate: vehicle.plate || null,
    province: vehicle.province || null,
    city: vehicle.city || null,
    expected_price: parseOptionalNumber(vehicle.expectedPrice),
    condition: vehicle.condition || null,
    vtv_due_date: vehicle.vtvDueDate || null,
    insurance_due_date: vehicle.insuranceDueDate || null,
    insurance_company: vehicle.insuranceCompany || null,
    policy_number: vehicle.policyNumber || null,
    notes: vehicle.notes || null,
    status: vehicle.saleIntent ? "preparing_sale" : "owned",
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("buyer_garage_owned_vehicles")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      const override = {};
      if (vehicle.photoUrl) override.photoUrl = vehicle.photoUrl;
      if (Number.isFinite(Number(vehicle.imagePositionX))) override.imagePositionX = Number(vehicle.imagePositionX);
      if (Number.isFinite(Number(vehicle.imagePositionY))) override.imagePositionY = Number(vehicle.imagePositionY);
      if (Object.keys(override).length) {
        upsertLocalVehicleOverride(userId, normalizeOwnedGarageVehicle(data).id, override);
      }

      return {
        vehicle: {
          ...normalizeOwnedGarageVehicle(data),
          photoUrl: vehicle.photoUrl || normalizeOwnedGarageVehicle(data).photoUrl,
          imagePositionX: Number.isFinite(Number(vehicle.imagePositionX)) ? Number(vehicle.imagePositionX) : (normalizeOwnedGarageVehicle(data).imagePositionX ?? 50),
          imagePositionY: Number.isFinite(Number(vehicle.imagePositionY)) ? Number(vehicle.imagePositionY) : (normalizeOwnedGarageVehicle(data).imagePositionY ?? 50),
        },
        error: null,
        source: "supabase",
      };
    }

    if (import.meta.env.DEV) {
      console.warn("Garage oX owned vehicle fallback local.", error.message);
    }
  }

  const localRecord = {
    ...payload,
    local_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    source: "local",
    photoUrl: vehicle.photoUrl || "",
    imagePositionX: Number.isFinite(Number(vehicle.imagePositionX)) ? Number(vehicle.imagePositionX) : 50,
    imagePositionY: Number.isFinite(Number(vehicle.imagePositionY)) ? Number(vehicle.imagePositionY) : 50,
  };
  const next = [localRecord, ...readLocalVehicles(userId)];
  writeLocalVehicles(userId, next);

  return {
    vehicle: normalizeOwnedGarageVehicle(localRecord),
    error: null,
    source: "local",
  };
}

export async function updateBuyerGarageVehicle({ userId, vehicleId, vehicle }) {
  const payload = {
    brand: vehicle.brand,
    model: vehicle.model,
    version: vehicle.version || null,
    year: parseOptionalNumber(vehicle.year),
    km: parseOptionalNumber(vehicle.km),
    plate: vehicle.plate || null,
    province: vehicle.province || null,
    city: vehicle.city || null,
    expected_price: parseOptionalNumber(vehicle.expectedPrice),
    condition: vehicle.condition || null,
    vtv_due_date: vehicle.vtvDueDate || null,
    insurance_due_date: vehicle.insuranceDueDate || null,
    insurance_company: vehicle.insuranceCompany || null,
    policy_number: vehicle.policyNumber || null,
    notes: vehicle.notes || null,
    status: vehicle.saleIntent ? "preparing_sale" : "owned",
  };
  const rawId = String(vehicleId || "").replace(/^own-/, "");
  const numericId = Number(rawId);

  if (isSupabaseConfigured && supabase && Number.isFinite(numericId)) {
    const { data, error } = await supabase
      .from("buyer_garage_owned_vehicles")
      .update(payload)
      .eq("id", numericId)
      .select("*")
      .single();

    if (!error) {
      const override = {};
      if (vehicle.photoUrl) override.photoUrl = vehicle.photoUrl;
      if (Number.isFinite(Number(vehicle.imagePositionX))) override.imagePositionX = Number(vehicle.imagePositionX);
      if (Number.isFinite(Number(vehicle.imagePositionY))) override.imagePositionY = Number(vehicle.imagePositionY);
      if (Object.keys(override).length) {
        upsertLocalVehicleOverride(userId, normalizeOwnedGarageVehicle(data).id, override);
      }

      return {
        vehicle: {
          ...normalizeOwnedGarageVehicle(data),
          photoUrl: vehicle.photoUrl || normalizeOwnedGarageVehicle(data).photoUrl,
          imagePositionX: Number.isFinite(Number(vehicle.imagePositionX)) ? Number(vehicle.imagePositionX) : (normalizeOwnedGarageVehicle(data).imagePositionX ?? 50),
          imagePositionY: Number.isFinite(Number(vehicle.imagePositionY)) ? Number(vehicle.imagePositionY) : (normalizeOwnedGarageVehicle(data).imagePositionY ?? 50),
        },
        error: null,
        source: "supabase",
      };
    }

    if (import.meta.env.DEV) {
      console.warn("Garage oX owned vehicle update fallback local.", error.message);
    }
  }

  const current = readLocalVehicles(userId);
  const next = current.map((record) => {
    const recordId = String(record.local_id || record.localId || record.id || "");
    const ownedId = recordId.startsWith("own-") ? recordId : `own-${recordId}`;

    if (recordId === rawId || ownedId === vehicleId) {
      return {
        ...record,
        ...payload,
        photoUrl: vehicle.photoUrl || record.photoUrl || "",
        imagePositionX: Number.isFinite(Number(vehicle.imagePositionX)) ? Number(vehicle.imagePositionX) : (record.imagePositionX ?? 50),
        imagePositionY: Number.isFinite(Number(vehicle.imagePositionY)) ? Number(vehicle.imagePositionY) : (record.imagePositionY ?? 50),
        updated_at: new Date().toISOString(),
        source: "local",
      };
    }

    return record;
  });
  const found = next.some((record) => {
    const recordId = String(record.local_id || record.localId || record.id || "");
    const ownedId = recordId.startsWith("own-") ? recordId : `own-${recordId}`;
    return recordId === rawId || ownedId === vehicleId;
  });

  const finalRecords = found
    ? next
    : [
        {
          ...payload,
          photoUrl: vehicle.photoUrl || "",
          local_id: rawId || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source: "local",
        },
        ...current,
      ];

  writeLocalVehicles(userId, finalRecords);

  const updatedRecord = finalRecords.find((record) => {
    const recordId = String(record.local_id || record.localId || record.id || "");
    const ownedId = recordId.startsWith("own-") ? recordId : `own-${recordId}`;
    return recordId === rawId || ownedId === vehicleId;
  });

  return {
    vehicle: normalizeOwnedGarageVehicle(updatedRecord || finalRecords[0]),
    error: null,
    source: "local",
  };
}

export async function uploadBuyerGarageVehiclePhoto({ garageVehicleId, file }) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      photoUrl: "",
      error: { message: "Supabase no esta configurado." },
    };
  }

  if (!file) {
    return {
      photoUrl: "",
      error: { message: "Seleccioná una imagen para subir." },
    };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      photoUrl: "",
      error: { message: "La foto debe ser JPG, PNG o WebP." },
    };
  }

  const maxSize = 4 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      photoUrl: "",
      error: { message: "La foto no puede superar los 4 MB." },
    };
  }

  const dbId = getGarageVehicleDbId(garageVehicleId);
  if (!dbId) {
    return {
      photoUrl: "",
      error: { message: "Primero guardá el vehículo para poder subir la foto." },
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user?.id) {
    return {
      photoUrl: "",
      error: { message: "Necesitás iniciar sesión para subir la foto." },
    };
  }

  const safeName = sanitizeFileName(file.name);
  const path = `${user.id}/owned-${dbId}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("garage-vehicle-photos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      photoUrl: "",
      error: uploadError,
    };
  }

  const { data: publicData } = supabase.storage
    .from("garage-vehicle-photos")
    .getPublicUrl(path);
  const photoUrl = publicData?.publicUrl || "";

  if (!photoUrl) {
    return {
      photoUrl: "",
      error: { message: "No pudimos obtener la URL pública de la foto." },
    };
  }

  const { error: updateError } = await supabase
    .from("buyer_garage_owned_vehicles")
    .update({ photo_url: photoUrl })
    .eq("id", dbId);

  if (updateError) {
    return {
      photoUrl,
      error: updateError,
    };
  }

  return {
    photoUrl,
    error: null,
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

    // Surface the Supabase error to the caller instead of silently
    // falling through to local — otherwise the caller shows "saved" while
    // listBuyerGarageServices (which reads only from Supabase when configured)
    // will never return the locally-written record, making it invisible.
    return {
      service: null,
      error,
      source: null,
    };
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
