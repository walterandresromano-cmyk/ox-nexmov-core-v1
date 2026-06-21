import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { withRetry } from "../lib/withRetry.js";

const RADAR_LS_KEY = "ox_radar_requests_v1";

// ── LocalStorage helpers — DEV only (!isSupabaseConfigured) ───────────

function readLocalRadar() {
  try {
    const raw = window.localStorage.getItem(RADAR_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRadar(items) {
  try {
    window.localStorage.setItem(RADAR_LS_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable
  }
}

function buildLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Buyer: list own requests ──────────────────────────────────────────

export async function listRadarRequests() {
  if (!isSupabaseConfigured || !supabase) {
    return { requests: readLocalRadar(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from("buyer_radar_requests")
      .select(
        "id, search_text, filters, parsed_intent, notes, trigger_reason, results_count, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) return { requests: [], error };
    return { requests: data || [], error: null };
  } catch (err) {
    return { requests: [], error: err };
  }
}

// ── Buyer: create request ─────────────────────────────────────────────

export async function createRadarRequest(requestData) {
  const {
    searchText = "",
    filters = {},
    parsedIntent = {},
    notes = "",
    triggerReason = "no_results",
    resultsCount = 0,
  } = requestData;

  // Payload para Supabase — sin created_at (DB usa DEFAULT now())
  const supabasePayload = {
    search_text: searchText,
    filters: filters,
    parsed_intent: parsedIntent,
    notes: notes,
    trigger_reason: triggerReason,
    results_count: resultsCount,
    status: "active",
  };

  if (!isSupabaseConfigured || !supabase) {
    // DEV fallback: persistir en localStorage
    const local = readLocalRadar();
    const newItem = {
      ...supabasePayload,
      id: buildLocalId(),
      is_local: true,
      created_at: new Date().toISOString(),
    };
    writeLocalRadar([newItem, ...local]);
    return { request: newItem, error: null };
  }

  try {
    const { data: sessionData } = await supabase.auth.getUser();
    const userId = sessionData?.user?.id;
    if (userId) supabasePayload.user_id = userId;

    const { data, error } = await supabase
      .from("buyer_radar_requests")
      .insert([supabasePayload])
      .select(
        "id, search_text, filters, parsed_intent, notes, trigger_reason, results_count, status, created_at"
      )
      .single();

    if (error) return { request: null, error };
    return { request: data, error: null };
  } catch (err) {
    return { request: null, error: err };
  }
}

// ── Buyer: cancelar / eliminar request ───────────────────────────────

export async function deleteRadarRequest(id) {
  if (!isSupabaseConfigured || !supabase) {
    const local = readLocalRadar().filter((r) => r.id !== id);
    writeLocalRadar(local);
    return { error: null };
  }

  const isLocal = String(id).startsWith("local_");
  if (isLocal) {
    const local = readLocalRadar().filter((r) => r.id !== id);
    writeLocalRadar(local);
    return { error: null };
  }

  try {
    const { error } = await supabase
      .from("buyer_radar_requests")
      .delete()
      .eq("id", id);

    if (error) return { error };
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

// ── Dealer: listar señales activas (sin user_id) ──────────────────────

export async function listRadarRequestsForDealer() {
  if (!isSupabaseConfigured || !supabase) {
    // DEV fallback: mismo bucket localStorage para poder testear el módulo dealer localmente
    return { requests: readLocalRadar(), error: null };
  }

  const { data, error } = await withRetry(() =>
    supabase
      .from("buyer_radar_requests")
      .select(
        "id, search_text, filters, parsed_intent, notes, trigger_reason, results_count, created_at"
        // NO user_id — nunca se expone al dealer
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
  );

  return { requests: data || [], error: error || null };
}

// ── Admin: listar todas las solicitudes con datos del comprador ────────

export async function listRadarRequestsForAdmin() {
  if (!isSupabaseConfigured || !supabase) {
    return { requests: [], error: { message: "Supabase no configurado." } };
  }

  try {
    const { data: requests, error: reqError } = await supabase
      .from("buyer_radar_requests")
      .select(
        "id, user_id, search_text, filters, parsed_intent, notes, trigger_reason, results_count, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (reqError) return { requests: [], error: reqError };
    if (!requests?.length) return { requests: [], error: null };

    // Obtener datos de contacto de los usuarios
    const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone_whatsapp, phone_visible")
      .in("id", userIds);

    const profileMap = {};
    for (const p of profiles || []) {
      profileMap[p.id] = p;
    }

    return {
      requests: requests.map((r) => ({
        ...r,
        buyerName: profileMap[r.user_id]?.full_name || "Comprador",
        buyerEmail: profileMap[r.user_id]?.email || "",
        buyerPhone:
          profileMap[r.user_id]?.phone_whatsapp ||
          profileMap[r.user_id]?.phone_visible ||
          "",
      })),
      error: null,
    };
  } catch (err) {
    return { requests: [], error: err };
  }
}

// ── Utilidad compartida ───────────────────────────────────────────────

export function buildRadarCriteriaSummary(searchText, filters, parsedIntent) {
  const parts = [];

  if (searchText?.trim()) {
    parts.push(`"${searchText.trim()}"`);
  }

  if (filters?.brand) parts.push(`Marca: ${filters.brand}`);
  if (filters?.model) parts.push(`Modelo: ${filters.model}`);
  if (filters?.province) parts.push(`Provincia: ${filters.province}`);
  if (filters?.city) parts.push(`Ciudad: ${filters.city}`);
  if (filters?.bodyType) parts.push(`Tipo: ${filters.bodyType}`);
  if (filters?.fuel) parts.push(`Combustible: ${filters.fuel}`);
  if (filters?.transmission) parts.push(`Caja: ${filters.transmission}`);

  if (parsedIntent?.maxPrice) {
    parts.push(`Hasta $${parsedIntent.maxPrice.toLocaleString("es-AR")}`);
  }

  if (parsedIntent?.maxKm) {
    parts.push(`Hasta ${parsedIntent.maxKm.toLocaleString("es-AR")} km`);
  }

  if (parsedIntent?.wantsFinancing) parts.push("Con financiación");

  if (parsedIntent?.years?.length > 0) {
    parts.push(`Año ${parsedIntent.years.join(", ")}`);
  }

  return parts;
}
