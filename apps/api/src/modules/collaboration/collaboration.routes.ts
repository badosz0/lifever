import { Hono } from "hono";
import { z } from "zod";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import { getResourceAccess } from "../sharing/sharing.service.js";
import { createCollaborationTicket } from "./collaboration-ticket.js";

const ticketRequestSchema = z.object({
  resourceType: z.enum(["note", "kanbanProject", "calendar"]),
  resourceId: z.string().min(1).max(200),
});

const clientIdPattern = /^[a-zA-Z0-9_-]{8,100}$/u;
const TICKET_LIFETIME_MS = 60_000;

export const createCollaborationRoutes = ({
  config,
  prisma,
  requireSession,
}: RouteDependencies) => {
  const routes = new Hono<AuthenticatedEnv>();
  routes.use("*", requireSession);

  routes.post("/tickets", async (context) => {
    if (!context.env?.COLLABORATION_ROOMS) {
      return context.json({ error: "Live collaboration is unavailable." }, 503);
    }

    const parsed = ticketRequestSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json({ error: "Invalid collaboration room." }, 400);
    }

    const session = context.get("session");
    const access = await getResourceAccess(
      prisma,
      session.user.id,
      parsed.data.resourceType,
      parsed.data.resourceId,
    );
    if (!access || !access.shared) {
      return context.json({ error: "Shared item not found." }, 404);
    }

    const requestedClientId = context.req.header("X-Lifever-Client-Id");
    const clientId =
      requestedClientId && clientIdPattern.test(requestedClientId)
        ? requestedClientId
        : crypto.randomUUID();
    const expiresAt = Date.now() + TICKET_LIFETIME_MS;
    const ticket = await createCollaborationTicket(
      {
        version: 1,
        connectionId: crypto.randomUUID(),
        clientId,
        expiresAt,
        permission: access.permission,
        resourceId: parsed.data.resourceId,
        resourceType: parsed.data.resourceType,
        user: {
          id: session.user.id,
          name: session.user.name,
          image: session.user.image ?? null,
        },
      },
      config.authSecret,
    );

    return context.json({ ticket, expiresAt });
  });

  return routes;
};
