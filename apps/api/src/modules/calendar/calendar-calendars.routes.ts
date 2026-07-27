import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import { publishCollaborationChange } from "../collaboration/collaboration.publish.js";
import type { RouteDependencies } from "../route-dependencies.js";
import {
  canWriteResource,
  deleteResourceSharing,
  getResourceAccess,
  serializeResourceAccess,
} from "../sharing/sharing.service.js";
import {
  createLifeverCalendarSchema,
  updateLifeverCalendarSchema,
} from "./calendar-calendars.schema.js";

const calendarSelect = {
  id: true,
  name: true,
  color: true,
  position: true,
  visible: true,
  createdAt: true,
} as const;

const ensureDefaultCalendar = async (
  prisma: RouteDependencies["prisma"],
  userId: string,
) => {
  const existing = await prisma.lifeverCalendar.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.lifeverCalendar.upsert({
    where: { id: `default-${userId}` },
    create: {
      id: `default-${userId}`,
      name: "Personal",
      color: "#3B82F6",
      userId,
    },
    update: {},
  });
};

export const createCalendarCalendarsRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const routes = new Hono<AuthenticatedEnv>();
  routes.use("*", requireSession);

  routes.get("/", async (context) => {
    const userId = context.get("session").user.id;
    await ensureDefaultCalendar(prisma, userId);
    const shares = await prisma.resourceShare.findMany({
      where: {
        resourceType: "calendar",
        OR: [{ userId }, { ownerId: userId }],
      },
      select: {
        id: true,
        ownerId: true,
        resourceId: true,
        permission: true,
        userId: true,
        visible: true,
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
    const collaboratorShares = shares.filter(
      (share) => share.userId === userId,
    );
    const shareByCalendar = new Map(
      collaboratorShares.map((share) => [share.resourceId, share]),
    );
    const sharedOwnedCalendarIds = new Set(
      shares
        .filter((share) => share.ownerId === userId)
        .map((share) => share.resourceId),
    );
    const calendars = await prisma.lifeverCalendar.findMany({
      where: {
        OR: [
          { userId },
          {
            id: {
              in: collaboratorShares.map((share) => share.resourceId),
            },
          },
        ],
      },
      select: {
        ...calendarSelect,
        userId: true,
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return context.json({
      calendars: calendars.map(({ userId: ownerId, user, ...calendar }) => {
        const own = ownerId === userId;
        const share = shareByCalendar.get(calendar.id);
        return {
          ...calendar,
          visible: own ? calendar.visible : share?.visible !== false,
          writable: own || share?.permission === "write",
          access: {
            role: own ? "owner" : "collaborator",
            permission:
              own || share?.permission === "write" ? "write" : "read",
            shareId: own ? null : share?.id ?? null,
            shared: own ? sharedOwnedCalendarIds.has(calendar.id) : true,
            owner: user,
          },
        };
      }),
    });
  });

  routes.post("/", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = createLifeverCalendarSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid calendar", issues: parsed.error.issues },
        400,
      );
    }

    const { defaultCategoryId, ...calendarData } = parsed.data;
    const [calendar, category] = await prisma.$transaction([
      prisma.lifeverCalendar.create({
        data: { ...calendarData, userId },
        select: calendarSelect,
      }),
      prisma.calendarCategory.create({
        data: {
          id: defaultCategoryId,
          name: "General",
          color: calendarData.color.toLowerCase(),
          position: 0,
          calendarId: calendarData.id,
          userId,
        },
        select: {
          id: true,
          name: true,
          color: true,
          position: true,
          calendarId: true,
          createdAt: true,
        },
      }),
    ]);
    return context.json({ calendar, category }, 201);
  });

  routes.patch("/:id", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updateLifeverCalendarSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid calendar", issues: parsed.error.issues },
        400,
      );
    }

    const access = await getResourceAccess(
      prisma,
      userId,
      "calendar",
      context.req.param("id"),
    );
    const existing = access
      ? await prisma.lifeverCalendar.findUnique({
          where: { id: context.req.param("id") },
          select: { id: true },
        })
      : null;
    if (!existing) return context.json({ error: "Calendar not found" }, 404);
    if (!canWriteResource(access)) {
      const { visible } = parsed.data;
      if (visible === undefined || Object.keys(parsed.data).length !== 1) {
        return context.json({ error: "You only have read access." }, 403);
      }
    }

    if (access!.role === "collaborator" && parsed.data.visible !== undefined) {
      await prisma.resourceShare.update({
        where: { id: access!.shareId! },
        data: { visible: parsed.data.visible },
      });
    }
    const { visible: requestedVisibility, ...sharedPatch } = parsed.data;
    const ownerPatch =
      access!.role === "owner"
        ? parsed.data
        : sharedPatch;

    const calendar =
      Object.keys(ownerPatch).length > 0
        ? await prisma.lifeverCalendar.update({
            where: { id: existing.id },
            data: ownerPatch,
            select: calendarSelect,
          })
        : await prisma.lifeverCalendar.findUniqueOrThrow({
            where: { id: existing.id },
            select: calendarSelect,
          });
    if (Object.keys(sharedPatch).length > 0) {
      publishCollaborationChange(context, {
        resourceType: "calendar",
        resourceId: calendar.id,
        shared: access!.shared,
        change: {
          action: "upsert",
          entity: "calendar",
          data: {
            calendar: {
              id: calendar.id,
              name: calendar.name,
              color: calendar.color,
              position: calendar.position,
            },
          },
        },
      });
    }
    return context.json({
      calendar: {
        ...calendar,
        ...(access!.role === "collaborator" &&
        requestedVisibility !== undefined
          ? { visible: requestedVisibility }
          : {}),
        writable: canWriteResource(access),
        access: serializeResourceAccess(access!),
      },
    });
  });

  routes.delete("/:id", async (context) => {
    const userId = context.get("session").user.id;
    const calendars = await prisma.lifeverCalendar.findMany({
      where: { userId },
      select: { id: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    const target = calendars.find(
      (calendar) => calendar.id === context.req.param("id"),
    );
    const replacement = calendars.find(
      (calendar) => calendar.id !== target?.id,
    );
    if (!target) return context.json({ error: "Calendar not found" }, 404);
    if (!replacement) {
      return context.json({ error: "Keep at least one calendar." }, 400);
    }

    const replacementCategory =
      await prisma.calendarCategory.findFirst({
        where: { calendarId: replacement.id, userId },
        select: { id: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
    if (!replacementCategory) {
      return context.json(
        { error: "The replacement calendar needs a category." },
        409,
      );
    }

    const access = await getResourceAccess(
      prisma,
      userId,
      "calendar",
      target.id,
    );
    await prisma.$transaction([
      prisma.calendarEvent.updateMany({
        where: { userId, calendarId: target.id },
        data: {
          calendarId: replacement.id,
          categoryId: replacementCategory.id,
        },
      }),
      ...deleteResourceSharing(prisma, "calendar", target.id),
      prisma.lifeverCalendar.delete({ where: { id: target.id } }),
    ]);
    publishCollaborationChange(context, {
      resourceType: "calendar",
      resourceId: target.id,
      shared: access?.shared === true,
      change: {
        action: "delete",
        entity: "calendar",
        data: { calendarId: target.id },
      },
    });
    return context.json({ replacementCalendarId: replacement.id });
  });

  return routes;
};
