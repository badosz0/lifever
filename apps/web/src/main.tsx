import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import "./styles/globals.css";

const isTauri = "__TAURI_INTERNALS__" in window;
document.documentElement.dataset.tauri = String(isTauri);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

