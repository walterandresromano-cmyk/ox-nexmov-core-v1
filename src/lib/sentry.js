// Sentry se carga SOLO si hay DSN configurado.
// Sin DSN: este módulo no tiene efectos secundarios y no parchea fetch.

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE;

let _sentry = null;

async function getSentry() {
  if (!_sentry) _sentry = await import("@sentry/react");
  return _sentry;
}

export async function initSentry() {
  if (!DSN) return;

  const Sentry = await getSentry();

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    tracesSampleRate: ENV === "production" ? 0.1 : 1.0,
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
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (ENV !== "production") return null;
      return event;
    },
  });
}

export function captureError(error, context = {}) {
  if (!DSN || !_sentry) return;
  _sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
    _sentry.captureException(error);
  });
}

export function setSentryUser(user) {
  if (!DSN || !_sentry) return;
  _sentry.setUser(user ? { id: user.id, email: user.email } : null);
}

export function reportSupabaseError(error, context = "") {
  if (!error || !DSN || !_sentry) return;

  const IGNORED_CODES = new Set([
    "PGRST116",
    "42501",
    "23505",
  ]);
  if (IGNORED_CODES.has(error.code)) return;

  captureError(new Error(`[Supabase] ${error.message}`), {
    supabase_code:    error.code,
    supabase_details: error.details,
    supabase_hint:    error.hint,
    context,
  });
}
