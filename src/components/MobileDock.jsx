import { useState } from "react";

import { signOut } from "../services/auth.service.js";

const PUBLIC_DOCK_ITEMS = [
  { id: "home", label: "Inicio" },
  { id: "search", label: "Buscar" },
  { id: "sellVehicle", label: "Vender" },
];

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "comprador") return "buyer";
  if (value === "soporte") return "support";
  if (value === "internal_0km") return "internal0km";

  return value;
}

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

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await signOut();

    if (error) {
      console.error("No se pudo cerrar sesión:", error.message);
      setLoggingOut(false);
      return;
    }

    appActions?.setAuthUser?.(null);
    appActions?.setAuthProfile?.(null);

    setLoggingOut(false);
    onNavigate("home");
  }

  const dockItems = [
    ...PUBLIC_DOCK_ITEMS,
    ...(isLoggedIn && privatePanel
      ? [privatePanel]
      : [{ id: "login", label: "Ingresar" }]),
  ];

  return (
    <nav className="mobile-dock">
      {dockItems.map((item) => (
        <button
          key={item.id}
          className={currentRoute === item.id ? "dock-btn active" : "dock-btn"}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}

      {isLoggedIn && (
        <button
          className="dock-btn logout-dock-btn"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "..." : "Salir"}
        </button>
      )}
    </nav>
  );
}