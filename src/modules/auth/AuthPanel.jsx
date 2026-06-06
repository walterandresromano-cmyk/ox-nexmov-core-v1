import "../../styles/auth.css";
import { useEffect, useState } from "react";
import {
  signInWithEmail,
  signOut,
  signUpBuyer,
  signUpDealer,
  resetPasswordForEmail,
  updateCurrentUserPassword,
} from "../../services/auth.service.js";
import { isSupabaseConfigured } from "../../lib/supabaseClient.js";

const initialLogin = {
  email: "",
  password: "",
};

const PREFILL_LOGIN_EMAIL_KEY = "ox_prefill_login_email";

const initialRegister = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
};

const initialResetPassword = {
  email: "",
};

const initialNewPassword = {
  password: "",
  confirmPassword: "",
};

function getPanelRoute(role) {
  const normalizedRole = String(role || "buyer").trim().toLowerCase();

  if (normalizedRole === "admin") return "admin";
  if (normalizedRole === "dealer") return "dealer";
  if (normalizedRole === "internal_0km") return "internal0km";
  if (normalizedRole === "support") return "support";

  return "buyer";
}

function validateRegisterForm(form) {
  if (!form.fullName.trim()) {
    return "Ingresá tu nombre.";
  }

  if (!form.email.includes("@")) {
    return "Ingresá un email válido.";
  }

  if (!form.phone.trim()) {
    return "Ingresá un teléfono o WhatsApp.";
  }

  if (form.password.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  return "";
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
  const [resetPasswordForm, setResetPasswordForm] =
    useState(initialResetPassword);
  const [newPasswordForm, setNewPasswordForm] = useState(initialNewPassword);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "login") return;

    let prefillEmail = "";

    try {
      prefillEmail =
        window.sessionStorage.getItem(PREFILL_LOGIN_EMAIL_KEY) || "";
      if (prefillEmail) {
        window.sessionStorage.removeItem(PREFILL_LOGIN_EMAIL_KEY);
      }
    } catch {
      prefillEmail = "";
    }

    if (!prefillEmail) return;

    setLoginForm((current) => ({
      ...current,
      email: prefillEmail,
      password: "",
    }));
  }, [mode]);

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

  function updateResetPassword(field, value) {
    setResetPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateNewPassword(field, value) {
    setNewPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
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

  async function handleRegisterBuyer(event) {
    event.preventDefault();
    setMessage("");

    const validationError = validateRegisterForm(registerForm);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    const { data, error } = await signUpBuyer(registerForm);

    if (error) {
      setMessage(error.message || "No se pudo registrar el comprador.");
      return;
    }

    await onAuthChange(data?.user || null, { redirectByRole: true });

    setMessage(
      "Registro comprador creado. Si Supabase requiere confirmación por email, revisá tu correo."
    );
  }

  async function handleRegisterDealer(event) {
    event.preventDefault();
    setMessage("");

    const validationError = validateRegisterForm(registerForm);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    const { data, error } = await signUpDealer(registerForm);

    if (error) {
      const raw = String(error.message || "");
      const isDealerNotFound =
        raw.toLowerCase().includes("pendiente") ||
        raw.toLowerCase().includes("no exist") ||
        raw.toLowerCase().includes("not found") ||
        raw.toLowerCase().includes("dealer");
      setMessage(
        isDealerNotFound
          ? "No encontramos un dealer autorizado asociado a este email. Si todavía no solicitaste el alta, completá primero la solicitud comercial desde Sumate a la red."
          : raw || "No se pudo registrar el dealer. Verificá que el email coincida con el autorizado por administración."
      );
      return;
    }

    await onAuthChange(data?.user || null, { redirectByRole: true });

    setMessage(
      "Registro dealer creado y vinculado. Ya podés ingresar con tu email y contraseña."
    );
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setMessage("");

    if (!resetPasswordForm.email.includes("@")) {
      setMessage("Ingresá un email válido.");
      return;
    }

    const { error } = await resetPasswordForEmail(resetPasswordForm);

    if (error) {
      setMessage(error.message || "No se pudo enviar el email de recuperación.");
      return;
    }

    setMessage(
      "Te enviamos un email para recuperar tu contraseña. Revisá tu casilla y seguí el enlace."
    );
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();
    setMessage("");

    if (newPasswordForm.password.length < 6) {
      setMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPasswordForm.password !== newPasswordForm.confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    const { error } = await updateCurrentUserPassword({
      password: newPasswordForm.password,
    });

    if (error) {
      setMessage(
        error.message ||
          "No se pudo actualizar la contraseña. Abrí nuevamente el enlace de recuperación."
      );
      return;
    }

    setNewPasswordForm(initialNewPassword);
    setMessage("Contraseña actualizada correctamente. Ya podés ingresar.");
    setMode("login");
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
          El comprador puede explorar libremente. Para contactar, publicar,
          operar como dealer o gestionar la red, se requiere acceso identificado.
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
              <button onClick={() => switchMode("newPassword")}>
                Cambiar contraseña
              </button>
              <button onClick={handleLogout}>Cerrar sesión</button>
            </div>

            {mode === "newPassword" && (
              <form className="auth-form" onSubmit={handleUpdatePassword}>
                <label>
                  Nueva contraseña
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPasswordForm.password}
                    onChange={(event) =>
                      updateNewPassword("password", event.target.value)
                    }
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>
                {newPasswordForm.password.length > 0 && newPasswordForm.password.length < 6 && (
                  <small className="auth-field-hint auth-field-hint--warn">
                    Mínimo 6 caracteres ({newPasswordForm.password.length}/6)
                  </small>
                )}

                <label>
                  Repetir contraseña
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPasswordForm.confirmPassword}
                    onChange={(event) =>
                      updateNewPassword("confirmPassword", event.target.value)
                    }
                    placeholder="Repetí la nueva contraseña"
                  />
                </label>
                {newPasswordForm.confirmPassword.length > 0 &&
                  newPasswordForm.password !== newPasswordForm.confirmPassword && (
                  <small className="auth-field-hint auth-field-hint--warn">
                    Las contraseñas no coinciden.
                  </small>
                )}
                {newPasswordForm.confirmPassword.length > 0 &&
                  newPasswordForm.password === newPasswordForm.confirmPassword &&
                  newPasswordForm.password.length >= 6 && (
                  <small className="auth-field-hint auth-field-hint--ok">
                    Las contraseñas coinciden.
                  </small>
                )}

                <button className="primary-action" type="submit">
                  Actualizar contraseña
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="auth-mode-row">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => switchMode("login")}
              >
                Iniciar sesión
              </button>

              <button
                className={mode === "registerBuyer" ? "active" : ""}
                onClick={() => switchMode("registerBuyer")}
              >
                Registro comprador
              </button>

              <button
                className={mode === "registerDealer" ? "active" : ""}
                onClick={() => switchMode("registerDealer")}
              >
                Registro dealer autorizado
              </button>

              <button
                className={mode === "resetPassword" ? "active" : ""}
                onClick={() => switchMode("resetPassword")}
              >
                Olvidé mi contraseña
              </button>
            </div>

            {mode === "login" && (
              <form className="auth-form" onSubmit={handleLogin}>
                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
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
                    autoComplete="current-password"
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
            )}

            {mode === "registerBuyer" && (
              <form className="auth-form" onSubmit={handleRegisterBuyer}>
                <div className="auth-warning">
                  Este registro es para compradores. Si sos dealer, usá{" "}
                  <strong>Registro dealer</strong> con el email autorizado por
                  administración.
                </div>

                <label>
                  Nombre
                  <input
                    type="text"
                    autoComplete="name"
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
                    type="email"
                    autoComplete="email"
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
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
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
                    autoComplete="new-password"
                    value={registerForm.password}
                    onChange={(event) =>
                      updateRegister("password", event.target.value)
                    }
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>
                {registerForm.password.length > 0 && registerForm.password.length < 6 && (
                  <small className="auth-field-hint auth-field-hint--warn">
                    Mínimo 6 caracteres ({registerForm.password.length}/6)
                  </small>
                )}
                {registerForm.password.length >= 6 && (
                  <small className="auth-field-hint auth-field-hint--ok">
                    Contraseña válida.
                  </small>
                )}

                <p className="auth-legal-note">
                  Al registrarme acepto los{" "}
                  <button type="button" onClick={() => onNavigate?.("terms")}>
                    Términos y condiciones
                  </button>{" "}
                  y la{" "}
                  <button type="button" onClick={() => onNavigate?.("privacy")}>
                    Política de privacidad
                  </button>{" "}
                  de oX NEXMOV.
                </p>

                <button className="primary-action" type="submit">
                  Crear cuenta comprador
                </button>
              </form>
            )}

            {mode === "registerDealer" && (
              <form className="auth-form" onSubmit={handleRegisterDealer}>
                <div className="auth-warning">
                  <strong>Registro dealer autorizado</strong>
                  <br />
                  Este registro es solo para dealers previamente dados de alta
                  por administración. El email debe coincidir con el email
                  autorizado.
                  {onNavigate && (
                    <>
                      {" "}Si todavía no solicitaste un plan,{" "}
                      <button
                        type="button"
                        className="auth-inline-link"
                        onClick={() => onNavigate("joinNetwork")}
                      >
                        completá primero la solicitud comercial
                      </button>
                      .
                    </>
                  )}
                </div>

                <label>
                  Nombre del responsable
                  <input
                    type="text"
                    autoComplete="name"
                    value={registerForm.fullName}
                    onChange={(event) =>
                      updateRegister("fullName", event.target.value)
                    }
                    placeholder="Nombre del responsable"
                  />
                </label>

                <label>
                  Email autorizado
                  <input
                    type="email"
                    autoComplete="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      updateRegister("email", event.target.value)
                    }
                    placeholder="dealer@agencia.com"
                  />
                </label>

                <label>
                  Teléfono / WhatsApp
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={registerForm.phone}
                    onChange={(event) =>
                      updateRegister("phone", event.target.value)
                    }
                    placeholder="Ej: 11 3806 2294"
                  />
                </label>

                <label>
                  Crear contraseña
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={registerForm.password}
                    onChange={(event) =>
                      updateRegister("password", event.target.value)
                    }
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>

                <p className="auth-legal-note">
                  Al registrarme acepto los{" "}
                  <button type="button" onClick={() => onNavigate?.("terms")}>
                    Términos y condiciones
                  </button>{" "}
                  y la{" "}
                  <button type="button" onClick={() => onNavigate?.("privacy")}>
                    Política de privacidad
                  </button>{" "}
                  de oX NEXMOV.
                </p>

                <button className="primary-action" type="submit">
                  Crear acceso dealer
                </button>
              </form>
            )}

            {mode === "resetPassword" && (
              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="auth-warning">
                  La recuperación sirve para compradores, dealers, admin, soporte
                  y usuarios internos. Te enviaremos un enlace al email de tu
                  cuenta.
                </div>

                <label>
                  Email
                  <input
                    value={resetPasswordForm.email}
                    onChange={(event) =>
                      updateResetPassword("email", event.target.value)
                    }
                    placeholder="tu@email.com"
                  />
                </label>

                <button className="primary-action" type="submit">
                  Enviar recuperación
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
