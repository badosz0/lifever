import type { Context, MiddlewareHandler } from "hono";

import type { CollaborationBindings } from "../collaboration/collaboration.types.js";
import type { AppAuth } from "./auth.js";

export const getSession = (context: Context, auth: AppAuth) =>
  auth.api.getSession({ headers: context.req.raw.headers });

export type AuthenticatedEnv = {
  Bindings: CollaborationBindings;
  Variables: {
    session: NonNullable<Awaited<ReturnType<AppAuth["api"]["getSession"]>>>;
  };
};

export type SessionMiddleware = MiddlewareHandler<AuthenticatedEnv>;

export const createSessionMiddleware =
  (auth: AppAuth): SessionMiddleware =>
  async (context, next) => {
    const session = await getSession(context, auth);
    if (!session) return context.json({ error: "Unauthorized" }, 401);

    context.set("session", session);
    await next();
  };
