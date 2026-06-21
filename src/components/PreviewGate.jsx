import { useState } from "react";
import "../styles/preview-gate.css";

// Credenciales de acceso al preview — cambiar en .env.local
// VITE_PREVIEW_USER=preview
// VITE_PREVIEW_PASS=nexmov2026
const VALID_USER = import.meta.env.VITE_PREVIEW_USER || "preview";
const VALID_PASS = import.meta.env.VITE_PREVIEW_PASS || "nexmov2026";
const SESSION_KEY = "ox_preview_access";

function isUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export default function PreviewGate({ children }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (unlocked) return children;

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simular latencia mínima para evitar timing attacks triviales
    setTimeout(() => {
      if (user.trim() === VALID_USER && pass === VALID_PASS) {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        setUnlocked(true);
      } else {
        setError("Usuario o contraseña incorrectos.");
        setPass("");
      }
      setLoading(false);
    }, 350);
  }

  return (
    <div className="pg-root" data-theme="dark">
      <div className="pg-hero">
        <img
          className="pg-hero-car"
          src="/hero-car.svg"
          alt="oX NEXMOV — plataforma de vehículos"
        />
        <div className="pg-hero-fade" aria-hidden="true" />
      </div>

      <div className="pg-form-wrap">
        <form className="pg-form" onSubmit={handleSubmit} noValidate>
          <p className="pg-form-label">Acceso de prueba</p>

          <div className="pg-field-group">
            <div className="pg-field">
              <label className="pg-field-label" htmlFor="pg-user">
                Usuario
              </label>
              <input
                id="pg-user"
                className="pg-input"
                type="text"
                autoComplete="username"
                autoFocus
                value={user}
                onChange={(e) => { setUser(e.target.value); setError(""); }}
                disabled={loading}
                placeholder="usuario"
              />
            </div>

            <div className="pg-field">
              <label className="pg-field-label" htmlFor="pg-pass">
                Contraseña
              </label>
              <input
                id="pg-pass"
                className="pg-input"
                type="password"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => { setPass(e.target.value); setError(""); }}
                disabled={loading}
                placeholder="contraseña"
              />
            </div>
          </div>

          {error && (
            <p className="pg-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="pg-submit"
            type="submit"
            disabled={loading || !user || !pass}
          >
            {loading ? "Verificando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
