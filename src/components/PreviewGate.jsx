import { useEffect, useState } from "react";
import { createAccessRequest } from "../services/accessRequests.service.js";
import "../styles/preview-gate.css";

const VALID_USER = import.meta.env.VITE_PREVIEW_USER || "preview";
const VALID_PASS = import.meta.env.VITE_PREVIEW_PASS || "nexmov2026";
const SESSION_KEY = "ox_preview_access";

function isUnlocked() {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}

function notifyAdmin({ name, email, company, phone }) {
  fetch("/api/notify-access-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, company, phone }),
  }).catch(() => {});
}

// ── Vista: Landing ────────────────────────────────────────────
function LandingView({ onRequestAccess, onLogin }) {
  return (
    <div className="pg-root pg-root--landing" data-theme="dark">
      <img className="pg-hero-car" src="/hero-car.svg" alt="oX NEXMOV" />
      <div className="pg-landing-content">
        <h1 className="pg-landing-tagline">
          La plataforma que<br />los dealers <em>necesitan.</em>
        </h1>
        <ul className="pg-landing-bullets">
          <li>Publicaciones verificadas con datos reales</li>
          <li>Leads trazables en tiempo real</li>
          <li>Comparador activo para compradores</li>
        </ul>
        <div className="pg-cta-group">
          <button className="pg-cta-primary" onClick={onRequestAccess}>
            Solicitar acceso
          </button>
          <button className="pg-cta-secondary" onClick={onLogin}>
            Ya tengo acceso →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vista: Formulario de solicitud ────────────────────────────
function RequestView({ onBack }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { ok, error: err } = await createAccessRequest({ name, email, company, phone });

    if (ok) {
      notifyAdmin({ name, email, company, phone });
      setSent(true);
    } else {
      setError(err?.message || "Error al enviar la solicitud. Intentá de nuevo.");
    }

    setLoading(false);
  }

  return (
    <div className="pg-root" data-theme="dark">
      <img className="pg-hero-car pg-hero-car--sm" src="/hero-car.svg" alt="oX NEXMOV" />
      <div className="pg-form">
        <button className="pg-back" type="button" onClick={onBack}>← Volver</button>

        {sent ? (
          <div className="pg-success">
            <p className="pg-success-icon">✓</p>
            <p className="pg-success-title">Solicitud recibida</p>
            <p className="pg-success-text">Te contactamos a la brevedad con tus credenciales de acceso.</p>
          </div>
        ) : (
          <>
            <p className="pg-form-label">Solicitar acceso</p>
            <div className="pg-field-group">
              <div className="pg-field">
                <label className="pg-field-label" htmlFor="pg-req-name">Nombre completo *</label>
                <input id="pg-req-name" className="pg-input" type="text" autoFocus
                  value={name} onChange={e => { setName(e.target.value); setError(""); }}
                  disabled={loading} placeholder="Tu nombre" autoComplete="name" />
              </div>
              <div className="pg-field">
                <label className="pg-field-label" htmlFor="pg-req-email">Email *</label>
                <input id="pg-req-email" className="pg-input" type="email"
                  value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                  disabled={loading} placeholder="tu@email.com" autoComplete="email" />
              </div>
              <div className="pg-field">
                <label className="pg-field-label" htmlFor="pg-req-company">Concesionaria / Empresa</label>
                <input id="pg-req-company" className="pg-input" type="text"
                  value={company} onChange={e => setCompany(e.target.value)}
                  disabled={loading} placeholder="Nombre del negocio" autoComplete="organization" />
              </div>
              <div className="pg-field">
                <label className="pg-field-label" htmlFor="pg-req-phone">Teléfono / WhatsApp</label>
                <input id="pg-req-phone" className="pg-input" type="tel"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  disabled={loading} placeholder="+54 9 11 ..." autoComplete="tel" />
              </div>
            </div>

            {error && <p className="pg-error" role="alert">{error}</p>}

            <button className="pg-submit" type="submit" form="pg-request-form"
              disabled={loading || !name.trim() || !email.trim()}
              onClick={handleSubmit}>
              {loading ? "Enviando…" : "Enviar solicitud"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Vista: Login con credenciales ─────────────────────────────
function LoginView({ onBack, onUnlock }) {
  const [user, setUser]     = useState("");
  const [pass, setPass]     = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (user.trim() === VALID_USER && pass === VALID_PASS) {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        onUnlock();
      } else {
        setError("Usuario o contraseña incorrectos.");
        setPass("");
      }
      setLoading(false);
    }, 350);
  }

  return (
    <div className="pg-root" data-theme="dark">
      <img className="pg-hero-car pg-hero-car--sm" src="/hero-car.svg" alt="oX NEXMOV" />
      <form className="pg-form" onSubmit={handleSubmit} noValidate>
        <button className="pg-back" type="button" onClick={onBack}>← Volver</button>
        <p className="pg-form-label">Acceso de prueba</p>
        <div className="pg-field-group">
          <div className="pg-field">
            <label className="pg-field-label" htmlFor="pg-user">Usuario</label>
            <input id="pg-user" className="pg-input" type="text" autoComplete="username" autoFocus
              value={user} onChange={e => { setUser(e.target.value); setError(""); }}
              disabled={loading} placeholder="usuario" />
          </div>
          <div className="pg-field">
            <label className="pg-field-label" htmlFor="pg-pass">Contraseña</label>
            <input id="pg-pass" className="pg-input" type="password" autoComplete="current-password"
              value={pass} onChange={e => { setPass(e.target.value); setError(""); }}
              disabled={loading} placeholder="contraseña" />
          </div>
        </div>
        {error && <p className="pg-error" role="alert">{error}</p>}
        <button className="pg-submit" type="submit" disabled={loading || !user || !pass}>
          {loading ? "Verificando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function PreviewGate({ children }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [view, setView] = useState("landing");

  useEffect(() => {
    if (unlocked) return;
    const html = document.documentElement;
    const prev = html.getAttribute("data-theme");
    html.setAttribute("data-theme", "dark");
    return () => {
      if (prev) html.setAttribute("data-theme", prev);
      else html.removeAttribute("data-theme");
    };
  }, [unlocked]);

  if (unlocked) return children;

  if (view === "request") return <RequestView onBack={() => setView("landing")} />;
  if (view === "login")   return <LoginView onBack={() => setView("landing")} onUnlock={() => setUnlocked(true)} />;
  return <LandingView onRequestAccess={() => setView("request")} onLogin={() => setView("login")} />;
}
