import { createAuthClient } from "better-auth/react";
import { oauthPopupClient } from "better-auth/client/plugins";

import { apiUrl } from "./api";

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [oauthPopupClient()],
  fetchOptions: {
    credentials: "include",
  },
});
