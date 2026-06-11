// Sentry se carga SOLO si hay DSN configurado.
// Sin DSN: este módulo no tiene efectos secundarios y no parchea fetch.

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE;

// Funciones de Sentry cargadas lazily — null hasta que initSentry() se llame
let _init               = null;
let _captureException   = null;
let _withScope          = null;
let _setUser            = null;
let _browserTracing     = null;

export async function initSentry() {
  if (!DSN) return;

  // Importar solo los named exports necesarios — permite tree-shaking de Replay
  const {
    init,
    captureException,
    withScope,
    setUser,
    browserTracingIntegration,
  } = await import("@sentry/browser");

  _init             = init;
  _captureException = captureException;
  _withScope        = withScope;
  _setUser          = setUser;
  _browserTracing   = browserTracingIntegration;

  init({
    dsn: DSN,
    environment: ENV,
    tracesSampleRate: ENV === "production" ? 0.1 : 1.0,
    integrations: [browserTracingIntegration()],
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      /^Loading chunk \d+ failed/,
      /^Failed to fetch dynamically imported module/,
    ],
    beforeSend(event) {
      if (ENV !== "production") return null;
      return event;
    },
  });
}

export function captureError(error, context = {}) {
  if (!DSN || !_withScope) return;
  _withScope((scope) => {
    Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
    _captureException(error);
  });
}

export function setSentryUser(user) {
  if (!DSN || !_setUser) return;
  _setUser(user ? { id: user.id, email: user.email } : null);
}

export function reportSupabaseError(error, context = "") {
  if (!error || !DSN || !_captureException) return;

  const IGNORED_CODES = new Set(["PGRST116", "42501", "23505"]);
  if (IGNORED_CODES.has(error.code)) return;

  captureError(new Error(`[Supabase] ${error.message}`), {
    supabase_code:    error.code,
    supabase_details: error.details,
    supabase_hint:    error.hint,
    context,
  });
}
