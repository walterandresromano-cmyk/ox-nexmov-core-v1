import "../../styles/auth.css";
import { useState } from "react";

import {
  signOut,
  updateCurrentUserPassword,
} from "../../services/auth.service.js";

const initialForm = {
  password: "",
  confirmPassword: "",
};

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

export default function ResetPasswordPanel({ onAuthChange, onNavigate }) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

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
            {!updated ? (
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
            ) : (
              <div className="auth-actions">
                <button type="button" onClick={goToLogin}>
                  Ir a ingresar
                </button>
              </div>
            )}

            {errorMessage && <div className="auth-warning">{errorMessage}</div>}
            {message && <div className="auth-message">{message}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
