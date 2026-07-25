import { z } from "zod";

const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.")
  .transform((value) => value.toLowerCase());

const categoryIdSchema = z.string().uuid();

export const createNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(240),
  body: z.string().max(100_000),
  categoryId: categoryIdSchema,
  pinned: z.boolean(),
});

export const updateNoteSchema = createNoteSchema
  .omit({ id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createNoteCategorySchema = z.object({
  id: categoryIdSchema,
  name: z.string().trim().min(1).max(40),
  color: colorSchema,
});

export const updateNoteCategorySchema = createNoteCategorySchema
  .omit({ id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const updateNotesSettingsSchema = z
  .object({
    sort: z.enum(["updated", "created", "title"]).optional(),
    previewLines: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    defaultCategoryId: categoryIdSchema.optional(),
    openInPreview: z.boolean().optional(),
    spellcheck: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
