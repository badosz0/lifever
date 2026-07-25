import { POPUP_TOKEN_STORAGE_KEY } from "better-auth/client/plugins";

import { isTauri } from "./runtime";

export const getDesktopAuthToken = () => {
  if (!isTauri) return undefined;

  try {
    return window.localStorage.getItem(POPUP_TOKEN_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

export const setDesktopAuthToken = (token: string) => {
  window.localStorage.setItem(POPUP_TOKEN_STORAGE_KEY, token);
};

export const clearDesktopAuthToken = () => {
  if (!isTauri) return;

  try {
    window.localStorage.removeItem(POPUP_TOKEN_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened webviews.
  }
};
