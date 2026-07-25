import type { Context, MiddlewareHandler } from "hono";

import { auth } from "./auth.js";

export const getSession = (context: Context) =>
  auth.api.getSession({ headers: context.req.raw.headers });

export type AuthenticatedEnv = {
  Variables: {
    session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  };
};

export const requireSession: MiddlewareHandler<AuthenticatedEnv> = async (
  context,
  next,
) => {
  const session = await getSession(context);
  if (!session) return context.json({ error: "Unauthorized" }, 401);

  context.set("session", session);
  await next();
};
