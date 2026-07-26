import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import {
  canWriteResource,
  getResourceAccess,
} from "../sharing/sharing.service.js";
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
} from "./calendar.schema.js";

export const createCalendarRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const calendarRoutes = new Hono<AuthenticatedEnv>();

  const calendarEventSelect = {
    id: true,
    title: true,
    startAt: true,
    endAt: true,
    categoryId: true,
    calendarId: true,
    location: true,
    notes: true,
    color: true,
    alertsEnabled: true,
    allDay: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
  } as const;

  calendarRoutes.use("*", requireSession);

  calendarRoutes.get("/", async (context) => {
    const session = context.get("session");
    const shares = await prisma.resourceShare.findMany({
      where: { userId: session.user.id, resourceType: "calendar" },
      select: { resourceId: true, permission: true },
    });
    const shareByCalendar = new Map(
      shares.map((share) => [share.resourceId, share]),
    );
    const events = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { calendarId: { in: shares.map((share) => share.resourceId) } },
        ],
      },
      select: calendarEventSelect,
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    });

    return context.json({
      events: events.map(({ userId: ownerId, ...event }) => ({
        ...event,
        source: "lifever",
        readOnly:
          ownerId !== session.user.id &&
          shareByCalendar.get(event.calendarId)?.permission !== "write",
      })),
    });
  });

  calendarRoutes.post("/", async (context) => {
    const session = context.get("session");
    const parsed = createCalendarEventSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid calendar event", issues: parsed.error.issues },
        400,
      );
    }

    const access = await getResourceAccess(
      prisma,
      session.user.id,
      "calendar",
      parsed.data.calendarId,
    );
    if (!access) {
      return context.json({ error: "Calendar not found" }, 400);
    }
    if (!canWriteResource(access)) {
      return context.json({ error: "You only have read access." }, 403);
    }
    const category = await prisma.calendarCategory.findFirst({
      where: {
        id: parsed.data.categoryId,
        calendarId: parsed.data.calendarId,
        userId: access.resource.ownerId,
      },
      select: { id: true },
    });
    if (!category) {
      return context.json({ error: "Calendar category not found" }, 400);
    }
    const event = await prisma.calendarEvent.create({
      data: {
        ...parsed.data,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        userId: access.resource.ownerId,
      },
      select: calendarEventSelect,
    });

    return context.json({ event }, 201);
  });

  calendarRoutes.patch("/:id", async (context) => {
    const session = context.get("session");
    const existing = await prisma.calendarEvent.findUnique({
      where: { id: context.req.param("id") },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        calendarId: true,
        categoryId: true,
        updatedAt: true,
      },
    });
    if (!existing)
      return context.json({ error: "Calendar event not found" }, 404);
    const currentAccess = await getResourceAccess(
      prisma,
      session.user.id,
      "calendar",
      existing.calendarId,
    );
    if (!currentAccess) {
      return context.json({ error: "Calendar event not found" }, 404);
    }
    if (!canWriteResource(currentAccess)) {
      return context.json({ error: "You only have read access." }, 403);
    }

    const parsed = updateCalendarEventSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid calendar event", issues: parsed.error.issues },
        400,
      );
    }

    const nextCalendarId = parsed.data.calendarId ?? existing.calendarId;
    const nextCategoryId = parsed.data.categoryId ?? existing.categoryId;
    const nextAccess =
      nextCalendarId === existing.calendarId
        ? currentAccess
        : await getResourceAccess(
            prisma,
            session.user.id,
            "calendar",
            nextCalendarId,
          );
    if (!canWriteResource(nextAccess)) {
      return context.json({ error: "Choose a writable calendar." }, 403);
    }
    if (parsed.data.calendarId || parsed.data.categoryId) {
      const category = await prisma.calendarCategory.findFirst({
          where: {
            id: nextCategoryId,
            calendarId: nextCalendarId,
            userId: nextAccess!.resource.ownerId,
          },
          select: { id: true },
        });
      if (!category) {
        return context.json(
          { error: "Choose a category from this calendar." },
          400,
        );
      }
    }

    const startAt = parsed.data.startAt
      ? new Date(parsed.data.startAt)
      : existing.startAt;
    const endAt = parsed.data.endAt
      ? new Date(parsed.data.endAt)
      : existing.endAt;
    if (endAt.getTime() <= startAt.getTime()) {
      return context.json(
        { error: "The event must end after it starts." },
        400,
      );
    }

    const { baseUpdatedAt, ...patch } = parsed.data;
    if (
      baseUpdatedAt &&
      existing.updatedAt.toISOString() !== baseUpdatedAt
    ) {
      const latest = await prisma.calendarEvent.findUnique({
        where: { id: existing.id },
        select: calendarEventSelect,
      });
      return context.json({ error: "Event changed", event: latest }, 409);
    }
    const event = await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        ...patch,
        ...(patch.startAt ? { startAt } : {}),
        ...(patch.endAt ? { endAt } : {}),
        ...(nextCalendarId !== existing.calendarId
          ? { userId: nextAccess!.resource.ownerId }
          : {}),
      },
      select: calendarEventSelect,
    });

    return context.json({ event });
  });

  calendarRoutes.delete("/:id", async (context) => {
    const session = context.get("session");
    const event = await prisma.calendarEvent.findUnique({
      where: { id: context.req.param("id") },
      select: { id: true, calendarId: true },
    });
    if (!event) {
      return context.json({ error: "Calendar event not found" }, 404);
    }
    const access = await getResourceAccess(
      prisma,
      session.user.id,
      "calendar",
      event.calendarId,
    );
    if (!access) return context.json({ error: "Calendar event not found" }, 404);
    if (!canWriteResource(access)) {
      return context.json({ error: "You only have read access." }, 403);
    }
    await prisma.calendarEvent.delete({ where: { id: event.id } });
    return context.body(null, 204);
  });

  return calendarRoutes;
};
