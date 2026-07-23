import { z } from "zod";

export const calendarCategoryColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.")
  .transform((value) => value.toLowerCase());

const calendarCategoryFields = {
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  color: calendarCategoryColorSchema,
  position: z.number().int().min(0),
};

export const createCalendarCategorySchema = z.object(calendarCategoryFields);

export const updateCalendarCategorySchema = z
  .object({
    name: calendarCategoryFields.name.optional(),
    color: calendarCategoryFields.color.optional(),
    position: calendarCategoryFields.position.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
