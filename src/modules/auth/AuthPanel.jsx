import "../../styles/auth.css";
import { useEffect, useRef, useState } from "react";
import { checkPromoCodeAvailable } from "../../services/promoCodes.service.js";
import FloatField from "../../components/FloatField.jsx";
import {
  signInWithEmail,
  signOut,
  signUpBuyer,
  signUpDealer,
  resetPasswordForEmail,
  updateCurrentUserPassword,
  localizeAuthError,
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
  activationCode: "",
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MODE_TITLES = {
  login: "Ingresar",
  registerBuyer: "Crear cuenta",
  registerDealer: "Acceso dealer",
  resetPassword: "Recuperar contraseña",
  newPassword: "Nueva contraseña",
};

function validateRegisterForm(form) {
  if (!form.fullName.trim()) {
    return "Ingresá tu nombre.";
  }

  if (!EMAIL_RE.test(form.email)) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoStatus, setPromoStatus] = useState(null);
  const promoDebounceRef = useRef(null);

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

    if (field === "activationCode") {
      const code = String(value || "").trim().toUpperCase();
      clearTimeout(promoDebounceRef.current);
      if (!code) { setPromoStatus(null); return; }
      setPromoStatus("checking");
      promoDebounceRef.current = setTimeout(async () => {
        const result = await checkPromoCodeAvailable(code);
        if (!result.available && result.reason === "invalid") setPromoStatus("invalid");
        else if (!result.available && result.reason === "exhausted") setPromoStatus("exhausted");
        else setPromoStatus("valid");
      }, 400);
    }
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
    setIsSubmitting(false);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const { data, error } = await signInWithEmail(loginForm);

    if (error) {
      setMessage(localizeAuthError(error));
      setIsSubmitting(false);
      return;
    }

    await onAuthChange(data?.user || null, { redirectByRole: true });
    setIsSubmitting(false);
  }

  async function handleRegisterBuyer(event) {
    event.preventDefault();
    setMessage("");

    const validationError = validateRegisterForm(registerForm);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await signUpBuyer(registerForm);

    if (error) {
      setMessage(localizeAuthError(error));
      setIsSubmitting(false);
      return;
    }

    if (!data?.session) {
      setMessage("Cuenta creada. Revisá tu casilla y hacé clic en el enlace de confirmación para activarla.");
      setIsSubmitting(false);
      return;
    }

    await onAuthChange(data?.user || null, { redirectByRole: true });
    setIsSubmitting(false);
  }

  async function handleRegisterDealer(event) {
    event.preventDefault();
    setMessage("");

    const validationError = validateRegisterForm(registerForm);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);
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
          : localizeAuthError(error)
      );
      setIsSubmitting(false);
      return;
    }

    await onAuthChange(data?.user || null, { redirectByRole: true });
    setIsSubmitting(false);
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setMessage("");

    if (!EMAIL_RE.test(resetPasswordForm.email)) {
      setMessage("Ingresá un email válido.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPasswordForEmail(resetPasswordForm);

    if (error) {
      setMessage(localizeAuthError(error));
      setIsSubmitting(false);
      return;
    }

    setMessage("Te enviamos un email para recuperar tu contraseña. Revisá tu casilla y seguí el enlace.");
    setIsSubmitting(false);
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

    setIsSubmitting(true);
    const { error } = await updateCurrentUserPassword({
      password: newPasswordForm.password,
    });

    if (error) {
      setMessage(localizeAuthError(error));
      setIsSubmitting(false);
      return;
    }

    setNewPasswordForm(initialNewPassword);
    setMessage("Contraseña actualizada correctamente. Ya podés ingresar.");
    setMode("login");
    setIsSubmitting(false);
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
        <h1>{MODE_TITLES[mode] || "Ingresar"}</h1>
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
                    minLength={6}
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

                <button className="primary-action" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Actualizando…" : "Actualizar contraseña"}
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
                <FloatField
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={loginForm.email}
                  onChange={(e) => updateLogin("email", e.target.value)}
                />
                <FloatField
                  label="Contraseña"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => updateLogin("password", e.target.value)}
                />
                <button className="primary-action" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Ingresando…" : "Ingresar"}
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

                <FloatField label="Nombre" type="text" autoComplete="name"
                  value={registerForm.fullName} onChange={(e) => updateRegister("fullName", e.target.value)} />
                <FloatField label="Email" type="email" autoComplete="email"
                  value={registerForm.email} onChange={(e) => updateRegister("email", e.target.value)} />
                <FloatField label="Teléfono / WhatsApp" type="tel" autoComplete="tel" inputMode="tel"
                  value={registerForm.phone} onChange={(e) => updateRegister("phone", e.target.value)} />
                <FloatField label="Contraseña" type="password" autoComplete="new-password" minLength={6}
                  value={registerForm.password} onChange={(e) => updateRegister("password", e.target.value)} />
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

                <button className="primary-action" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creando cuenta…" : "Crear cuenta comprador"}
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
                        onClick={() => onNavigate("joinNetwork", { openForm: true })}
                      >
                        completá primero la solicitud comercial
                      </button>
                      .
                    </>
                  )}
                </div>

                <FloatField label="Nombre del responsable" type="text" autoComplete="name"
                  value={registerForm.fullName} onChange={(e) => updateRegister("fullName", e.target.value)} />
                <FloatField label="Email autorizado" type="email" autoComplete="email"
                  value={registerForm.email} onChange={(e) => updateRegister("email", e.target.value)} />
                <FloatField label="Teléfono / WhatsApp" type="tel" autoComplete="tel" inputMode="tel"
                  value={registerForm.phone} onChange={(e) => updateRegister("phone", e.target.value)} />
                <FloatField label="Código de activación (opcional)" type="text" autoComplete="off"
                  value={registerForm.activationCode}
                  onChange={(e) => updateRegister("activationCode", e.target.value.toUpperCase())} />

                {promoStatus === "checking" && (
                  <div className="auth-message">Verificando código…</div>
                )}
                {promoStatus === "valid" && (
                  <div className="auth-message">
                    Código válido — 60 días de activación gratuita a partir del alta.
                  </div>
                )}
                {promoStatus === "exhausted" && (
                  <div className="auth-warning">
                    Este código ya alcanzó su límite de activaciones disponibles.
                  </div>
                )}
                {promoStatus === "invalid" && (
                  <div className="auth-warning">
                    Código no reconocido. Verificá que esté bien escrito.
                  </div>
                )}

                <FloatField label="Crear contraseña" type="password" autoComplete="new-password" minLength={6}
                  value={registerForm.password} onChange={(e) => updateRegister("password", e.target.value)} />

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

                <button className="primary-action" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Verificando…" : "Crear acceso dealer"}
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

                <FloatField label="Email" type="email" autoComplete="email"
                  value={resetPasswordForm.email} onChange={(e) => updateResetPassword("email", e.target.value)} />

                <button className="primary-action" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando…" : "Enviar recuperación"}
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
