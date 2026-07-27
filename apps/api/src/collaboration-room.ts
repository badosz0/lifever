import { DurableObject } from "cloudflare:workers";

import type { WorkerBindings } from "./worker.js";
import type {
  CollaborationBroadcast,
  CollaborationConnection,
  CollaborationFocus,
} from "./modules/collaboration/collaboration.types.js";

const isFocus = (value: unknown): value is CollaborationFocus => {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const focus = value as { kind?: unknown; id?: unknown };
  return (
    (focus.kind === "calendar-event" ||
      focus.kind === "kanban-card" ||
      focus.kind === "note" ||
      focus.kind === "resource") &&
    typeof focus.id === "string" &&
    focus.id.length <= 200
  );
};

export class CollaborationRoom extends DurableObject<WorkerBindings> {
  constructor(ctx: DurableObjectState, env: WorkerBindings) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  private connections() {
    return this.ctx.getWebSockets().flatMap((socket) => {
      const connection =
        socket.deserializeAttachment() as CollaborationConnection | null;
      return connection ? [{ socket, connection }] : [];
    });
  }

  private send(socket: WebSocket, message: unknown) {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // Cloudflare will remove closed sockets from getWebSockets().
    }
  }

  private broadcastPresence() {
    const connections = this.connections();
    const peers = connections.map(({ connection }) => connection);
    for (const { socket } of connections) {
      this.send(socket, { type: "presence.snapshot", peers });
    }
  }

  override async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }
      const encodedConnection = request.headers.get(
        "X-Lifever-Collaboration-Connection",
      );
      if (!encodedConnection) {
        return new Response("Missing connection", { status: 401 });
      }

      let connection: CollaborationConnection;
      try {
        connection = JSON.parse(
          decodeURIComponent(encodedConnection),
        ) as CollaborationConnection;
      } catch {
        return new Response("Invalid connection", { status: 400 });
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server, [`user:${connection.user.id}`]);
      server.serializeAttachment(connection);
      this.send(server, {
        type: "ready",
        connectionId: connection.connectionId,
      });
      this.broadcastPresence();
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/publish" && request.method === "POST") {
      const message = (await request.json()) as CollaborationBroadcast;
      for (const { socket, connection } of this.connections()) {
        if (
          message.actorClientId &&
          connection.clientId === message.actorClientId
        ) {
          continue;
        }
        this.send(socket, message);
      }
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/access" && request.method === "POST") {
      const change = (await request.json()) as {
        removedUserId?: string;
        shared?: boolean;
      };
      for (const { socket, connection } of this.connections()) {
        if (
          change.shared === false ||
          (change.removedUserId &&
            connection.user.id === change.removedUserId)
        ) {
          this.send(socket, { type: "access.revoked" });
          socket.close(4003, "Collaboration access changed");
        }
      }
      this.broadcastPresence();
      return new Response(null, { status: 204 });
    }

    return new Response("Not found", { status: 404 });
  }

  override async webSocketMessage(
    socket: WebSocket,
    rawMessage: string | ArrayBuffer,
  ) {
    if (typeof rawMessage !== "string" || rawMessage.length > 2_000) return;
    let message: { type?: unknown; focus?: unknown };
    try {
      message = JSON.parse(rawMessage) as typeof message;
    } catch {
      return;
    }
    if (message.type !== "presence.update" || !isFocus(message.focus)) return;

    const connection =
      socket.deserializeAttachment() as CollaborationConnection | null;
    if (!connection) return;
    socket.serializeAttachment({ ...connection, focus: message.focus });
    this.broadcastPresence();
  }

  override async webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
  ) {
    socket.close(code, reason);
    this.broadcastPresence();
  }

  override async webSocketError(socket: WebSocket) {
    socket.close(1011, "WebSocket error");
    this.broadcastPresence();
  }
}
