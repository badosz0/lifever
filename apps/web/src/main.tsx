import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { isTauri } from "./lib/runtime";
import "./styles/globals.css";

document.documentElement.dataset.tauri = String(isTauri);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
