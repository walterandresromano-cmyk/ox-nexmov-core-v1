// Sentry se carga SOLO si hay DSN configurado.
// Sin DSN: este módulo no tiene efectos secundarios y no parchea fetch.

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE;

// Funciones de Sentry cargadas lazily — null hasta que initSentry() se llame
let _init               = null;
let _captureException   = null;
let _captureEvent       = null;
let _addBreadcrumb      = null;
let _withScope          = null;
let _setUser            = null;
let _browserTracing     = null;

export async function initSentry() {
  if (!DSN) return;

  // Importar solo los named exports necesarios — permite tree-shaking de Replay
  const {
    init,
    captureException,
    captureEvent,
    addBreadcrumb,
    withScope,
    setUser,
    browserTracingIntegration,
  } = await import("@sentry/browser");

  _init             = init;
  _captureException = captureException;
  _captureEvent     = captureEvent;
  _addBreadcrumb    = addBreadcrumb;
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

// ── Web Vitals ────────────────────────────────────────────────────────────────

// Umbrales de Google para cada métrica (valores "poor")
const VITAL_UNITS = { CLS: "", LCP: "ms", INP: "ms", FCP: "ms", TTFB: "ms" };

function onVitalReport(metric) {
  const unit  = VITAL_UNITS[metric.name] ?? "ms";
  const value = metric.name === "CLS"
    ? +metric.value.toFixed(4)
    : Math.round(metric.value);

  if (ENV !== "production") {
    const color = metric.rating === "good" ? "\x1b[32m"
      : metric.rating === "poor"            ? "\x1b[31m"
      :                                       "\x1b[33m";
    console.debug(`${color}[Vital] ${metric.name}: ${value}${unit} (${metric.rating})\x1b[0m`);
  }

  if (!DSN) return;

  // Registrar como breadcrumb — aparece en el contexto de futuros errores Sentry
  _addBreadcrumb?.({
    category: "web-vital",
    message:  `${metric.name}: ${value}${unit} (${metric.rating})`,
    level:    metric.rating === "poor" ? "warning" : "info",
    data: {
      value,
      rating: metric.rating,
      page:   typeof window !== "undefined" ? window.location.pathname : undefined,
    },
  });

  // Crear evento independiente solo para métricas "poor" — evita ruido en Sentry
  if (metric.rating === "poor" && _captureEvent) {
    _captureEvent({
      level:   "warning",
      message: `[Web Vital] ${metric.name} degradado — ${value}${unit}`,
      tags: {
        vital_name:   metric.name,
        vital_rating: metric.rating,
        page:         typeof window !== "undefined" ? window.location.pathname : undefined,
      },
      extra: { value, delta: Math.round(metric.delta) },
      // Un issue por métrica y página — no acumular en uno solo
      fingerprint: ["web-vital-poor", metric.name],
    });
  }
}

/**
 * Registra los 5 Core/Diagnostic Web Vitals: LCP, CLS, INP, FCP, TTFB.
 * Importa web-vitals de forma dinámica para no añadir peso al bundle principal.
 * Llamar desde main.jsx después de initSentry().
 */
export function initWebVitals() {
  import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    onCLS(onVitalReport);
    onFCP(onVitalReport);
    onINP(onVitalReport);
    onLCP(onVitalReport);
    onTTFB(onVitalReport);
  }).catch(() => {
    // web-vitals no disponible — no bloquear
  });
}
