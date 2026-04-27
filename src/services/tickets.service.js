import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export async function listSupportTicketsForCurrentUser() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      tickets: [],
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc(
    "get_support_tickets_for_current_user"
  );

  return {
    tickets: data || [],
    error,
  };
}

export async function createDealerSupportTicket({
  dealerId,
  subject,
  message,
  priority = "normal",
  category = "general",
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ticket: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("create_dealer_support_ticket", {
    p_dealer_id: Number(dealerId),
    p_subject: subject,
    p_message: message,
    p_priority: priority,
    p_category: category,
  });

  return {
    ticket: Array.isArray(data) ? data[0] : null,
    error,
  };
}

export async function updateSupportTicketStatus({
  ticketId,
  status,
  adminNotes = null,
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ticket: null,
      error: {
        message: "Supabase no está configurado.",
      },
    };
  }

  const { data, error } = await supabase.rpc("update_support_ticket_status", {
    p_ticket_id: Number(ticketId),
    p_status: status,
    p_admin_notes: adminNotes,
  });

  return {
    ticket: Array.isArray(data) ? data[0] : null,
    error,
  };
}