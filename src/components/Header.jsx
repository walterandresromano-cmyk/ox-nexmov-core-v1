import { useState } from "react";

import { signOut } from "../services/auth.service.js";
import { normalizeRole } from "../lib/auth.js";

const NAV_ITEMS = [
  { id: "home", label: "Inicio" },
  { id: "search", label: "Buscar" },
  { id: "zeroKm", label: "Financiación 0km" },
  { id: "joinNetwork", label: "Sumate a la red" },
  { id: "about", label: "Quiénes somos" },
  { id: "faq", label: "Preguntas frecuentes" },
  { id: "sellVehicle", label: "Garage oX" },
];


function getPrivatePanelForRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return { id: "admin", label: "Panel admin" };
  if (normalizedRole === "dealer") return { id: "dealer", label: "Panel dealer" };
  if (normalizedRole === "buyer") return { id: "buyer", label: "Panel comprador" };
  if (normalizedRole === "internal0km") return { id: "internal0km", label: "Panel 0km" };
  if (normalizedRole === "support") return { id: "support", label: "Panel soporte" };

  return null;
}

function getFirstName(authProfile, authUser) {
  const fullName = String(authProfile?.full_name || "").trim();
  if (fullName) return fullName.split(/\s+/)[0];

  const email = String(authProfile?.email || authUser?.email || "").trim();
  if (email) return email.split("@")[0];

  return "comprador";
}

export default function Header({ currentRoute, onNavigate, appActions }) {
  const authUser = appActions?.authUser;
  const authProfile = appActions?.authProfile;
  const isLoggedIn = Boolean(authUser?.id);
  const privatePanel = getPrivatePanelForRole(authProfile?.role);
  const privatePanelLabel =
    privatePanel?.id === "buyer"
      ? `Hola, ${getFirstName(authProfile, authUser)}`
      : privatePanel?.label;
  const theme = appActions?.theme || "dark";
  const nextThemeLabel = theme === "dark" ? "Modo claro" : "Modo oscuro";

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [garagePulse, setGaragePulse] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    const { error } = await signOut();

    if (error) {
      setLogoutError(error.message || "No se pudo cerrar sesión.");
      setLoggingOut(false);
      return;
    }

    appActions?.setAuthUser?.(null);
    appActions?.setAuthProfile?.(null);

    setLoggingOut(false);
    onNavigate("home");
  }

  function handleNavClick(itemId) {
    if (itemId === "sellVehicle") {
      setGaragePulse(true);
      window.setTimeout(() => setGaragePulse(false), 620);
    }

    onNavigate(itemId);
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <button
          className="brand-button"
          type="button"
          onClick={() => onNavigate("home")}
          aria-label="Ir al inicio de oX NEXMOV"
        >
          <img className="brand-logo-img" src="/logo.svg" alt="oX NEXMOV" width="180" height="34" />
        </button>

        <nav className="desktop-nav" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={[
                "nav-btn",
                item.id === "sellVehicle" ? "nav-btn--garage" : "",
                item.id === "sellVehicle" && garagePulse ? "is-pulsing" : "",
                currentRoute === item.id ? "active" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleNavClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-role-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={appActions?.toggleTheme}
            aria-label={nextThemeLabel}
            title={nextThemeLabel}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>

          {isLoggedIn && privatePanel && (
            <button
              type="button"
              className={
                currentRoute === privatePanel.id
                  ? "login-btn private-panel-btn active"
                  : "login-btn private-panel-btn"
              }
              onClick={() => onNavigate(privatePanel.id)}
            >
              {privatePanelLabel}
            </button>
          )}

          {!isLoggedIn && (
            <button
              type="button"
              className="login-btn"
              onClick={() => onNavigate("login")}
              aria-label="Acceso operativo"
              title="Acceso operativo"
            >
              <span aria-hidden="true">🔒</span>
            </button>
          )}

          {isLoggedIn && (
            <button
              type="button"
              className="login-btn logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title={logoutError || "Cerrar sesión"}
            >
              {loggingOut ? "Saliendo..." : "Cerrar sesión"}
            </button>
          )}
        </div>
      </div>

      {logoutError && (
        <div className="container">
          <div className="auth-warning">{logoutError}</div>
        </div>
      )}
    </header>
  );
}
