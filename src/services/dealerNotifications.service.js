/*
  SQL — run once in Supabase SQL editor:

  create table if not exists dealer_notifications (
    id          bigserial primary key,
    created_at  timestamptz default now() not null,
    dealer_id   bigint      not null,
    vehicle_id  bigint,
    action      text        not null,
    message     text        not null,
    is_read     boolean     default false not null
  );

  alter table dealer_notifications enable row level security;

  -- Admin creates notifications for dealers
  create or replace function create_dealer_notification(
    p_dealer_id  bigint,
    p_vehicle_id bigint,
    p_action     text,
    p_message    text
  )
  returns void
  language plpgsql
  security definer
  as $$
  begin
    if not exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Acceso no autorizado';
    end if;

    insert into dealer_notifications (dealer_id, vehicle_id, action, message)
    values (p_dealer_id, p_vehicle_id, p_action, p_message);
  end;
  $$;

  -- Dealer reads their own notifications
  create or replace function get_dealer_notifications_for_current_user()
  returns setof dealer_notifications
  language sql
  security definer
  as $$
    select dn.*
    from dealer_notifications dn
    inner join dealers d on d.id = dn.dealer_id
    where d.profile_id = auth.uid()
    order by dn.created_at desc
    limit 50;
  $$;

  -- Dealer marks all their notifications as read
  create or replace function mark_dealer_notifications_read()
  returns void
  language plpgsql
  security definer
  as $$
  begin
    update dealer_notifications dn
    set is_read = true
    from dealers d
    where d.id = dn.dealer_id
      and d.profile_id = auth.uid()
      and dn.is_read = false;
  end;
  $$;
*/

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const NOTIFICATION_MESSAGES = {
  approve_review: (title) => `Tu publicación ${title} fue aprobada. Ya está visible en la red.`,
  pause: (title) => `Tu publicación ${title} fue pausada por administración.`,
  reactivate: (title) => `Tu publicación ${title} fue reactivada y está disponible.`,
  reserve: (title) => `Tu publicación ${title} fue marcada como reservada.`,
  mark_sold: (title) => `Tu publicación ${title} fue marcada como vendida.`,
  send_to_review: (title) => `Tu publicación ${title} necesita revisión. Revisá los datos para volver a publicar.`,
};

export function buildNotificationMessage(action, vehicleTitle) {
  const builder = NOTIFICATION_MESSAGES[action];
  return builder ? builder(vehicleTitle) : `Acción "${action}" aplicada a ${vehicleTitle}.`;
}

export async function createDealerNotification({ dealerId, vehicleId, action, message }) {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  const { error } = await supabase.rpc("create_dealer_notification", {
    p_dealer_id: Number(dealerId),
    p_vehicle_id: vehicleId ? Number(vehicleId) : null,
    p_action: action,
    p_message: message,
  });

  return { error };
}

export async function listDealerNotifications() {
  if (!isSupabaseConfigured || !supabase) {
    return { notifications: [], error: null };
  }

  const { data, error } = await supabase.rpc("get_dealer_notifications_for_current_user");

  return { notifications: data || [], error };
}

export async function markDealerNotificationsRead() {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  const { error } = await supabase.rpc("mark_dealer_notifications_read");

  return { error };
}
