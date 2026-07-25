import { randomUUID } from "node:crypto";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
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
    let categories = await prisma.calendarCategory.findMany({
      where: { userId: session.user.id },
      select: calendarCategorySelect,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    if (categories.length === 0) {
      await prisma.calendarCategory.createMany({
        data: defaultCategories.map((category) => ({
          id: randomUUID(),
          ...category,
          userId: session.user.id,
        })),
      });
      categories = await prisma.calendarCategory.findMany({
        where: { userId: session.user.id },
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

    const category = await prisma.calendarCategory.create({
      data: { ...parsed.data, userId: session.user.id },
      select: calendarCategorySelect,
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

    const existing = await prisma.calendarCategory.findFirst({
      where: { id: context.req.param("id"), userId: session.user.id },
      select: { id: true },
    });
    if (!existing)
      return context.json({ error: "Calendar category not found" }, 404);

    const category = await prisma.calendarCategory.update({
      where: { id: existing.id },
      data: parsed.data,
      select: calendarCategorySelect,
    });
    return context.json({ category });
  });

  calendarCategoriesRoutes.delete("/:id", async (context) => {
    const session = context.get("session");
    const categories = await prisma.calendarCategory.findMany({
      where: { userId: session.user.id },
      select: { id: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    const target = categories.find(
      (category) => category.id === context.req.param("id"),
    );
    if (!target)
      return context.json({ error: "Calendar category not found" }, 404);
    if (categories.length === 1) {
      return context.json(
        { error: "Keep at least one calendar category." },
        400,
      );
    }

    const replacement = categories.find(
      (category) => category.id !== target.id,
    )!;
    await prisma.$transaction([
      prisma.calendarEvent.updateMany({
        where: { userId: session.user.id, categoryId: target.id },
        data: { categoryId: replacement.id },
      }),
      prisma.calendarCategory.delete({ where: { id: target.id } }),
    ]);

    return context.json({ replacementCategoryId: replacement.id });
  });

  return calendarCategoriesRoutes;
};
