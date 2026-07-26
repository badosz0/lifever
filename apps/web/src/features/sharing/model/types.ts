export type SharedResourceType = "note" | "kanbanProject" | "calendar";
export type SharePermission = "read" | "write";

export type SharedPerson = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type SharedResourceAccess = {
  role: "owner" | "collaborator";
  permission: SharePermission;
  shareId: string | null;
  owner: SharedPerson;
};

export type ResourceInvite = {
  id: string;
  resourceType: SharedResourceType;
  resourceId: string;
  resourceName: string;
  permission: SharePermission;
  createdAt: string;
  owner: SharedPerson;
};

export const SHARING_CHANGED_EVENT = "lifever:sharing-changed";
