import type {
  SharePermission,
  SharedPerson,
  SharedResourceType,
} from "@/features/sharing/model/types";

export type CollaborationFocus = {
  kind: "calendar-event" | "kanban-card" | "note" | "resource";
  id: string;
} | null;

export type CollaborationCursorPosition = {
  x: number;
  y: number;
};

export type CollaborationCursor = CollaborationCursorPosition & {
  updatedAt: number;
};

export type CollaborationPeer = {
  connectionId: string;
  clientId: string;
  cursor?: CollaborationCursor;
  focus: CollaborationFocus;
  joinedAt: number;
  permission: SharePermission;
  user: SharedPerson;
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

export type CollaborationResourceMessage = {
  type: "resource.changed";
  actorClientId: string | null;
  change: CollaborationChange;
  resourceId: string;
  resourceType: SharedResourceType;
  sentAt: number;
};

export type CollaborationRoom = {
  focus: CollaborationFocus;
  resourceId: string;
  resourceType: SharedResourceType;
};
