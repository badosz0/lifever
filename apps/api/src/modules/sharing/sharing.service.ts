import type { AppPrisma } from "../../db/types.js";
import type {
  ResourceType,
  SharePermission,
} from "./sharing.schema.js";

const ownerSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

export type ResourceIdentity = {
  id: string;
  name: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type ResourceAccess = {
  role: "owner" | "collaborator";
  permission: SharePermission;
  shareId: string | null;
  shared: boolean;
  visible: boolean;
  resource: ResourceIdentity;
};

export const getResourceIdentity = async (
  prisma: AppPrisma,
  resourceType: ResourceType,
  resourceId: string,
): Promise<ResourceIdentity | null> => {
  if (resourceType === "note") {
    const note = await prisma.note.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        title: true,
        userId: true,
        user: { select: ownerSelect },
      },
    });
    return note
      ? {
          id: note.id,
          name: note.title.trim() || "Untitled note",
          ownerId: note.userId,
          owner: note.user,
        }
      : null;
  }

  if (resourceType === "calendar") {
    const calendar = await prisma.lifeverCalendar.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        name: true,
        userId: true,
        user: { select: ownerSelect },
      },
    });
    return calendar
      ? {
          id: calendar.id,
          name: calendar.name,
          ownerId: calendar.userId,
          owner: calendar.user,
        }
      : null;
  }

  const project = await prisma.kanbanProject.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      state: true,
      ownerId: true,
      owner: { select: ownerSelect },
    },
  });
  if (!project) return null;
  const state = project.state as {
    projects?: Array<{ id?: string; name?: string }>;
  };
  return {
    id: project.id,
    name:
      state.projects?.find((item) => item.id === project.id)?.name?.trim() ||
      "Untitled project",
    ownerId: project.ownerId,
    owner: project.owner,
  };
};

export const getResourceAccess = async (
  prisma: AppPrisma,
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
): Promise<ResourceAccess | null> => {
  const resource = await getResourceIdentity(
    prisma,
    resourceType,
    resourceId,
  );
  if (!resource) return null;
  if (resource.ownerId === userId) {
    const shared = await prisma.resourceShare.findFirst({
      where: { resourceType, resourceId },
      select: { id: true },
    });
    return {
      role: "owner",
      permission: "write",
      shareId: null,
      shared: Boolean(shared),
      visible: true,
      resource,
    };
  }

  const share = await prisma.resourceShare.findUnique({
    where: {
      resourceType_resourceId_userId: {
        resourceType,
        resourceId,
        userId,
      },
    },
    select: { id: true, permission: true, visible: true },
  });
  if (!share || (share.permission !== "read" && share.permission !== "write")) {
    return null;
  }
  return {
    role: "collaborator",
    permission: share.permission,
    shareId: share.id,
    shared: true,
    visible: share.visible,
    resource,
  };
};

export const canWriteResource = (access: ResourceAccess | null) =>
  access?.role === "owner" || access?.permission === "write";

export const serializeResourceAccess = (access: ResourceAccess) => ({
  role: access.role,
  permission: access.permission,
  shareId: access.shareId,
  shared: access.shared,
  owner: access.resource.owner,
});

export const deleteResourceSharing = (
  prisma: AppPrisma,
  resourceType: ResourceType,
  resourceId: string,
) => [
  prisma.resourceShare.deleteMany({
    where: { resourceType, resourceId },
  }),
  prisma.resourceInvite.deleteMany({
    where: { resourceType, resourceId },
  }),
];
