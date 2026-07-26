import { Hono } from "hono";

import type { AppPrisma } from "../../db/types.js";
import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import { deleteResourceSharing } from "../sharing/sharing.service.js";
import {
  kanbanStateSchema,
  updateKanbanWorkspaceSchema,
} from "./kanban.schema.js";

type KanbanState = typeof kanbanStateSchema._output;

const createStarterState = (): KanbanState => {
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const backlogId = crypto.randomUUID();
  const progressId = crypto.randomUUID();
  const doneId = crypto.randomUUID();
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

const projectState = (state: KanbanState, projectId: string): KanbanState => ({
  projects: state.projects.filter((item) => item.id === projectId),
  columns: state.columns.filter((item) => item.projectId === projectId),
  labels: state.labels.filter((item) => item.projectId === projectId),
  cards: state.cards.filter((item) => item.projectId === projectId),
});

const combineProjectStates = (
  states: Array<{ state: KanbanState; owner: boolean }>,
): KanbanState => {
  const sorted = states.sort((left, right) => {
    if (left.owner !== right.owner) return left.owner ? -1 : 1;
    return (
      (left.state.projects[0]?.position ?? 0) -
      (right.state.projects[0]?.position ?? 0)
    );
  });
  return {
    projects: sorted.flatMap((item) => item.state.projects),
    columns: sorted.flatMap((item) => item.state.columns),
    labels: sorted.flatMap((item) => item.state.labels),
    cards: sorted.flatMap((item) => item.state.cards),
  };
};

const parseStoredState = (value: unknown) => {
  const parsed = kanbanStateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const ensureOwnedProjects = async (prisma: AppPrisma, userId: string) => {
  let projects = await prisma.kanbanProject.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (projects.length > 0) return;

  const legacy = await prisma.kanbanWorkspace.findUnique({
    where: { userId },
    select: { state: true },
  });
  const state = parseStoredState(legacy?.state) ?? createStarterState();
  await prisma.$transaction(
    state.projects.map((project) =>
      prisma.kanbanProject.upsert({
        where: { id: project.id },
        create: {
          id: project.id,
          ownerId: userId,
          state: projectState(state, project.id),
        },
        update: {},
      }),
    ),
  );
  projects = state.projects.map((project) => ({ id: project.id }));
};

const loadWorkspace = async (prisma: AppPrisma, userId: string) => {
  await ensureOwnedProjects(prisma, userId);
  const shares = await prisma.resourceShare.findMany({
    where: { userId, resourceType: "kanbanProject" },
    select: {
      id: true,
      resourceId: true,
      permission: true,
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
  const shareByProject = new Map(
    shares.map((share) => [share.resourceId, share]),
  );
  const projects = await prisma.kanbanProject.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { id: { in: shares.map((share) => share.resourceId) } },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      state: true,
      updatedAt: true,
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  const validProjects = projects.flatMap((project) => {
    const state = parseStoredState(project.state);
    return state ? [{ ...project, state }] : [];
  });
  const state = combineProjectStates(
    validProjects.map((project) => ({
      state: project.state,
      owner: project.ownerId === userId,
    })),
  );
  const projectVersions = Object.fromEntries(
    validProjects.map((project) => [
      project.id,
      project.updatedAt.toISOString(),
    ]),
  );
  const projectAccess = Object.fromEntries(
    validProjects.map((project) => {
      const own = project.ownerId === userId;
      const share = shareByProject.get(project.id);
      return [
        project.id,
        {
          role: own ? "owner" : "collaborator",
          permission: own
            ? "write"
            : share?.permission === "write"
              ? "write"
              : "read",
          shareId: own ? null : share?.id ?? null,
          owner: project.owner,
        },
      ];
    }),
  );
  const updatedAt = validProjects.reduce(
    (latest, project) =>
      project.updatedAt > latest ? project.updatedAt : latest,
    new Date(0),
  );
  return {
    workspace: {
      state,
      updatedAt: updatedAt.toISOString(),
      projectVersions,
      projectAccess,
    },
  };
};

export const createKanbanRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const routes = new Hono<AuthenticatedEnv>();
  routes.use("*", requireSession);

  routes.get("/", async (context) => {
    const userId = context.get("session").user.id;
    return context.json(await loadWorkspace(prisma, userId));
  });

  routes.put("/", async (context) => {
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

    await ensureOwnedProjects(prisma, userId);
    const incomingById = new Map(
      parsed.data.state.projects.map((project) => [
        project.id,
        projectState(parsed.data.state, project.id),
      ]),
    );
    const existing = await prisma.kanbanProject.findMany({
      where: { id: { in: [...incomingById.keys()] } },
      select: { id: true, ownerId: true, state: true, updatedAt: true },
    });
    const existingById = new Map(existing.map((project) => [project.id, project]));
    const shared = await prisma.resourceShare.findMany({
      where: {
        userId,
        resourceType: "kanbanProject",
        resourceId: { in: [...incomingById.keys()] },
      },
      select: { resourceId: true, permission: true },
    });
    const writableSharedIds = new Set(
      shared
        .filter((share) => share.permission === "write")
        .map((share) => share.resourceId),
    );

    for (const [id, incomingState] of incomingById) {
      const current = existingById.get(id);
      if (!current) continue;
      if (current.ownerId !== userId && !writableSharedIds.has(id)) {
        if (JSON.stringify(current.state) !== JSON.stringify(incomingState)) {
          return context.json(
            { error: "You only have read access to this project." },
            403,
          );
        }
        continue;
      }
      if (JSON.stringify(current.state) === JSON.stringify(incomingState)) {
        continue;
      }
      const baseVersion = parsed.data.baseProjectVersions[id];
      if (baseVersion && current.updatedAt.toISOString() !== baseVersion) {
        return context.json(
          {
            error: "This project changed while you were editing.",
            ...(await loadWorkspace(prisma, userId)),
          },
          409,
        );
      }
    }

    const operations = [];
    for (const [id, state] of incomingById) {
      const current = existingById.get(id);
      if (!current) {
        operations.push(
          prisma.kanbanProject.create({
            data: { id, ownerId: userId, state },
          }),
        );
      } else if (
        (current.ownerId === userId || writableSharedIds.has(id)) &&
        JSON.stringify(current.state) !== JSON.stringify(state)
      ) {
        operations.push(
          prisma.kanbanProject.update({
            where: { id },
            data: { state },
          }),
        );
      }
    }

    const ownedDeletes = parsed.data.deletedProjectIds.length
      ? await prisma.kanbanProject.findMany({
          where: {
            id: { in: parsed.data.deletedProjectIds },
            ownerId: userId,
          },
          select: { id: true },
        })
      : [];
    const [ownedProjectCount, newOwnedProjectCount] = await Promise.all([
      prisma.kanbanProject.count({ where: { ownerId: userId } }),
      Promise.resolve(
        [...incomingById.keys()].filter((id) => !existingById.has(id)).length,
      ),
    ]);
    if (
      ownedProjectCount + newOwnedProjectCount - ownedDeletes.length < 1
    ) {
      return context.json({ error: "Keep at least one project." }, 400);
    }
    for (const project of ownedDeletes) {
      operations.push(
        ...deleteResourceSharing(prisma, "kanbanProject", project.id),
        prisma.kanbanProject.delete({ where: { id: project.id } }),
      );
    }
    if (operations.length > 0) await prisma.$transaction(operations);
    return context.json(await loadWorkspace(prisma, userId));
  });

  return routes;
};
