import type {
  ResourceType,
  SharePermission,
} from "../sharing/sharing.schema.js";

export type CollaborationRoomStub = {
  fetch(input: string | Request, init?: RequestInit): Promise<Response>;
};

export type CollaborationRoomNamespace = {
  getByName(name: string): CollaborationRoomStub;
};

export type CollaborationBindings = {
  COLLABORATION_ROOMS?: CollaborationRoomNamespace;
};

export type CollaborationUser = {
  id: string;
  name: string;
  image: string | null;
};

export type CollaborationTicketPayload = {
  version: 1;
  connectionId: string;
  clientId: string;
  expiresAt: number;
  permission: SharePermission;
  resourceId: string;
  resourceType: ResourceType;
  user: CollaborationUser;
};

export type CollaborationFocus = {
  kind: "calendar-event" | "kanban-card" | "note" | "resource";
  id: string;
} | null;

export type CollaborationCursor = {
  x: number;
  y: number;
};

export type CollaborationConnection = {
  connectionId: string;
  clientId: string;
  focus: CollaborationFocus;
  joinedAt: number;
  permission: SharePermission;
  user: CollaborationUser;
};

export type CollaborationChange = {
  action: "delete" | "upsert";
  data: unknown;
  entity:
    | "calendar"
    | "calendar-category"
    | "calendar-event"
    | "kanban-project"
    | "note"
    | "note-category"
    | "resource";
};

export type CollaborationBroadcast = {
  type: "resource.changed";
  actorClientId: string | null;
  change: CollaborationChange;
  resourceId: string;
  resourceType: ResourceType;
  sentAt: number;
};

export type CollaborationCursorBroadcast = {
  type: "cursor.update";
  connectionId: string;
  cursor: CollaborationCursor | null;
  sentAt: number;
};

export const collaborationRoomName = (
  resourceType: ResourceType,
  resourceId: string,
) => `${resourceType}:${resourceId}`;
