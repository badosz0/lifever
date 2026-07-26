import { z } from "zod";

const calendarFields = {
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  position: z.number().int().min(0).max(1_000),
  visible: z.boolean(),
};

export const createLifeverCalendarSchema = z.object({
  ...calendarFields,
  defaultCategoryId: z.string().uuid(),
});

export const updateLifeverCalendarSchema = z
  .object({
    name: calendarFields.name.optional(),
    color: calendarFields.color.optional(),
    position: calendarFields.position.optional(),
    visible: calendarFields.visible.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
