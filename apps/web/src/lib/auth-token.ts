import { POPUP_TOKEN_STORAGE_KEY } from "better-auth/client/plugins";

import { isTauri } from "./runtime";

const DESKTOP_AUTH_TOKEN_STORAGE_KEY = "lifever-desktop-auth-token-v1";

export const getDesktopAuthToken = () => {
  if (!isTauri) return undefined;

  try {
    const storedToken = window.localStorage.getItem(
      DESKTOP_AUTH_TOKEN_STORAGE_KEY,
    );
    if (storedToken) return storedToken;

    // Keep existing desktop sessions when upgrading from releases that used
    // Better Auth's internal popup key directly.
    const legacyToken = window.localStorage.getItem(POPUP_TOKEN_STORAGE_KEY);
    if (legacyToken) {
      window.localStorage.setItem(
        DESKTOP_AUTH_TOKEN_STORAGE_KEY,
        legacyToken,
      );
    }
    return legacyToken ?? undefined;
  } catch {
    return undefined;
  }
};

export const setDesktopAuthToken = (token: string) => {
  window.localStorage.setItem(DESKTOP_AUTH_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(POPUP_TOKEN_STORAGE_KEY, token);
};

export const clearDesktopAuthToken = () => {
  if (!isTauri) return;

  try {
    window.localStorage.removeItem(DESKTOP_AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(POPUP_TOKEN_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened webviews.
  }
};
