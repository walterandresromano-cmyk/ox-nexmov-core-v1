import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE; // "production" | "development"

export function initSentry() {
  if (!DSN) return; // No-op si no hay DSN configurado

  Sentry.init({
    dsn: DSN,
    environment: ENV,

    // Captura el 100% de errores pero solo el 10% de trazas de performance
    // en producción para no exceder la cuota gratuita
    tracesSampleRate: ENV === "production" ? 0.1 : 1.0,

    // Ignorar errores conocidos de red / extensiones de browser
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      /^Loading chunk \d+ failed/,
      /^Failed to fetch dynamically imported module/,
    ],

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Session replay: 1% de sesiones normales, 100% con error
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event) {
      // No enviar errores en desarrollo
      if (ENV !== "production") return null;
      return event;
    },
  });
}

/**
 * Captura una excepción con contexto adicional.
 * Safe to call aunque Sentry no esté inicializado.
 */
export function captureError(error, context = {}) {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
    Sentry.captureException(error);
  });
}

/**
 * Identifica al usuario en Sentry para correlacionar errores.
 * Llamar después del login.
 */
export function setSentryUser(user) {
  if (!DSN) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // No enviar datos sensibles — solo ID y email
  });
}

/**
 * Captura errores del patrón { data, error } de Supabase.
 * Solo reporta errores reales (no RLS silenciosos de usuario no autenticado).
 *
 * Uso: const { data, error } = await supabase.from(...).select(...)
 *       reportSupabaseError(error, "leads.service / createLead")
 */
export function reportSupabaseError(error, context = "") {
  if (!error || !DSN) return;

  // Ignorar errores esperados que no indican bugs
  const IGNORED_CODES = new Set([
    "PGRST116", // No rows found (normal en queries opcionales)
    "42501",    // RLS violation (usuario no autorizado — esperado)
    "23505",    // Unique violation (deduplicación intencionada)
  ]);
  if (IGNORED_CODES.has(error.code)) return;

  captureError(new Error(`[Supabase] ${error.message}`), {
    supabase_code:    error.code,
    supabase_details: error.details,
    supabase_hint:    error.hint,
    context,
  });
}

export { Sentry };
