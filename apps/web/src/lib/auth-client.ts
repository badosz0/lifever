import { createAuthClient } from "better-auth/react";
import { oauthPopupClient } from "better-auth/client/plugins";

import { apiUrl } from "./api";
import {
  clearDesktopAuthToken,
  getDesktopAuthToken,
  setDesktopAuthToken,
} from "./auth-token";
import { isTauri } from "./runtime";

const oauthPopupMessageType = "better-auth:oauth-popup";

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [oauthPopupClient()],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: getDesktopAuthToken,
    },
    credentials: "include",
  },
});

type OAuthPopupMessage = {
  type?: string;
  token?: string;
};

const closeDesktopOAuthWindow = async () => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("close_oauth_window");
  } catch {
    // The OAuth window may have already closed itself.
  }
};

export const signInWithDiscord = async () => {
  if (!isTauri) {
    return authClient.signIn.social({
      provider: "discord",
      callbackURL: window.location.href,
    });
  }

  let capturedToken: string | undefined;
  const authOrigin = new URL(apiUrl).origin;
  const captureToken = (event: MessageEvent<OAuthPopupMessage>) => {
    if (event.origin !== authOrigin) return;
    if (event.data?.type !== oauthPopupMessageType) return;
    if (typeof event.data.token === "string" && event.data.token) {
      capturedToken = event.data.token;
    }
  };

  window.addEventListener("message", captureToken);
  try {
    const result = await authClient.signIn.popup({
      provider: "discord",
      callbackURL: window.location.href,
    });
    if (!capturedToken) return result;

    setDesktopAuthToken(capturedToken);
    const session = await authClient.getSession();
    if (session.error || !session.data) {
      clearDesktopAuthToken();
      return result;
    }

    authClient.$store.notify("$sessionSignal");
    return { data: { success: true }, error: null };
  } finally {
    window.removeEventListener("message", captureToken);
    await closeDesktopOAuthWindow();
  }
};
