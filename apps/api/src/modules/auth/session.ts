import type { Context } from "hono";

import { auth } from "./auth.js";

export const getSession = (context: Context) =>
  auth.api.getSession({ headers: context.req.raw.headers });

