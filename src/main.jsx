import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/home.css";
import "./styles/search.css";
import "./styles/zeroKm.css";
import "./styles/sellVehicle.css";
import "./styles/joinNetwork.css";
import "./styles/about.css";
import "./styles/faq.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);