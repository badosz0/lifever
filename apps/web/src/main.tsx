import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { AppErrorBoundary } from "./components/app-error-boundary";
import {
  purgeLegacyLocalData,
  purgeLegacyNotificationQueue,
} from "./lib/purge-legacy-local-data";
import { isTauri } from "./lib/runtime";
import "./styles/globals.css";

document.documentElement.dataset.tauri = String(isTauri);

async function bootstrap() {
  purgeLegacyLocalData();

  try {
    await purgeLegacyNotificationQueue();
  } catch (error) {
    console.warn("Could not clear legacy notifications", error);
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
