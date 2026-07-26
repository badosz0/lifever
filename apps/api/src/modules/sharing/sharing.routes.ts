import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import {
  createResourceInviteSchema,
  resourceParamsSchema,
  updateResourceShareSchema,
} from "./sharing.schema.js";
import {
  getResourceAccess,
  getResourceIdentity,
  serializeResourceAccess,
} from "./sharing.service.js";

const personSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

export const createSharingRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const routes = new Hono<AuthenticatedEnv>();
  routes.use("*", requireSession);

  routes.get("/invites", async (context) => {
    const session = context.get("session");
    const invites = await prisma.resourceInvite.findMany({
      where: {
        email: session.user.email.toLowerCase(),
        status: "pending",
      },
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        resourceName: true,
        permission: true,
        createdAt: true,
        owner: { select: personSelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return context.json({ invites });
  });

  routes.post("/invites", async (context) => {
    const session = context.get("session");
    const parsed = createResourceInviteSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid invitation", issues: parsed.error.issues },
        400,
      );
    }

    const resource = await getResourceIdentity(
      prisma,
      parsed.data.resourceType,
      parsed.data.resourceId,
    );
    if (!resource) return context.json({ error: "Item not found" }, 404);
    if (resource.ownerId !== session.user.id) {
      return context.json(
        { error: "Only the owner can invite collaborators." },
        403,
      );
    }
    if (parsed.data.email === session.user.email.toLowerCase()) {
      return context.json({ error: "You already own this item." }, 400);
    }

    const recipient = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (recipient) {
      const existingShare = await prisma.resourceShare.findUnique({
        where: {
          resourceType_resourceId_userId: {
            resourceType: parsed.data.resourceType,
            resourceId: parsed.data.resourceId,
            userId: recipient.id,
          },
        },
        select: { id: true },
      });
      if (existingShare) {
        const share = await prisma.resourceShare.update({
          where: { id: existingShare.id },
          data: { permission: parsed.data.permission },
          select: { id: true, permission: true },
        });
        return context.json({ share, alreadyMember: true });
      }
    }

    const invite = await prisma.resourceInvite.upsert({
      where: {
        resourceType_resourceId_email: {
          resourceType: parsed.data.resourceType,
          resourceId: parsed.data.resourceId,
          email: parsed.data.email,
        },
      },
      create: {
        resourceType: parsed.data.resourceType,
        resourceId: parsed.data.resourceId,
        resourceName: resource.name,
        email: parsed.data.email,
        permission: parsed.data.permission,
        ownerId: session.user.id,
        recipientId: recipient?.id,
      },
      update: {
        resourceName: resource.name,
        permission: parsed.data.permission,
        status: "pending",
        recipientId: recipient?.id,
      },
      select: {
        id: true,
        email: true,
        permission: true,
        status: true,
        createdAt: true,
      },
    });
    return context.json({ invite }, 201);
  });

  routes.post("/invites/:id/accept", async (context) => {
    const session = context.get("session");
    const invite = await prisma.resourceInvite.findFirst({
      where: {
        id: context.req.param("id"),
        email: session.user.email.toLowerCase(),
        status: "pending",
      },
    });
    if (!invite) return context.json({ error: "Invitation not found" }, 404);
    const parsedType = resourceParamsSchema.shape.resourceType.safeParse(
      invite.resourceType,
    );
    const parsedPermission =
      invite.permission === "write" ? "write" : "read";
    if (!parsedType.success) {
      return context.json({ error: "Invitation is no longer valid" }, 410);
    }
    const resource = await getResourceIdentity(
      prisma,
      parsedType.data,
      invite.resourceId,
    );
    if (!resource || resource.ownerId !== invite.ownerId) {
      await prisma.resourceInvite.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });
      return context.json({ error: "This item is no longer available." }, 410);
    }

    const [share] = await prisma.$transaction([
      prisma.resourceShare.upsert({
        where: {
          resourceType_resourceId_userId: {
            resourceType: invite.resourceType,
            resourceId: invite.resourceId,
            userId: session.user.id,
          },
        },
        create: {
          resourceType: invite.resourceType,
          resourceId: invite.resourceId,
          permission: parsedPermission,
          ownerId: invite.ownerId,
          userId: session.user.id,
        },
        update: { permission: parsedPermission },
        select: { id: true, permission: true },
      }),
      prisma.resourceInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", recipientId: session.user.id },
      }),
    ]);
    return context.json({ share });
  });

  routes.post("/invites/:id/reject", async (context) => {
    const session = context.get("session");
    const result = await prisma.resourceInvite.updateMany({
      where: {
        id: context.req.param("id"),
        email: session.user.email.toLowerCase(),
        status: "pending",
      },
      data: { status: "rejected", recipientId: session.user.id },
    });
    if (result.count === 0) {
      return context.json({ error: "Invitation not found" }, 404);
    }
    return context.body(null, 204);
  });

  routes.get("/resources/:resourceType/:resourceId", async (context) => {
    const session = context.get("session");
    const params = resourceParamsSchema.safeParse(context.req.param());
    if (!params.success) return context.json({ error: "Invalid item" }, 400);
    const access = await getResourceAccess(
      prisma,
      session.user.id,
      params.data.resourceType,
      params.data.resourceId,
    );
    if (!access) return context.json({ error: "Item not found" }, 404);

    const [shares, invites] = await Promise.all([
      prisma.resourceShare.findMany({
        where: {
          resourceType: params.data.resourceType,
          resourceId: params.data.resourceId,
        },
        select: {
          id: true,
          permission: true,
          createdAt: true,
          user: { select: personSelect },
        },
        orderBy: { createdAt: "asc" },
      }),
      access.role === "owner"
        ? prisma.resourceInvite.findMany({
            where: {
              resourceType: params.data.resourceType,
              resourceId: params.data.resourceId,
              status: "pending",
            },
            select: {
              id: true,
              email: true,
              permission: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
    ]);
    return context.json({
      resource: {
        id: access.resource.id,
        name: access.resource.name,
        access: serializeResourceAccess(access),
      },
      members: [
        {
          id: `owner:${access.resource.owner.id}`,
          permission: "write",
          role: "owner",
          user: access.resource.owner,
        },
        ...shares.map((share) => ({ ...share, role: "collaborator" })),
      ],
      invites,
    });
  });

  routes.patch("/shares/:id", async (context) => {
    const session = context.get("session");
    const parsed = updateResourceShareSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json({ error: "Invalid permission" }, 400);
    }
    const share = await prisma.resourceShare.findUnique({
      where: { id: context.req.param("id") },
      select: { id: true, ownerId: true },
    });
    if (!share) return context.json({ error: "Collaborator not found" }, 404);
    if (share.ownerId !== session.user.id) {
      return context.json({ error: "Only the owner can change access." }, 403);
    }
    const updated = await prisma.resourceShare.update({
      where: { id: share.id },
      data: parsed.data,
      select: { id: true, permission: true },
    });
    return context.json({ share: updated });
  });

  routes.delete("/shares/:id", async (context) => {
    const session = context.get("session");
    const share = await prisma.resourceShare.findUnique({
      where: { id: context.req.param("id") },
      select: { id: true, ownerId: true, userId: true },
    });
    if (!share) return context.json({ error: "Collaborator not found" }, 404);
    if (share.ownerId !== session.user.id && share.userId !== session.user.id) {
      return context.json({ error: "You cannot remove this access." }, 403);
    }
    await prisma.resourceShare.delete({ where: { id: share.id } });
    return context.body(null, 204);
  });

  routes.delete("/invites/:id", async (context) => {
    const session = context.get("session");
    const result = await prisma.resourceInvite.deleteMany({
      where: { id: context.req.param("id"), ownerId: session.user.id },
    });
    if (result.count === 0) {
      return context.json({ error: "Invitation not found" }, 404);
    }
    return context.body(null, 204);
  });

  return routes;
};
