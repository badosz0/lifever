import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import { publishCollaborationChange } from "../collaboration/collaboration.publish.js";
import type { RouteDependencies } from "../route-dependencies.js";
import {
  canWriteResource,
  getResourceAccess,
} from "../sharing/sharing.service.js";
import {
  createCalendarCategorySchema,
  updateCalendarCategorySchema,
} from "./calendar-categories.schema.js";

const defaultCategories = [
  { name: "Work", color: "#3b82f6", position: 0 },
  { name: "Focus", color: "#8b5cf6", position: 1 },
  { name: "Personal", color: "#f97316", position: 2 },
  { name: "Health", color: "#10b981", position: 3 },
  { name: "Planning", color: "#ec4899", position: 4 },
  { name: "Important", color: "#ef4444", position: 5 },
] as const;

const calendarCategorySelect = {
  id: true,
  name: true,
  color: true,
  position: true,
  calendarId: true,
  createdAt: true,
} as const;

export const createCalendarCategoriesRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const calendarCategoriesRoutes = new Hono<AuthenticatedEnv>();

  calendarCategoriesRoutes.use("*", requireSession);

  calendarCategoriesRoutes.get("/", async (context) => {
    const session = context.get("session");
    let calendars = await prisma.lifeverCalendar.findMany({
      where: { userId: session.user.id },
      select: { id: true, position: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    if (calendars.length === 0) {
      const calendar = await prisma.lifeverCalendar.upsert({
        where: { id: `default-${session.user.id}` },
        create: {
          id: `default-${session.user.id}`,
          name: "Personal",
          color: "#3B82F6",
          userId: session.user.id,
        },
        update: {},
        select: { id: true, position: true },
      });
      calendars = [calendar];
    }
    const sharedCalendarIds = (
      await prisma.resourceShare.findMany({
        where: {
          userId: session.user.id,
          resourceType: "calendar",
        },
        select: { resourceId: true },
      })
    ).map((share) => share.resourceId);
    const accessibleCalendarIds = [
      ...calendars.map((calendar) => calendar.id),
      ...sharedCalendarIds,
    ];
    let categories = await prisma.calendarCategory.findMany({
      where: {
        calendarId: { in: accessibleCalendarIds },
      },
      select: calendarCategorySelect,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    const categoryCalendarIds = new Set(
      categories.map((category) => category.calendarId),
    );
    const missingCalendars = calendars.filter(
      (calendar) => !categoryCalendarIds.has(calendar.id),
    );
    if (missingCalendars.length > 0) {
      await prisma.calendarCategory.createMany({
        data: missingCalendars.flatMap((calendar) =>
          categories.length === 0 && calendar === calendars[0]
            ? defaultCategories.map((category) => ({
                id: crypto.randomUUID(),
                ...category,
                calendarId: calendar.id,
                userId: session.user.id,
              }))
            : [
                {
                  id: crypto.randomUUID(),
                  name: "General",
                  color: "#3b82f6",
                  position: 0,
                  calendarId: calendar.id,
                  userId: session.user.id,
                },
              ],
        ),
      });
      categories = await prisma.calendarCategory.findMany({
        where: {
          calendarId: { in: accessibleCalendarIds },
        },
        select: calendarCategorySelect,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
    }

    return context.json({ categories });
  });

  calendarCategoriesRoutes.post("/", async (context) => {
    const session = context.get("session");
    const parsed = createCalendarCategorySchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid calendar category", issues: parsed.error.issues },
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

    const category = await prisma.calendarCategory.create({
      data: { ...parsed.data, userId: access.resource.ownerId },
      select: calendarCategorySelect,
    });
    publishCollaborationChange(context, {
      resourceType: "calendar",
      resourceId: category.calendarId,
      shared: access.shared,
      change: {
        action: "upsert",
        entity: "calendar-category",
        data: { category },
      },
    });
    return context.json({ category }, 201);
  });

  calendarCategoriesRoutes.patch("/:id", async (context) => {
    const session = context.get("session");
    const parsed = updateCalendarCategorySchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid calendar category", issues: parsed.error.issues },
        400,
      );
    }

    const existing = await prisma.calendarCategory.findUnique({
      where: { id: context.req.param("id") },
      select: { id: true, calendarId: true },
    });
    if (!existing)
      return context.json({ error: "Calendar category not found" }, 404);
    const access = await getResourceAccess(
      prisma,
      session.user.id,
      "calendar",
      existing.calendarId,
    );
    if (!canWriteResource(access)) {
      return context.json({ error: "You only have read access." }, 403);
    }

    const category = await prisma.calendarCategory.update({
      where: { id: existing.id },
      data: parsed.data,
      select: calendarCategorySelect,
    });
    publishCollaborationChange(context, {
      resourceType: "calendar",
      resourceId: category.calendarId,
      shared: access!.shared,
      change: {
        action: "upsert",
        entity: "calendar-category",
        data: { category },
      },
    });
    return context.json({ category });
  });

  calendarCategoriesRoutes.delete("/:id", async (context) => {
    const session = context.get("session");
    const target = await prisma.calendarCategory.findUnique({
      where: { id: context.req.param("id") },
      select: { id: true, calendarId: true },
    });
    if (!target)
      return context.json({ error: "Calendar category not found" }, 404);
    const access = await getResourceAccess(
      prisma,
      session.user.id,
      "calendar",
      target.calendarId,
    );
    if (!canWriteResource(access)) {
      return context.json({ error: "You only have read access." }, 403);
    }
    const categories = await prisma.calendarCategory.findMany({
      where: { calendarId: target.calendarId },
      select: { id: true, calendarId: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    const siblingCategories = categories.filter(
      (category) => category.calendarId === target.calendarId,
    );
    if (siblingCategories.length === 1) {
      return context.json(
        { error: "Keep at least one calendar category." },
        400,
      );
    }

    const replacement = siblingCategories.find(
      (category) => category.id !== target.id,
    )!;
    await prisma.$transaction([
      prisma.calendarEvent.updateMany({
        where: { categoryId: target.id },
        data: { categoryId: replacement.id },
      }),
      prisma.calendarCategory.delete({ where: { id: target.id } }),
    ]);
    publishCollaborationChange(context, {
      resourceType: "calendar",
      resourceId: target.calendarId,
      shared: access!.shared,
      change: {
        action: "delete",
        entity: "calendar-category",
        data: {
          categoryId: target.id,
          replacementCategoryId: replacement.id,
        },
      },
    });

    return context.json({ replacementCategoryId: replacement.id });
  });

  return calendarCategoriesRoutes;
};
