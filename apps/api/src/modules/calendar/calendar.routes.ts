import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
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
  } as const;

  calendarRoutes.use("*", requireSession);

  calendarRoutes.get("/", async (context) => {
    const session = context.get("session");
    const events = await prisma.calendarEvent.findMany({
      where: { userId: session.user.id },
      select: calendarEventSelect,
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    });

    return context.json({ events });
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

    const category = await prisma.calendarCategory.findFirst({
      where: {
        id: parsed.data.categoryId,
        calendarId: parsed.data.calendarId,
        userId: session.user.id,
      },
      select: { id: true },
    });
    if (!category) {
      return context.json({ error: "Calendar category not found" }, 400);
    }
    const calendar = await prisma.lifeverCalendar.findFirst({
      where: { id: parsed.data.calendarId, userId: session.user.id },
      select: { id: true },
    });
    if (!calendar) {
      return context.json({ error: "Calendar not found" }, 400);
    }

    const event = await prisma.calendarEvent.create({
      data: {
        ...parsed.data,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        userId: session.user.id,
      },
      select: calendarEventSelect,
    });

    return context.json({ event }, 201);
  });

  calendarRoutes.patch("/:id", async (context) => {
    const session = context.get("session");
    const existing = await prisma.calendarEvent.findFirst({
      where: { id: context.req.param("id"), userId: session.user.id },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        calendarId: true,
        categoryId: true,
      },
    });
    if (!existing)
      return context.json({ error: "Calendar event not found" }, 404);

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
    if (parsed.data.calendarId || parsed.data.categoryId) {
      const [calendar, category] = await Promise.all([
        prisma.lifeverCalendar.findFirst({
          where: { id: nextCalendarId, userId: session.user.id },
          select: { id: true },
        }),
        prisma.calendarCategory.findFirst({
          where: {
            id: nextCategoryId,
            calendarId: nextCalendarId,
            userId: session.user.id,
          },
          select: { id: true },
        }),
      ]);
      if (!calendar) {
        return context.json({ error: "Calendar not found" }, 400);
      }
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

    const event = await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        ...(parsed.data.startAt ? { startAt } : {}),
        ...(parsed.data.endAt ? { endAt } : {}),
      },
      select: calendarEventSelect,
    });

    return context.json({ event });
  });

  calendarRoutes.delete("/:id", async (context) => {
    const session = context.get("session");
    const result = await prisma.calendarEvent.deleteMany({
      where: { id: context.req.param("id"), userId: session.user.id },
    });
    if (result.count === 0) {
      return context.json({ error: "Calendar event not found" }, 404);
    }
    return context.body(null, 204);
  });

  return calendarRoutes;
};
