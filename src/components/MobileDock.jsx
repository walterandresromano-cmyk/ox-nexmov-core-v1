import { useState, useEffect } from "react";

import { signOut } from "../services/auth.service.js";
import { normalizeRole } from "../lib/auth.js";

const PUBLIC_DOCK_ITEMS = [
  { id: "home", label: "Inicio" },
  { id: "search", label: "Buscar" },
  { id: "sellVehicle", label: "Garage" },
];

const MORE_DOCK_ITEMS = [
  { id: "zeroKm", label: "Financiación 0km" },
  { id: "joinNetwork", label: "Sumate a la red" },
  { id: "about", label: "Quiénes somos" },
  { id: "faq", label: "Preguntas frecuentes" },
];


function getPrivatePanelForRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") {
    return { id: "admin", label: "Admin" };
  }

  if (normalizedRole === "dealer") {
    return { id: "dealer", label: "Dealer" };
  }

  if (normalizedRole === "buyer") {
    return { id: "buyer", label: "Perfil" };
  }

  if (normalizedRole === "internal0km") {
    return { id: "internal0km", label: "0km" };
  }

  if (normalizedRole === "support") {
    return { id: "support", label: "Soporte" };
  }

  return null;
}

export default function MobileDock({ currentRoute, onNavigate, appActions }) {
  const authUser = appActions?.authUser;
  const authProfile = appActions?.authProfile;
  const isLoggedIn = Boolean(authUser?.id);
  const privatePanel = getPrivatePanelForRole(authProfile?.role);
  const theme = appActions?.theme || "dark";

  const [loggingOut, setLoggingOut] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Close the "Más" menu whenever a modal opens, and prevent it from opening
  useEffect(() => {
    if (!isMoreOpen) return;
    const observer = new MutationObserver(() => {
      if (document.querySelector(".modal-backdrop")) setIsMoreOpen(false);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isMoreOpen]);

  function openMore() {
    if (document.querySelector(".modal-backdrop")) return;
    setIsMoreOpen((v) => !v);
  }

  const isMoreRouteActive = MORE_DOCK_ITEMS.some(
    (item) => item.id === currentRoute
  );

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await signOut();

    if (error) {
      if (import.meta.env.DEV) {
        console.error("No se pudo cerrar sesión:", error.message);
      }
      setLoggingOut(false);
      return;
    }

    appActions?.setAuthUser?.(null);
    appActions?.setAuthProfile?.(null);

    setLoggingOut(false);
    setIsMoreOpen(false);
    onNavigate("home");
  }

  function handleNavigate(routeId) {
    setIsMoreOpen(false);
    onNavigate(routeId);
  }

  // Acceso is no longer in the dock — it lives inside the Más menu
  const dockItems = [
    ...PUBLIC_DOCK_ITEMS,
    { id: "more", label: "Más" },
    ...(isLoggedIn && privatePanel ? [privatePanel] : []),
  ];

  return (
    <>
      {!isLoggedIn && (
        <button
          type="button"
          className="mobile-access-float-btn"
          onClick={() => onNavigate("login")}
          aria-label="Acceso"
        >
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </button>
      )}

      <button
        type="button"
        className="mobile-theme-float-btn"
        onClick={appActions?.toggleTheme}
        aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      </button>

      {isMoreOpen && (
        <>
          <button
            type="button"
            className="mobile-dock-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setIsMoreOpen(false)}
          />

          <nav className="mobile-dock-more" aria-label="Más opciones">
            <div className="mobile-dock-more-head">
              <strong>Más opciones</strong>

              <button type="button" onClick={() => setIsMoreOpen(false)}>
                Cerrar
              </button>
            </div>

            <div className="mobile-dock-more-list">
              {MORE_DOCK_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    currentRoute === item.id
                      ? "mobile-dock-more-btn active"
                      : "mobile-dock-more-btn"
                  }
                  onClick={() => handleNavigate(item.id)}
                >
                  {item.label}
                </button>
              ))}

            </div>
          </nav>
        </>
      )}

      <nav className="mobile-dock">
        {dockItems.map((item) => {
          if (item.id === "more") {
            return (
              <button
                key={item.id}
                type="button"
                className={
                  isMoreOpen || isMoreRouteActive
                    ? "dock-btn active"
                    : "dock-btn"
                }
                onClick={openMore}
              >
                {item.label}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className={
                currentRoute === item.id ? "dock-btn active" : "dock-btn"
              }
              onClick={() => handleNavigate(item.id)}
            >
              {item.label}
            </button>
          );
        })}

        {isLoggedIn && (
          <button
            type="button"
            className="dock-btn logout-dock-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "..." : "Salir"}
          </button>
        )}
      </nav>
    </>
  );
}
