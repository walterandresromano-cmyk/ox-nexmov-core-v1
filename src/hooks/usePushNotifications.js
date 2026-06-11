import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}


export function usePushNotifications({ authUser } = {}) {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const [permission, setPermission] = useState(
    supported ? Notification.permission : "denied"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(Boolean(sub)))
      .catch(() => {});
  }, [supported]);

  const requestAndSubscribe = useCallback(async () => {
    if (!supported || !authUser?.id) return;

    if (!VAPID_PUBLIC_KEY) {
      setError("Alertas no configuradas: falta VITE_VAPID_PUBLIC_KEY.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Pedir permiso al navegador
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setError("Permiso de notificaciones no otorgado.");
        return;
      }

      // 2. Registrar suscripción push en el navegador
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 3. Guardar en Edge Function push-subscribe
      const { error: fnError } = await supabase.functions.invoke(
        "push-subscribe",
        { body: subscription }
      );

      if (fnError) {
        setError(`No se pudo activar: ${fnError.message}`);
        await subscription.unsubscribe().catch(() => {});
        return;
      }

      // 4. Solo marcar suscripto si todo salió bien
      setIsSubscribed(true);
    } catch (err) {
      setError(err?.message || "No se pudo activar las notificaciones.");
    } finally {
      setIsLoading(false);
    }
  }, [supported, authUser?.id]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setIsSubscribed(false);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [supported]);

  return {
    supported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestAndSubscribe,
    unsubscribe,
  };
}
