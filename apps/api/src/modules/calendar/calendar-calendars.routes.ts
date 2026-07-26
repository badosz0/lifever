import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
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
    const calendars = await prisma.lifeverCalendar.findMany({
      where: { userId },
      select: calendarSelect,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return context.json({ calendars });
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

    const existing = await prisma.lifeverCalendar.findFirst({
      where: { id: context.req.param("id"), userId },
      select: { id: true },
    });
    if (!existing) return context.json({ error: "Calendar not found" }, 404);

    const calendar = await prisma.lifeverCalendar.update({
      where: { id: existing.id },
      data: parsed.data,
      select: calendarSelect,
    });
    return context.json({ calendar });
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

    await prisma.$transaction([
      prisma.calendarEvent.updateMany({
        where: { userId, calendarId: target.id },
        data: {
          calendarId: replacement.id,
          categoryId: replacementCategory.id,
        },
      }),
      prisma.lifeverCalendar.delete({ where: { id: target.id } }),
    ]);
    return context.json({ replacementCalendarId: replacement.id });
  });

  return routes;
};
