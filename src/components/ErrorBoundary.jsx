import { Component } from "react";
import { captureError } from "../lib/sentry.js";

// ── Page-level boundary (variant="page", default) ─────────────────────────────
// Usada en App.jsx para crashes de ruta. Muestra pantalla completa con reload.
//
// ── Panel-level boundary (variant="panel") ────────────────────────────────────
// Usada dentro de DealerPanel / AdminPanel. Muestra error compacto inline
// con botón "Reintentar" que resetea el estado sin recargar la página.

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error.message, {
      stack: error.stack,
      componentStack: info.componentStack,
    });

    captureError(error, {
      componentStack: info.componentStack?.slice(0, 800),
      label: this.props.label,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.variant === "panel") {
      const label = this.props.label || "este módulo";
      return (
        <div className="panel-error-boundary" role="alert">
          <span className="panel-error-boundary__icon" aria-hidden="true">⚠</span>
          <p className="panel-error-boundary__title">No se pudo cargar {label}</p>
          <p className="panel-error-boundary__msg">
            Ocurrió un error inesperado. Podés reintentar o recargar la página.
          </p>
          <div className="panel-error-boundary__actions">
            <button type="button" onClick={this.reset}>
              Reintentar
            </button>
            <button type="button" onClick={() => window.location.reload()}>
              Recargar página
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="panel-error-boundary__detail">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    // variant="page" (default) — pantalla completa
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
}
