import { Component } from "react";
import { captureError } from "../lib/sentry.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error.message, {
      stack: error.stack,
      componentStack: info.componentStack,
    });

    // Enviar a Sentry con el component stack como contexto
    captureError(error, {
      componentStack: info.componentStack?.slice(0, 800),
      url: window.location.href,
    });
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
