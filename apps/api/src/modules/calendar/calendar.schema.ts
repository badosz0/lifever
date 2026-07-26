import { z } from "zod";

const calendarEventFields = {
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  categoryId: z.string().min(1).max(100),
  calendarId: z.string().min(1).max(140),
  location: z.string().max(240),
  notes: z.string().max(10_000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
  alertsEnabled: z.boolean().default(true),
  allDay: z.boolean().default(false),
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
    calendarId: calendarEventFields.calendarId.optional(),
    location: calendarEventFields.location.optional(),
    notes: calendarEventFields.notes.optional(),
    color: calendarEventFields.color,
    alertsEnabled: calendarEventFields.alertsEnabled.optional(),
    allDay: calendarEventFields.allDay.optional(),
    baseUpdatedAt: z.string().datetime().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
