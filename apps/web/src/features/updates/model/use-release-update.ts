import { useEffect, useState } from "react";

import {
  compareVersions,
  getLatestRelease,
  type ReleaseUpdate,
} from "@/features/updates/lib/github-releases";
import { isTauri } from "@/lib/runtime";

const CHECK_INTERVAL_MS = 30 * 60 * 1_000;
const CHECK_TIMEOUT_MS = 15_000;

function getPreviewUpdate(): ReleaseUpdate | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  const version = new URLSearchParams(window.location.search).get(
    "previewUpdate",
  );
  if (!version) {
    return null;
  }

  return {
    version,
    releaseUrl: "https://github.com/badosz0/lifever/releases/latest",
  };
}

export function useReleaseUpdate() {
  const [availableUpdate, setAvailableUpdate] =
    useState<ReleaseUpdate | null>(null);

  useEffect(() => {
    const previewUpdate = getPreviewUpdate();
    if (previewUpdate) {
      setAvailableUpdate(previewUpdate);
      return;
    }

    if (!isTauri) {
      return;
    }

    let active = true;
    let checking = false;
    let lastCheckStartedAt = 0;
    let currentController: AbortController | null = null;

    const checkForUpdate = async () => {
      if (checking) {
        return;
      }

      checking = true;
      lastCheckStartedAt = Date.now();
      currentController = new AbortController();
      const timeoutId = window.setTimeout(
        () => currentController?.abort(),
        CHECK_TIMEOUT_MS,
      );

      try {
        const [{ getVersion }, latestRelease] = await Promise.all([
          import("@tauri-apps/api/app"),
          getLatestRelease(currentController.signal),
        ]);
        const currentVersion = await getVersion();

        if (active) {
          setAvailableUpdate(
            compareVersions(latestRelease.version, currentVersion) > 0
              ? latestRelease
              : null,
          );
        }
      } catch {
        // A failed background check should not interrupt the app or hide a
        // previously discovered update. The next scheduled check will retry.
      } finally {
        window.clearTimeout(timeoutId);
        checking = false;
        currentController = null;
      }
    };

    void checkForUpdate();

    const intervalId = window.setInterval(
      () => void checkForUpdate(),
      CHECK_INTERVAL_MS,
    );
    const checkWhenVisible = () => {
      const checkIsDue =
        Date.now() - lastCheckStartedAt >= CHECK_INTERVAL_MS;
      if (document.visibilityState === "visible" && checkIsDue) {
        void checkForUpdate();
      }
    };

    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      active = false;
      currentController?.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, []);

  return availableUpdate;
}
