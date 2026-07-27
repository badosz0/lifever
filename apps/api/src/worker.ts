import { createApp } from "./app.js";
import { CollaborationRoom } from "./collaboration-room.js";
import { createApiConfig, type ApiEnvironment } from "./config/env.js";
import { createWorkerPrisma } from "./db/worker-client.js";
import { verifyCollaborationTicket } from "./modules/collaboration/collaboration-ticket.js";
import {
  collaborationRoomName,
  type CollaborationConnection,
} from "./modules/collaboration/collaboration.types.js";
import { getResourceAccess } from "./modules/sharing/sharing.service.js";

export interface WorkerBindings extends ApiEnvironment {
  COLLABORATION_ROOMS: DurableObjectNamespace<CollaborationRoom>;
  DB: D1Database;
}

const getWorkerEnvironment = (bindings: WorkerBindings): ApiEnvironment => ({
  NODE_ENV: "production",
  BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: bindings.BETTER_AUTH_URL,
  WEB_URL: bindings.WEB_URL,
  DISCORD_CLIENT_ID: bindings.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: bindings.DISCORD_CLIENT_SECRET,
  GOOGLE_CALENDAR_CLIENT_ID: bindings.GOOGLE_CALENDAR_CLIENT_ID,
  GOOGLE_CALENDAR_CLIENT_SECRET: bindings.GOOGLE_CALENDAR_CLIENT_SECRET,
  CALENDAR_TOKEN_ENCRYPTION_KEY: bindings.CALENDAR_TOKEN_ENCRYPTION_KEY,
});

const handleCollaborationSocket = async (
  request: Request,
  bindings: WorkerBindings,
  config: ReturnType<typeof createApiConfig>,
  prisma: ReturnType<typeof createWorkerPrisma>,
) => {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const origin = request.headers.get("Origin");
  const allowedOrigins = new Set([
    config.webUrl,
    "tauri://localhost",
    "https://tauri.localhost",
  ]);
  if (origin && !allowedOrigins.has(origin)) {
    return new Response("Origin not allowed", { status: 403 });
  }

  const ticket = new URL(request.url).searchParams.get("ticket");
  if (!ticket) return new Response("Missing ticket", { status: 401 });
  const payload = await verifyCollaborationTicket(ticket, config.authSecret);
  if (!payload) return new Response("Invalid ticket", { status: 401 });

  const access = await getResourceAccess(
    prisma,
    payload.user.id,
    payload.resourceType,
    payload.resourceId,
  );
  if (!access || !access.shared) {
    return new Response("Shared item not found", { status: 404 });
  }

  const connection: CollaborationConnection = {
    connectionId: payload.connectionId,
    clientId: payload.clientId,
    focus: null,
    joinedAt: Date.now(),
    permission: access.permission,
    user: payload.user,
  };
  const room = bindings.COLLABORATION_ROOMS.getByName(
    collaborationRoomName(payload.resourceType, payload.resourceId),
  );
  return room.fetch("https://collaboration.internal/connect", {
    headers: {
      Upgrade: "websocket",
      "X-Lifever-Collaboration-Connection": encodeURIComponent(
        JSON.stringify(connection),
      ),
    },
  });
};

export default {
  async fetch(request, bindings, executionContext) {
    const config = createApiConfig(getWorkerEnvironment(bindings), {
      defaultAuthUrl: new URL(request.url).origin,
    });
    const prisma = createWorkerPrisma(bindings.DB);

    try {
      if (
        new URL(request.url).pathname === "/api/collaboration/socket"
      ) {
        return await handleCollaborationSocket(
          request,
          bindings,
          config,
          prisma,
        );
      }
      const app = createApp({ config, prisma });
      return await app.fetch(request, bindings, executionContext);
    } finally {
      executionContext.waitUntil(prisma.$disconnect());
    }
  },
} satisfies ExportedHandler<WorkerBindings>;

export { CollaborationRoom };
