import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const VISITOR_KEY = "ox-visitor-id";
const SESSION_KEY = "ox-session-id";

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = uuid(); localStorage.setItem(VISITOR_KEY, id); }
    return id;
  } catch { return "unknown"; }
}

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = uuid(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return "unknown"; }
}

// Rutas privadas que no aportan valor en analytics públicos
const SKIP_ROUTES = new Set(["buyer", "dealer", "admin", "internal0km", "support"]);

export async function trackPageView(route, userRole = null) {
  if (!isSupabaseConfigured || !supabase) return;
  if (typeof window === "undefined") return;
  if (SKIP_ROUTES.has(route)) return;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;

  const path = window.location.pathname + window.location.search;

  // Fire-and-forget — no bloquea navegación
  supabase.rpc("track_site_page_view", {
    p_page: route,
    p_route: path,
    p_user_role: userRole || null,
    p_visitor_id: getVisitorId(),
    p_session_id: getSessionId(),
    p_referrer: document.referrer || null,
    p_user_agent: navigator.userAgent?.slice(0, 200) || null,
  }).then(() => {}).catch(() => {});
}

export async function getSiteAnalytics({ days = 7 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: { message: "Supabase no configurado." } };
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("site_page_views")
    .select("page, route, user_role, visitor_id, session_id, visited_at")
    .gte("visited_at", since.toISOString())
    .order("visited_at", { ascending: false });

  return { data: data || [], error };
}

export function aggregateAnalytics(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayRows = rows.filter((r) => new Date(r.visited_at) >= today);

  // Visitas totales del período
  const totalVisits = rows.length;
  const todayVisits = todayRows.length;

  // Visitantes únicos (visitor_id)
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_id).filter(Boolean)).size;
  const todayUniqueVisitors = new Set(todayRows.map((r) => r.visitor_id).filter(Boolean)).size;

  // Sesiones únicas
  const uniqueSessions = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;

  // Top páginas del período
  const pageCount = {};
  for (const r of rows) {
    const key = r.page || r.route || "unknown";
    pageCount[key] = (pageCount[key] || 0) + 1;
  }
  const topPages = Object.entries(pageCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([page, count]) => ({ page, count }));

  // Visitas por día (últimos N días)
  const byDay = {};
  for (const r of rows) {
    const day = r.visited_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }
  const dailyTrend = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Por rol
  const byRole = {};
  for (const r of rows) {
    const role = r.user_role || "anónimo";
    byRole[role] = (byRole[role] || 0) + 1;
  }

  return {
    totalVisits,
    todayVisits,
    uniqueVisitors,
    todayUniqueVisitors,
    uniqueSessions,
    topPages,
    dailyTrend,
    byRole,
  };
}
