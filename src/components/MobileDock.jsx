import { useState } from "react";

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
    return { id: "buyer", label: "Comprador" };
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

  const dockItems = [
    ...PUBLIC_DOCK_ITEMS,
    { id: "more", label: "Más" },
    ...(isLoggedIn && privatePanel
      ? [privatePanel]
      : [{ id: "login", label: "Acceso" }]),
  ];

  return (
    <>
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
              <button
                type="button"
                className="mobile-dock-more-btn"
                onClick={appActions?.toggleTheme}
              >
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </button>

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
                onClick={() => setIsMoreOpen((value) => !value)}
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
