import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import {
  listDealerNotifications,
  markDealerNotificationsRead,
} from "../services/dealerNotifications.service.js";
import { listVehicleLeadsForCurrentBuyer } from "../services/buyer.service.js";
import { normalizeRole } from "../lib/auth.js";

const POLL_MS = 30000;
const ADMIN_SINCE_KEY = "ox-admin-notif-since";

const CRM_STATUS_LABELS = {
  new: "recibida",
  nuevo: "recibida",
  pending: "en revisión",
  contacted: "contactado por el dealer",
  in_progress: "en proceso",
  assigned: "asignada",
  negotiation: "en negociación",
  closed: "cerrada",
  lost: "no avanzó",
};

function statusLabel(s) {
  return CRM_STATUS_LABELS[s] || s || "actualizada";
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useNotifications({ authUser, authProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const channelRef = useRef(null);
  const pollRef = useRef(null);
  const prevLeadStatuses = useRef({});

  const role = normalizeRole(authProfile?.role);
  const userId = authUser?.id;

  const pushToast = useCallback((message, type = "info") => {
    const id = makeId();
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Dealer ────────────────────────────────────────────────────
  const fetchDealer = useCallback(async () => {
    const { notifications: fresh } = await listDealerNotifications();
    setNotifications((prev) => {
      const prevIds = new Set(prev.map((n) => n.id));
      const brand = fresh.filter((n) => !prevIds.has(n.id));
      brand.forEach((n) => pushToast(n.message, "dealer"));
      return fresh;
    });
  }, [pushToast]);

  // ── Buyer ─────────────────────────────────────────────────────
  const fetchBuyer = useCallback(async () => {
    const { leads } = await listVehicleLeadsForCurrentBuyer();
    if (!leads?.length) return;

    const items = leads.map((lead) => {
      const title = `${lead.vehicle_brand || ""} ${lead.vehicle_model || ""}`.trim() || "Vehículo";
      const prevStatus = prevLeadStatuses.current[lead.lead_id || lead.id];
      const curStatus = lead.crm_status;
      const changed = prevStatus && prevStatus !== curStatus;

      if (changed) {
        pushToast(`Tu consulta sobre ${title} fue ${statusLabel(curStatus)}.`, "buyer");
      }

      prevLeadStatuses.current[lead.lead_id || lead.id] = curStatus;

      return {
        id: lead.lead_id || lead.id,
        message: `${title} — ${statusLabel(curStatus)}`,
        created_at: lead.created_at,
        is_read: !changed && Boolean(prevStatus),
        crm_status: curStatus,
      };
    });

    setNotifications(items);
  }, [pushToast]);

  // ── Admin ─────────────────────────────────────────────────────
  const fetchAdmin = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    const since =
      sessionStorage.getItem(ADMIN_SINCE_KEY) ||
      new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    const { data: leads } = await supabase
      .from("vehicle_action_leads")
      .select("id, vehicle_brand, vehicle_model, crm_status, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: sellLeads } = await supabase
      .from("sell_vehicle_leads")
      .select("id, brand, model, full_name, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(30);

    setNotifications((prev) => {
      const prevIds = new Set(prev.map((n) => n.id + n.type));
      const items = [];

      (leads || []).forEach((l) => {
        const key = `${l.id}lead`;
        const title = `${l.vehicle_brand || ""} ${l.vehicle_model || ""}`.trim() || "Vehículo";
        const isNew = !prevIds.has(key);
        if (isNew) pushToast(`Nuevo lead: ${title}`, "admin");
        items.push({ id: key, message: `Lead: ${title} — ${statusLabel(l.crm_status)}`, created_at: l.created_at, is_read: !isNew, type: "lead" });
      });

      (sellLeads || []).forEach((l) => {
        const key = `${l.id}sell`;
        const title = `${l.brand || ""} ${l.model || ""}`.trim() || "Vehículo";
        const isNew = !prevIds.has(key);
        if (isNew) pushToast(`Quiere vender: ${title} (${l.full_name || "comprador"})`, "admin");
        items.push({ id: key, message: `Venta: ${title} — ${l.full_name || ""}`, created_at: l.created_at, is_read: !isNew, type: "sell" });
      });

      sessionStorage.setItem(ADMIN_SINCE_KEY, new Date().toISOString());
      return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    });
  }, [pushToast]);

  // ── Fetch router ──────────────────────────────────────────────
  const fetch = useCallback(() => {
    if (!userId || !isSupabaseConfigured) return;
    if (role === "dealer") return fetchDealer();
    if (role === "buyer") return fetchBuyer();
    if (role === "admin") return fetchAdmin();
  }, [role, userId, fetchDealer, fetchBuyer, fetchAdmin]);

  const markAllRead = useCallback(async () => {
    if (role === "dealer") await markDealerNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [role]);

  // ── Lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setNotifications([]);
      return;
    }

    fetch();
    pollRef.current = setInterval(fetch, POLL_MS);

    // Realtime supplement for dealers
    if (supabase && role === "dealer") {
      channelRef.current = supabase
        .channel(`ox-dealer-notif-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "dealer_notifications" }, fetch)
        .subscribe();
    }

    // Realtime supplement for buyers (lead updates)
    if (supabase && role === "buyer") {
      channelRef.current = supabase
        .channel(`ox-buyer-leads-${userId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vehicle_action_leads" }, fetch)
        .subscribe();
    }

    return () => {
      clearInterval(pollRef.current);
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, role, fetch]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, markAllRead, toasts, dismissToast };
}
