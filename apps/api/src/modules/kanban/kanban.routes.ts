import { randomUUID } from "node:crypto";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import { updateKanbanWorkspaceSchema } from "./kanban.schema.js";

export const createKanbanRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const kanbanRoutes = new Hono<AuthenticatedEnv>();

  kanbanRoutes.use("*", requireSession);

  const createStarterState = () => {
    const now = new Date().toISOString();
    const projectId = randomUUID();
    const backlogId = randomUUID();
    const progressId = randomUUID();
    const doneId = randomUUID();
    return {
      projects: [
        {
          id: projectId,
          name: "My project",
          description: "",
          color: "#3b82f6",
          position: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      columns: [
        {
          id: backlogId,
          projectId,
          name: "Backlog",
          color: "#64748b",
          position: 0,
          wipLimit: null,
          isDone: false,
        },
        {
          id: progressId,
          projectId,
          name: "In progress",
          color: "#3b82f6",
          position: 1,
          wipLimit: 4,
          isDone: false,
        },
        {
          id: doneId,
          projectId,
          name: "Done",
          color: "#10b981",
          position: 2,
          wipLimit: null,
          isDone: true,
        },
      ],
      labels: [],
      cards: [],
    };
  };

  kanbanRoutes.get("/", async (context) => {
    const userId = context.get("session").user.id;
    const existing = await prisma.kanbanWorkspace.findUnique({
      where: { userId },
      select: { state: true, updatedAt: true },
    });
    if (existing) return context.json({ workspace: existing });

    const workspace = await prisma.kanbanWorkspace.create({
      data: { userId, state: createStarterState() },
      select: { state: true, updatedAt: true },
    });
    return context.json({ workspace });
  });

  kanbanRoutes.put("/", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updateKanbanWorkspaceSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Invalid kanban workspace", issues: parsed.error.issues },
        400,
      );
    }

    const existing = await prisma.kanbanWorkspace.findUnique({
      where: { userId },
      select: { updatedAt: true },
    });
    if (
      existing &&
      existing.updatedAt.toISOString() !== parsed.data.baseUpdatedAt
    ) {
      return context.json(
        {
          error: "This board changed on another device. Refresh and try again.",
        },
        409,
      );
    }

    const workspace = await prisma.kanbanWorkspace.upsert({
      where: { userId },
      create: { userId, state: parsed.data.state },
      update: { state: parsed.data.state },
      select: { state: true, updatedAt: true },
    });
    return context.json({ workspace });
  });

  return kanbanRoutes;
};
