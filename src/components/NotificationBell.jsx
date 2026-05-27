import { useEffect, useRef, useState } from "react";

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

function BellIcon({ unread }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={unread > 0 ? "notif-bell-icon notif-bell-icon--ringing" : "notif-bell-icon"}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationBell({ notifications, unreadCount, markAllRead, toasts, dismissToast }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (panelRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) markAllRead();
  }

  return (
    <>
      {/* Toasts — fixed, outside any stacking context */}
      <div className="notif-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`notif-toast notif-toast--${toast.type || "info"}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              className="notif-toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Bell button */}
      <div className="notif-bell-wrap">
        <button
          ref={btnRef}
          type="button"
          className="notif-bell-btn"
          onClick={handleOpen}
          aria-label={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : "Notificaciones"}
          aria-expanded={open}
        >
          <BellIcon unread={unreadCount} />
          {unreadCount > 0 && (
            <span className="notif-badge" aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={panelRef}
            className="notif-panel"
            role="dialog"
            aria-label="Notificaciones"
          >
            <div className="notif-panel-head">
              <strong>Notificaciones</strong>
              {notifications.some((n) => !n.is_read) && (
                <button
                  type="button"
                  className="notif-mark-read"
                  onClick={markAllRead}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="notif-panel-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">Sin notificaciones recientes.</div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item${n.is_read ? "" : " notif-item--unread"}`}
                  >
                    <span className="notif-item-dot" aria-hidden="true" />
                    <div className="notif-item-body">
                      <p>{n.message}</p>
                      {n.created_at && (
                        <time className="notif-item-time">{formatTime(n.created_at)}</time>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
