import { z } from "zod";

const eventFields = {
  title: z.string().trim().min(1).max(160),
  startAt: z.string().min(1).max(80),
  endAt: z.string().min(1).max(80),
  allDay: z.boolean().default(false),
  location: z.string().max(240).default(""),
  notes: z.string().max(10_000).default(""),
};

const validRange = (value: { startAt: string; endAt: string }) =>
  new Date(value.endAt).getTime() > new Date(value.startAt).getTime();

export const googleEventRangeSchema = z.object({
  timeMin: z.string().datetime(),
  timeMax: z.string().datetime(),
});

export const createGoogleEventSchema = z
  .object({
    calendarId: z.string().min(1).max(140),
    ...eventFields,
  })
  .refine(validRange, {
    message: "The event must end after it starts.",
    path: ["endAt"],
  });

export const updateGoogleEventSchema = z
  .object({
    title: eventFields.title.optional(),
    startAt: eventFields.startAt.optional(),
    endAt: eventFields.endAt.optional(),
    allDay: eventFields.allDay.optional(),
    location: eventFields.location.optional(),
    notes: eventFields.notes.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const updateGoogleCalendarSchema = z.object({
  visible: z.boolean(),
});
