import { useState } from "react";
import {
  signInWithEmail,
  signOut,
  signUpBuyer,
} from "../../services/auth.service.js";
import { isSupabaseConfigured } from "../../lib/supabaseClient.js";

const initialLogin = {
  email: "",
  password: "",
};

const initialRegister = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
};

function getPanelRoute(role) {
  const normalizedRole = String(role || "buyer").trim().toLowerCase();

  if (normalizedRole === "admin") return "admin";
  if (normalizedRole === "dealer") return "dealer";
  if (normalizedRole === "internal_0km") return "internal0km";
  if (normalizedRole === "support") return "support";

  return "buyer";
}

export default function AuthPanel({
  authUser,
  authProfile,
  authError,
  appActions,
  onAuthChange,
  onNavigate,
}) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [message, setMessage] = useState("");

  function updateLogin(field, value) {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateRegister(field, value) {
    setRegisterForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");

    const { data, error } = await signInWithEmail(loginForm);

    if (error) {
      setMessage(error.message || "No se pudo iniciar sesión.");
      return;
    }

    await onAuthChange(data?.user || null, { redirectByRole: true });
    setMessage("Sesión iniciada correctamente.");
  }

  async function handleRegister(event) {
    event.preventDefault();
    setMessage("");

    if (!registerForm.fullName.trim()) {
      setMessage("Ingresá tu nombre.");
      return;
    }

    if (!registerForm.email.includes("@")) {
      setMessage("Ingresá un email válido.");
      return;
    }

    if (!registerForm.phone.trim()) {
      setMessage("Ingresá un teléfono o WhatsApp.");
      return;
    }

    if (registerForm.password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const { data, error } = await signUpBuyer(registerForm);

    if (error) {
      setMessage(error.message || "No se pudo registrar el usuario.");
      return;
    }

    await onAuthChange(data?.user || null, { redirectByRole: true });

    setMessage(
      "Registro creado. Si Supabase requiere confirmación por email, revisá tu correo."
    );
  }

  async function handleLogout() {
    await signOut();
    await onAuthChange(null);
    setMessage("Sesión cerrada.");
  }

  async function handleRefreshProfile() {
    setMessage("Actualizando perfil...");
    const profile = await appActions.refreshAuthProfile({ redirectByRole: false });

    if (profile?.role) {
      setMessage(`Perfil actualizado. Rol actual: ${profile.role}`);
    } else {
      setMessage("No se pudo actualizar el perfil.");
    }
  }

  async function handleGoToMyPanel() {
    const profile = await appActions.refreshAuthProfile({ redirectByRole: false });
    const route = getPanelRoute(profile?.role || authProfile?.role);

    onNavigate(route);
  }

  return (
    <section className="page-section">
      <div className="container panel auth-panel">
        <p className="eyebrow">Acceso oX NEXMOV</p>
        <h1>Ingresar</h1>
        <p>
          Base inicial de autenticación. El comprador podrá explorar libremente,
          pero al contactar se exigirá registro para generar trazabilidad.
        </p>

        {!isSupabaseConfigured && (
          <div className="auth-warning">
            Supabase todavía no está configurado. Completá{" "}
            <strong>.env.local</strong> con la URL y anon key del proyecto.
          </div>
        )}

        {authUser ? (
          <div className="auth-session-box">
            <h2>Sesión activa</h2>
            <p>{authUser.email}</p>

            {authProfile ? (
              <div className="auth-profile-box">
                <span>Rol</span>
                <strong>{authProfile.role}</strong>

                <span>Nombre</span>
                <strong>{authProfile.full_name || "Sin nombre"}</strong>

                <span>Teléfono</span>
                <strong>{authProfile.phone_visible || "Sin teléfono"}</strong>

                <span>Estado</span>
                <strong>{authProfile.status || "Sin estado"}</strong>
              </div>
            ) : (
              <p>No se pudo leer el perfil asociado todavía.</p>
            )}

            {authError && <div className="auth-warning">{authError}</div>}

            <div className="auth-actions">
              <button onClick={handleRefreshProfile}>Actualizar perfil</button>
              <button onClick={handleGoToMyPanel}>Ir a mi panel</button>
              <button onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-mode-row">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Iniciar sesión
              </button>

              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Registro comprador
              </button>
            </div>

            {mode === "login" ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <label>
                  Email
                  <input
                    value={loginForm.email}
                    onChange={(event) =>
                      updateLogin("email", event.target.value)
                    }
                    placeholder="tu@email.com"
                  />
                </label>

                <label>
                  Contraseña
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) =>
                      updateLogin("password", event.target.value)
                    }
                    placeholder="Contraseña"
                  />
                </label>

                <button className="primary-action" type="submit">
                  Ingresar
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <label>
                  Nombre
                  <input
                    value={registerForm.fullName}
                    onChange={(event) =>
                      updateRegister("fullName", event.target.value)
                    }
                    placeholder="Tu nombre"
                  />
                </label>

                <label>
                  Email
                  <input
                    value={registerForm.email}
                    onChange={(event) =>
                      updateRegister("email", event.target.value)
                    }
                    placeholder="tu@email.com"
                  />
                </label>

                <label>
                  Teléfono / WhatsApp
                  <input
                    value={registerForm.phone}
                    onChange={(event) =>
                      updateRegister("phone", event.target.value)
                    }
                    placeholder="Ej: 11 3806 2294"
                  />
                </label>

                <label>
                  Contraseña
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(event) =>
                      updateRegister("password", event.target.value)
                    }
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>

                <button className="primary-action" type="submit">
                  Crear cuenta comprador
                </button>
              </form>
            )}
          </>
        )}

        {message && <div className="auth-message">{message}</div>}
      </div>
    </section>
  );
}