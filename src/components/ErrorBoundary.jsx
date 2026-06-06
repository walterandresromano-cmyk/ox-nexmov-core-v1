import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log always — in prod this goes to the browser console and any external
    // monitoring tool that instruments console.error (e.g. Sentry auto-instrumentation)
    console.error("[ErrorBoundary]", error.message, {
      stack: error.stack,
      componentStack: info.componentStack,
    });

    // Best-effort beacon to a future monitoring endpoint
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(
          "/api/client-error",
          JSON.stringify({
            type: "react-boundary",
            message: error.message,
            stack: error.stack?.slice(0, 800),
            componentStack: info.componentStack?.slice(0, 400),
            url: window.location.href,
            ts: new Date().toISOString(),
          })
        );
      } catch {
        // non-fatal
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="page-section not-found-page">
          <div className="container not-found-shell">
            <div className="not-found-copy">
              <p className="eyebrow">Error</p>
              <h1>
                Algo salió mal<span>.</span>
              </h1>
              <p>
                Ocurrió un error inesperado en esta sección. Podés intentar
                recargar la página o volver al inicio.
              </p>
            </div>

            <div className="not-found-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => window.location.reload()}
              >
                Recargar página
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => { window.location.href = "/"; }}
              >
                Volver al inicio
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <pre className="error-boundary-detail">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
