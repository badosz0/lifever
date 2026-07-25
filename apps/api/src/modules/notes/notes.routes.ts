import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import {
  createNoteCategorySchema,
  createNoteSchema,
  updateNoteCategorySchema,
  updateNoteSchema,
  updateNotesSettingsSchema,
} from "./notes.schema.js";

const defaultCategories = [
  { name: "Personal", color: "#f59e0b", position: 0 },
  { name: "Work", color: "#3b82f6", position: 1 },
  { name: "Ideas", color: "#8b5cf6", position: 2 },
] as const;

const noteSelect = {
  id: true,
  title: true,
  body: true,
  categoryId: true,
  pinned: true,
  createdAt: true,
  updatedAt: true,
} as const;

const categorySelect = {
  id: true,
  name: true,
  color: true,
} as const;

const settingsSelect = {
  sort: true,
  previewLines: true,
  defaultCategoryId: true,
  openInPreview: true,
  spellcheck: true,
} as const;

export const createNotesRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const notesRoutes = new Hono<AuthenticatedEnv>();

  notesRoutes.use("*", requireSession);

  async function ensureNotesConfiguration(userId: string) {
    let categories = await prisma.noteCategory.findMany({
      where: { userId },
      select: categorySelect,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    if (categories.length === 0) {
      await prisma.noteCategory.createMany({
        data: defaultCategories.map((category) => ({
          id: crypto.randomUUID(),
          ...category,
          userId,
        })),
      });
      categories = await prisma.noteCategory.findMany({
        where: { userId },
        select: categorySelect,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
    }

    const defaultCategoryId = categories[0]!.id;
    const settings = await prisma.notesSettings.upsert({
      where: { userId },
      create: { userId, defaultCategoryId },
      update: {},
      select: settingsSelect,
    });

    if (
      !categories.some((category) => category.id === settings.defaultCategoryId)
    ) {
      return {
        categories,
        settings: await prisma.notesSettings.update({
          where: { userId },
          data: { defaultCategoryId },
          select: settingsSelect,
        }),
      };
    }

    return { categories, settings };
  }

  notesRoutes.get("/", async (context) => {
    const userId = context.get("session").user.id;
    const [{ categories, settings }, notes] = await Promise.all([
      ensureNotesConfiguration(userId),
      prisma.note.findMany({
        where: { userId },
        select: noteSelect,
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    return context.json({ notes, categories, settings });
  });

  notesRoutes.post("/categories", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = createNoteCategorySchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { error: "Invalid note category", issues: parsed.error.issues },
        400,
      );
    }

    const lastCategory = await prisma.noteCategory.findFirst({
      where: { userId },
      select: { position: true },
      orderBy: { position: "desc" },
    });
    const category = await prisma.noteCategory.create({
      data: {
        ...parsed.data,
        position: (lastCategory?.position ?? -1) + 1,
        userId,
      },
      select: categorySelect,
    });
    return context.json({ category }, 201);
  });

  notesRoutes.patch("/categories/:id", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updateNoteCategorySchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { error: "Invalid note category", issues: parsed.error.issues },
        400,
      );
    }
    const existing = await prisma.noteCategory.findFirst({
      where: { id: context.req.param("id"), userId },
      select: { id: true },
    });
    if (!existing)
      return context.json({ error: "Note category not found" }, 404);

    const category = await prisma.noteCategory.update({
      where: { id: existing.id },
      data: parsed.data,
      select: categorySelect,
    });
    return context.json({ category });
  });

  notesRoutes.delete("/categories/:id", async (context) => {
    const userId = context.get("session").user.id;
    const categories = await prisma.noteCategory.findMany({
      where: { userId },
      select: { id: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    const targetId = context.req.param("id");
    if (!categories.some((category) => category.id === targetId)) {
      return context.json({ error: "Note category not found" }, 404);
    }
    if (categories.length <= 1) {
      return context.json({ error: "Keep at least one note category." }, 400);
    }

    const replacementId = categories.find(
      (category) => category.id !== targetId,
    )!.id;
    await prisma.$transaction([
      prisma.note.updateMany({
        where: { userId, categoryId: targetId },
        data: { categoryId: replacementId },
      }),
      prisma.notesSettings.updateMany({
        where: { userId, defaultCategoryId: targetId },
        data: { defaultCategoryId: replacementId },
      }),
      prisma.noteCategory.delete({ where: { id: targetId } }),
    ]);

    return context.json({ replacementCategoryId: replacementId });
  });

  notesRoutes.patch("/settings", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updateNotesSettingsSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid notes settings", issues: parsed.error.issues },
        400,
      );
    }

    const { categories } = await ensureNotesConfiguration(userId);
    if (
      parsed.data.defaultCategoryId &&
      !categories.some(
        (category) => category.id === parsed.data.defaultCategoryId,
      )
    ) {
      return context.json({ error: "Note category not found" }, 400);
    }

    const settings = await prisma.notesSettings.update({
      where: { userId },
      data: parsed.data,
      select: settingsSelect,
    });
    return context.json({ settings });
  });

  notesRoutes.post("/", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = createNoteSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { error: "Invalid note", issues: parsed.error.issues },
        400,
      );
    }
    const category = await prisma.noteCategory.findFirst({
      where: { id: parsed.data.categoryId, userId },
      select: { id: true },
    });
    if (!category)
      return context.json({ error: "Note category not found" }, 400);

    const note = await prisma.note.create({
      data: { ...parsed.data, userId },
      select: noteSelect,
    });
    return context.json({ note }, 201);
  });

  notesRoutes.patch("/:id", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updateNoteSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { error: "Invalid note", issues: parsed.error.issues },
        400,
      );
    }
    const existing = await prisma.note.findFirst({
      where: { id: context.req.param("id"), userId },
      select: { id: true },
    });
    if (!existing) return context.json({ error: "Note not found" }, 404);

    if (parsed.data.categoryId) {
      const category = await prisma.noteCategory.findFirst({
        where: { id: parsed.data.categoryId, userId },
        select: { id: true },
      });
      if (!category)
        return context.json({ error: "Note category not found" }, 400);
    }

    const note = await prisma.note.update({
      where: { id: existing.id },
      data: parsed.data,
      select: noteSelect,
    });
    return context.json({ note });
  });

  notesRoutes.delete("/:id", async (context) => {
    const userId = context.get("session").user.id;
    const result = await prisma.note.deleteMany({
      where: { id: context.req.param("id"), userId },
    });
    if (result.count === 0)
      return context.json({ error: "Note not found" }, 404);
    return context.body(null, 204);
  });

  return notesRoutes;
};
