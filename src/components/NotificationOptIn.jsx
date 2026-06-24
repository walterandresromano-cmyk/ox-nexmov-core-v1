import { useEffect, useState, useCallback } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications.js";

const DISMISS_KEY = "ox_notif_optin_dismissed";
const DISMISS_DAYS = 14;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function saveDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
  } catch {}
}

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * Prompt de notificaciones push para usuarios autenticados (compradores y dealers).
 * Aparece después de 40 segundos de uso activo si el permiso no fue otorgado aún.
 * No se muestra si: ya tiene permiso, fue descartado, o no soporta notificaciones.
 */
export default function NotificationOptIn({ authUser }) {
  const [visible, setVisible] = useState(false);
  const { supported, permission, isSubscribed, isLoading, error, requestAndSubscribe } =
    usePushNotifications({ authUser });

  useEffect(() => {
    if (!authUser?.id) return;
    if (!supported) return;
    if (permission === "granted" || permission === "denied") return;
    if (isSubscribed) return;
    if (isDismissed()) return;

    // Show after 40s of active session
    const timer = setTimeout(() => setVisible(true), 40_000);
    return () => clearTimeout(timer);
  }, [authUser?.id, supported, permission, isSubscribed]);

  const handleEnable = useCallback(async () => {
    await requestAndSubscribe();
    // Solo cerrar si no hubo error (error se setea en el hook)
    // El efecto de abajo se encarga de cerrar cuando isSubscribed cambia a true
  }, [requestAndSubscribe]);

  // Cerrar el modal cuando la suscripción se completó correctamente
  useEffect(() => {
    if (isSubscribed) setVisible(false);
  }, [isSubscribed]);

  const handleDismiss = useCallback(() => {
    saveDismiss();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="notif-optin" role="dialog" aria-label="Activar alertas">
      <div className="notif-optin__icon">
        <BellIcon />
      </div>

      <div className="notif-optin__body">
        <strong className="notif-optin__title">Activá las alertas</strong>
        <p className="notif-optin__desc">
          Recibí avisos cuando el dealer responda tu consulta o publique un vehículo
          que buscás.
        </p>
        <div className="notif-optin__actions">
          {error && (
            <p className="notif-optin__error" role="alert">{error}</p>
          )}
          <button
            className="notif-optin__btn notif-optin__btn--primary"
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? "Activando…" : "Activar"}
          </button>
          <button className="notif-optin__btn notif-optin__btn--ghost" onClick={handleDismiss}>
            Ahora no
          </button>
        </div>
      </div>

      <button
        className="notif-optin__close"
        onClick={handleDismiss}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
