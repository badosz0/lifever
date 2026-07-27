import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { purgeLegacyLocalData } from "./lib/purge-legacy-local-data";
import { isTauri } from "./lib/runtime";
import "./styles/globals.css";

document.documentElement.dataset.tauri = String(isTauri);
purgeLegacyLocalData();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
