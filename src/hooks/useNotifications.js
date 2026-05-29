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

// Labels para dealer y admin — no se usan en la rama buyer
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

// ── Buyer-safe: solo transiciones comerciales visibles al comprador ──
const BUYER_COMMERCIAL_TRANSITIONS = new Set(["contacted", "reserved", "sold", "closed"]);

const BUYER_TRANSITION_MESSAGES = {
  contacted: (title) => `El dealer respondió tu consulta sobre ${title}.`,
  reserved:  (title) => `El vehículo ${title} fue reservado.`,
  sold:      (title) => `La operación sobre ${title} fue completada.`,
  closed:    (title) => `El dealer actualizó tu consulta sobre ${title}.`,
};

// ── Buyer read-state persistence (localStorage, sin SQL) ─────────────
function getBuyerNotificationKey(leadId, status) {
  return `buyer:${leadId}:${status}`;
}

function getReadBuyerNotificationKeys(userId) {
  try {
    const raw = localStorage.getItem(`ox_buyer_read_notifications:${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveReadBuyerNotificationKeys(userId, keys) {
  try {
    localStorage.setItem(
      `ox_buyer_read_notifications:${userId}`,
      JSON.stringify([...keys])
    );
  } catch {
    // localStorage no disponible o lleno
  }
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
  const toastedKeysRef = useRef(new Set());

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
  // Solo transiciones comerciales son visibles. Estados internos del CRM dealer
  // (seen, in_progress, negotiation, lost, etc.) se trackean silenciosamente
  // sin generar toast, sin aparecer en la campana y sin exponer el valor crudo.
  // La lectura se persiste en localStorage por usuario — sobrevive polling y reload.
  const fetchBuyer = useCallback(async () => {
    const { leads } = await listVehicleLeadsForCurrentBuyer();
    if (!leads?.length) return;

    const readKeys = getReadBuyerNotificationKeys(userId);
    const items = [];

    for (const lead of leads) {
      const leadId = lead.lead_id || lead.id;
      const title = `${lead.vehicle_brand || ""} ${lead.vehicle_model || ""}`.trim() || "el vehículo";
      const curStatus = lead.crm_status;
      const isCommercial = BUYER_COMMERCIAL_TRANSITIONS.has(curStatus);

      // Siempre trackear — necesario para detectar cambios futuros
      prevLeadStatuses.current[leadId] = curStatus;

      if (!isCommercial) continue;

      const notificationKey = getBuyerNotificationKey(leadId, curStatus);
      const alreadyRead = readKeys.has(notificationKey);

      // Toast una sola vez por sesión por clave no leída
      if (!alreadyRead && !toastedKeysRef.current.has(notificationKey)) {
        pushToast(BUYER_TRANSITION_MESSAGES[curStatus](title), "buyer");
        toastedKeysRef.current.add(notificationKey);
      }

      items.push({
        id: leadId,
        notification_key: notificationKey,
        message: BUYER_TRANSITION_MESSAGES[curStatus](title),
        created_at: lead.created_at,
        is_read: alreadyRead,
      });
    }

    setNotifications(items);
  }, [pushToast, userId]);

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
    if (role === "dealer") {
      await markDealerNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      return;
    }
    if (role === "buyer") {
      setNotifications((prev) => {
        const keys = getReadBuyerNotificationKeys(userId);
        prev.forEach((n) => { if (n.notification_key) keys.add(n.notification_key); });
        saveReadBuyerNotificationKeys(userId, keys);
        return prev.map((n) => ({ ...n, is_read: true }));
      });
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [role, userId]);

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
