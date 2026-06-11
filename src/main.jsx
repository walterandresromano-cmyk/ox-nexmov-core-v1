import React from "react";
import ReactDOM from "react-dom/client";
import { initSentry } from "./lib/sentry.js";
import App from "./app/App.jsx";

initSentry();

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/responsive.css";
import "./styles/pwa.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);