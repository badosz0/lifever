import { Hono } from "hono";

import { prisma } from "../../db/client.js";
import { getSession } from "../auth/session.js";
import {
  createReminderSchema,
  updateReminderSchema,
} from "./reminders.schema.js";

type RemindersEnv = {
  Variables: {
    session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  };
};

export const remindersRoutes = new Hono<RemindersEnv>();

const reminderSelect = {
  id: true,
  title: true,
  notes: true,
  dueAt: true,
  completedAt: true,
  important: true,
  createdAt: true,
} as const;

remindersRoutes.use("*", async (context, next) => {
  const session = await getSession(context);

  if (!session) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  context.set("session", session);
  await next();
});

remindersRoutes.get("/", async (context) => {
  const session = context.get("session");
  const reminders = await prisma.reminder.findMany({
    where: { userId: session.user.id },
    select: reminderSelect,
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { position: "asc" }],
  });

  return context.json({ reminders });
});

remindersRoutes.post("/", async (context) => {
  const session = context.get("session");
  const parsed = createReminderSchema.safeParse(await context.req.json());

  if (!parsed.success) {
    return context.json({ error: "Invalid reminder", issues: parsed.error.issues }, 400);
  }

  if (parsed.data.listId) {
    const list = await prisma.reminderList.findFirst({
      where: { id: parsed.data.listId, userId: session.user.id },
      select: { id: true },
    });

    if (!list) {
      return context.json({ error: "List not found" }, 404);
    }
  }

  const reminder = await prisma.reminder.create({
    data: {
      ...parsed.data,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      userId: session.user.id,
    },
    select: reminderSelect,
  });

  return context.json({ reminder }, 201);
});

remindersRoutes.patch("/:id", async (context) => {
  const session = context.get("session");
  const existing = await prisma.reminder.findFirst({
    where: { id: context.req.param("id"), userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return context.json({ error: "Reminder not found" }, 404);
  }

  const parsed = updateReminderSchema.safeParse(await context.req.json());
  if (!parsed.success) {
    return context.json({ error: "Invalid reminder", issues: parsed.error.issues }, 400);
  }

  const { completed, dueAt, ...data } = parsed.data;
  const reminder = await prisma.reminder.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
      ...(completed !== undefined
        ? { completedAt: completed ? new Date() : null }
        : {}),
    },
    select: reminderSelect,
  });

  return context.json({ reminder });
});

remindersRoutes.delete("/completed", async (context) => {
  const session = context.get("session");
  const result = await prisma.reminder.deleteMany({
    where: {
      userId: session.user.id,
      completedAt: { not: null },
    },
  });

  return context.json({ deleted: result.count });
});

remindersRoutes.delete("/:id", async (context) => {
  const session = context.get("session");
  const result = await prisma.reminder.deleteMany({
    where: { id: context.req.param("id"), userId: session.user.id },
  });

  if (result.count === 0) {
    return context.json({ error: "Reminder not found" }, 404);
  }

  return context.body(null, 204);
});
