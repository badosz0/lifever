import type { Context } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type {
  CollaborationBroadcast,
  CollaborationChange,
} from "./collaboration.types.js";
import { collaborationRoomName } from "./collaboration.types.js";
import type { ResourceType } from "../sharing/sharing.schema.js";

type PublishInput = {
  change: CollaborationChange;
  resourceId: string;
  resourceType: ResourceType;
  shared: boolean;
};

export const publishCollaborationChange = (
  context: Context<AuthenticatedEnv>,
  input: PublishInput,
) => {
  const rooms = context.env?.COLLABORATION_ROOMS;
  if (!rooms || !input.shared) return;

  const message: CollaborationBroadcast = {
    type: "resource.changed",
    actorClientId:
      context.req.header("X-Lifever-Client-Id") ?? null,
    change: input.change,
    resourceId: input.resourceId,
    resourceType: input.resourceType,
    sentAt: Date.now(),
  };
  const room = rooms.getByName(
    collaborationRoomName(input.resourceType, input.resourceId),
  );
  context.executionCtx.waitUntil(
    room
      .fetch("https://collaboration.internal/publish", {
        method: "POST",
        body: JSON.stringify(message),
      })
      .catch((error) => {
        console.error("Could not publish collaboration change", error);
      }),
  );
};

export const updateCollaborationAccess = (
  context: Context<AuthenticatedEnv>,
  input: {
    resourceId: string;
    resourceType: ResourceType;
    removedUserId?: string;
    shared: boolean;
  },
) => {
  const rooms = context.env?.COLLABORATION_ROOMS;
  if (!rooms) return;
  const room = rooms.getByName(
    collaborationRoomName(input.resourceType, input.resourceId),
  );
  context.executionCtx.waitUntil(
    room
      .fetch("https://collaboration.internal/access", {
        method: "POST",
        body: JSON.stringify({
          removedUserId: input.removedUserId,
          shared: input.shared,
        }),
      })
      .catch((error) => {
        console.error("Could not update collaboration access", error);
      }),
  );
};
