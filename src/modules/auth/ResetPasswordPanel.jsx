import "../../styles/auth.css";
import { useEffect, useRef, useState } from "react";

import {
  signOut,
  updateCurrentUserPassword,
} from "../../services/auth.service.js";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient.js";

const initialForm = {
  password: "",
  confirmPassword: "",
};

const PREFILL_LOGIN_EMAIL_KEY = "ox_prefill_login_email";

const invalidRecoveryMessage =
  "El enlace expiró o no es válido. Solicitá un nuevo recupero de contraseña.";

function getRecoveryErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("session") ||
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("expired") ||
    message.includes("invalid") ||
    message.includes("not authenticated") ||
    message.includes("auth")
  ) {
    return invalidRecoveryMessage;
  }

  return error?.message || "No se pudo actualizar la contraseña.";
}

function getRecoveryParamsFromHash() {
  if (typeof window === "undefined") {
    return {
      tokenHash: "",
      type: "",
    };
  }

  const rawHash = window.location.hash || "";
  const queryIndex = rawHash.indexOf("?");

  if (queryIndex === -1) {
    return {
      tokenHash: "",
      type: "",
    };
  }

  const params = new URLSearchParams(rawHash.slice(queryIndex + 1));

  return {
    tokenHash: params.get("token_hash") || "",
    type: params.get("type") || "",
  };
}

function savePrefillLoginEmail(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) return;

  try {
    window.sessionStorage.setItem(PREFILL_LOGIN_EMAIL_KEY, cleanEmail);
  } catch {
    // sessionStorage unavailable
  }
}

export default function ResetPasswordPanel({ onAuthChange, onNavigate }) {
  const verifiedOnceRef = useRef(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    async function verifyRecoveryToken() {
      if (verifiedOnceRef.current) return;

      const { tokenHash, type } = getRecoveryParamsFromHash();

      if (!tokenHash || type !== "recovery") return;

      verifiedOnceRef.current = true;
      setVerifying(true);
      setErrorMessage("");
      setVerificationFailed(false);

      if (!isSupabaseConfigured || !supabase) {
        setVerifying(false);
        setVerificationFailed(true);
        setErrorMessage(invalidRecoveryMessage);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: tokenHash,
      });

      setVerifying(false);

      if (error) {
        setVerificationFailed(true);
        setErrorMessage(invalidRecoveryMessage);
      }
    }

    verifyRecoveryToken();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function goToLogin() {
    onNavigate?.("login");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (form.password.length < 6) {
      setErrorMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error } = await updateCurrentUserPassword({
      password: form.password,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(getRecoveryErrorMessage(error));
      return;
    }

    const { data: userData } =
      isSupabaseConfigured && supabase
        ? await supabase.auth.getUser()
        : { data: null };

    savePrefillLoginEmail(userData?.user?.email);
    setForm(initialForm);
    setUpdated(true);
    setLoading(false);
    setMessage("Contraseña actualizada correctamente. Ya podés ingresar.");
    await signOut();
    await onAuthChange?.(null, { redirect: false });
  }

  return (
    <section className="page-section auth-page">
      <div className="container panel auth-panel">
        <p className="eyebrow">Recuperación de acceso</p>
        <div className="auth-access-grid">
          <div className="auth-info-card">
            <span>Cuenta oX NEXMOV</span>
            <h2>Crear nueva contraseña</h2>
            <p>
              Ingresá una nueva contraseña para recuperar el acceso a tu cuenta.
            </p>
          </div>

          <div className="auth-form-card">
            {verifying && (
              <div className="auth-message">Validando enlace de recupero...</div>
            )}

            {!updated && !verifying && !verificationFailed ? (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                  Nueva contraseña
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </label>
                {form.password.length > 0 && form.password.length < 6 && (
                  <small className="auth-field-hint auth-field-hint--warn">
                    Mínimo 6 caracteres ({form.password.length}/6)
                  </small>
                )}

                <label>
                  Confirmar contraseña
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      updateField("confirmPassword", event.target.value)
                    }
                    placeholder="Repetí la nueva contraseña"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </label>
                {form.confirmPassword.length > 0 &&
                  form.password !== form.confirmPassword && (
                    <small className="auth-field-hint auth-field-hint--warn">
                      Las contraseñas no coinciden.
                    </small>
                  )}
                {form.confirmPassword.length > 0 &&
                  form.password === form.confirmPassword &&
                  form.password.length >= 6 && (
                    <small className="auth-field-hint auth-field-hint--ok">
                      Las contraseñas coinciden.
                    </small>
                  )}

                <button
                  className="primary-action"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </form>
            ) : null}

            {updated ? (
              <div className="auth-actions">
                <button type="button" onClick={goToLogin}>
                  Ir a ingresar
                </button>
              </div>
            ) : null}

            {errorMessage && <div className="auth-warning">{errorMessage}</div>}
            {message && <div className="auth-message">{message}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
