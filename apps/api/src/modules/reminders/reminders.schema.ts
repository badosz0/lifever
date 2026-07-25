import { z } from "zod";

export const createReminderSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  notes: z.string().max(10_000).nullable().optional(),
  dueAt: z.iso.datetime().nullable().optional(),
  listId: z.string().cuid().nullable().optional(),
  important: z.boolean().optional(),
});

export const updateReminderSchema = createReminderSchema
  .omit({ id: true })
  .partial()
  .extend({
    completed: z.boolean().optional(),
    position: z.number().finite().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
