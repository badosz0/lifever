import { z } from "zod";

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const idSchema = z.string().min(1).max(100);
const isoDateSchema = z.string().datetime();

const projectSchema = z.object({
  id: idSchema,
  name: z.string().max(120),
  description: z.string().max(5_000),
  color: colorSchema,
  position: z.number().finite(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const columnSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  name: z.string().max(80),
  color: colorSchema,
  position: z.number().finite(),
  wipLimit: z.number().int().positive().nullable(),
  isDone: z.boolean(),
});

const labelSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  name: z.string().max(80),
  color: colorSchema,
  position: z.number().finite(),
});

const cardSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  columnId: idSchema,
  title: z.string().max(240),
  description: z.string().max(20_000),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]),
  dueDate: z.string().date().nullable(),
  labelIds: z.array(idSchema).max(100),
  position: z.number().finite(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const kanbanStateSchema = z
  .object({
    projects: z.array(projectSchema).min(1).max(100),
    columns: z.array(columnSchema).min(1).max(1_000),
    labels: z.array(labelSchema).max(5_000),
    cards: z.array(cardSchema).max(25_000),
  })
  .superRefine((state, context) => {
    const projectIds = new Set(state.projects.map((project) => project.id));
    const columnIds = new Set(state.columns.map((column) => column.id));
    const labelIds = new Set(state.labels.map((label) => label.id));

    for (const column of state.columns) {
      if (!projectIds.has(column.projectId)) {
        context.addIssue({
          code: "custom",
          message: "Column references an unknown project.",
        });
      }
    }
    for (const label of state.labels) {
      if (!projectIds.has(label.projectId)) {
        context.addIssue({
          code: "custom",
          message: "Label references an unknown project.",
        });
      }
    }
    for (const card of state.cards) {
      if (
        !projectIds.has(card.projectId) ||
        !columnIds.has(card.columnId) ||
        card.labelIds.some((id) => !labelIds.has(id))
      ) {
        context.addIssue({
          code: "custom",
          message: "Card references an unknown project property.",
        });
      }
    }
  });

export const updateKanbanWorkspaceSchema = z.object({
  state: kanbanStateSchema,
  baseUpdatedAt: z.string().datetime().optional(),
  baseProjectVersions: z.record(z.string(), z.string().datetime()).default({}),
  deletedProjectIds: z.array(idSchema).max(100).default([]),
});
