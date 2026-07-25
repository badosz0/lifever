import { z } from "zod";

const calendarEventFields = {
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  categoryId: z.string().min(1).max(100),
  location: z.string().max(240),
  notes: z.string().max(10_000),
};

const hasValidRange = (value: { startAt: string; endAt: string }) =>
  new Date(value.endAt).getTime() > new Date(value.startAt).getTime();

export const createCalendarEventSchema = z
  .object(calendarEventFields)
  .refine(hasValidRange, {
    message: "The event must end after it starts.",
    path: ["endAt"],
  });

export const updateCalendarEventSchema = z
  .object({
    title: calendarEventFields.title.optional(),
    startAt: calendarEventFields.startAt.optional(),
    endAt: calendarEventFields.endAt.optional(),
    categoryId: calendarEventFields.categoryId.optional(),
    location: calendarEventFields.location.optional(),
    notes: calendarEventFields.notes.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
