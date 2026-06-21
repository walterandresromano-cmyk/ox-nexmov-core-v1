import React from "react";
import ReactDOM from "react-dom/client";
import { initSentry, initWebVitals } from "./lib/sentry.js";
import App from "./app/App.jsx";
import PreviewGate from "./components/PreviewGate.jsx";

initSentry(); // fire-and-forget: async pero no bloquea el render
initWebVitals(); // registra LCP, CLS, INP, FCP, TTFB — dynamic import, cero peso en main bundle

// Cuando el service worker actualiza a una versión nueva, recargar la página
// para que todos los usuarios reciban el deploy sin intervención manual.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/responsive.css";
import "./styles/pwa.css";
import "./styles/clay.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PreviewGate>
      <App />
    </PreviewGate>
  </React.StrictMode>
);