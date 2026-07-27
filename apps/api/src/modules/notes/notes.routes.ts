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
  userId: true,
  user: {
    select: { id: true, name: true, email: true, image: true },
  },
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
  const sharedNoteIdsForCategory = async (
    userId: string,
    categoryId: string,
  ) => {
    const notes = await prisma.note.findMany({
      where: { userId, categoryId },
      select: { id: true },
    });
    if (notes.length === 0) return [];
    const shares = await prisma.resourceShare.findMany({
      where: {
        resourceType: "note",
        resourceId: { in: notes.map((note) => note.id) },
      },
      select: { resourceId: true },
    });
    return [...new Set(shares.map((share) => share.resourceId))];
  };

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
    const [{ categories: ownCategories, settings }, shares] = await Promise.all([
      ensureNotesConfiguration(userId),
      prisma.resourceShare.findMany({
        where: {
          resourceType: "note",
          OR: [{ userId }, { ownerId: userId }],
        },
        select: {
          id: true,
          ownerId: true,
          resourceId: true,
          permission: true,
          userId: true,
        },
      }),
    ]);
    const collaboratorShares = shares.filter(
      (share) => share.userId === userId,
    );
    const shareByNote = new Map(
      collaboratorShares.map((share) => [share.resourceId, share]),
    );
    const sharedOwnedNoteIds = new Set(
      shares
        .filter((share) => share.ownerId === userId)
        .map((share) => share.resourceId),
    );
    const notes = await prisma.note.findMany({
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
      select: noteSelect,
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    const sharedCategoryIds = notes
      .filter((note) => note.userId !== userId)
      .map((note) => note.categoryId);
    const sharedCategories =
      sharedCategoryIds.length > 0
        ? await prisma.noteCategory.findMany({
            where: { id: { in: sharedCategoryIds } },
            select: categorySelect,
          })
        : [];
    const categoryMap = new Map<
      string,
      (typeof ownCategories)[number] & { owned: boolean }
    >([
      ...ownCategories.map((category) => [
        category.id,
        { ...category, owned: true },
      ] as const),
      ...sharedCategories.map((category) => [
        category.id,
        { ...category, owned: false },
      ] as const),
    ]);

    return context.json({
      notes: notes.map(({ userId: ownerId, user, ...note }) => {
        const own = ownerId === userId;
        const share = shareByNote.get(note.id);
        return {
          ...note,
          access: {
            role: own ? "owner" : "collaborator",
            permission:
              own || share?.permission === "write" ? "write" : "read",
            shareId: own ? null : share?.id ?? null,
            shared: own ? sharedOwnedNoteIds.has(note.id) : true,
            owner: user,
          },
        };
      }),
      categories: [...categoryMap.values()],
      settings,
    });
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
    const sharedNoteIds = await sharedNoteIdsForCategory(
      userId,
      category.id,
    );
    for (const noteId of sharedNoteIds) {
      publishCollaborationChange(context, {
        resourceType: "note",
        resourceId: noteId,
        shared: true,
        change: {
          action: "upsert",
          entity: "note-category",
          data: { category },
        },
      });
    }
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
    const sharedNoteIds = await sharedNoteIdsForCategory(userId, targetId);
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
    for (const noteId of sharedNoteIds) {
      publishCollaborationChange(context, {
        resourceType: "note",
        resourceId: noteId,
        shared: true,
        change: {
          action: "delete",
          entity: "note-category",
          data: {
            categoryId: targetId,
            replacementCategoryId: replacementId,
          },
        },
      });
    }

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
    const { userId: _ownerId, user, ...createdNote } = note;
    return context.json(
      {
        note: {
          ...createdNote,
          access: {
            role: "owner",
            permission: "write",
            shareId: null,
            shared: false,
            owner: user,
          },
        },
      },
      201,
    );
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
    const access = await getResourceAccess(
      prisma,
      userId,
      "note",
      context.req.param("id"),
    );
    const existing = access
      ? await prisma.note.findUnique({
          where: { id: context.req.param("id") },
          select: { id: true, userId: true, updatedAt: true },
        })
      : null;
    if (!existing) return context.json({ error: "Note not found" }, 404);
    if (!canWriteResource(access)) {
      return context.json({ error: "You only have read access." }, 403);
    }

    const updatedCategory = parsed.data.categoryId
      ? await prisma.noteCategory.findFirst({
          where: { id: parsed.data.categoryId, userId: existing.userId },
          select: categorySelect,
        })
      : null;
    if (parsed.data.categoryId && !updatedCategory) {
        return context.json({ error: "Note category not found" }, 400);
    }

    const { baseUpdatedAt, ...patch } = parsed.data;
    if (
      baseUpdatedAt &&
      existing.updatedAt.toISOString() !== baseUpdatedAt
    ) {
      const latest = await prisma.note.findUnique({
        where: { id: existing.id },
        select: noteSelect,
      });
      return context.json({ error: "Note changed", note: latest }, 409);
    }
    const note = await prisma.note.update({
      where: { id: existing.id },
      data: patch,
      select: noteSelect,
    });
    const { userId: _ownerId, user, ...updatedNote } = note;
    publishCollaborationChange(context, {
      resourceType: "note",
      resourceId: note.id,
      shared: access!.shared,
      change: {
        action: "upsert",
        entity: "note",
        data: {
          note: updatedNote,
          ...(updatedCategory ? { category: updatedCategory } : {}),
        },
      },
    });
    return context.json({
      note: {
        ...updatedNote,
        access: serializeResourceAccess(access!),
      },
    });
  });

  notesRoutes.delete("/:id", async (context) => {
    const userId = context.get("session").user.id;
    const note = await prisma.note.findFirst({
      where: { id: context.req.param("id"), userId },
      select: { id: true },
    });
    if (!note)
      return context.json({ error: "Note not found" }, 404);
    const access = await getResourceAccess(prisma, userId, "note", note.id);
    await prisma.$transaction([
      ...deleteResourceSharing(prisma, "note", note.id),
      prisma.note.delete({ where: { id: note.id } }),
    ]);
    publishCollaborationChange(context, {
      resourceType: "note",
      resourceId: note.id,
      shared: access?.shared === true,
      change: {
        action: "delete",
        entity: "note",
        data: { noteId: note.id },
      },
    });
    return context.body(null, 204);
  });

  return notesRoutes;
};
