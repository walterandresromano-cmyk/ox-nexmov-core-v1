import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const TABLE = "ticket_messages";

export async function getTicketMessages(ticketId) {
  if (!isSupabaseConfigured || !supabase) return { messages: [], error: null };

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return { messages: data || [], error };
}

export async function sendTicketMessage({ ticketId, content, senderRole, senderName }) {
  if (!isSupabaseConfigured || !supabase) {
    return { message: null, error: { message: "Supabase no está configurado." } };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: null, error: { message: "No autenticado." } };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ticket_id:   Number(ticketId),
      sender_id:   user.id,
      sender_role: senderRole || "dealer",
      sender_name: senderName || null,
      content:     content.trim(),
    })
    .select()
    .single();

  return { message: data, error };
}

export function subscribeToTicketMessages(ticketId, onInsert) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel(`ticket-chat-${ticketId}`)
    .on(
      "postgres_changes",
      {
        event:  "INSERT",
        schema: "public",
        table:  TABLE,
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
