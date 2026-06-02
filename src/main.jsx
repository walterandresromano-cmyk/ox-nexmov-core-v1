import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/dealer-dashboard.css";
import "./styles/home.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);