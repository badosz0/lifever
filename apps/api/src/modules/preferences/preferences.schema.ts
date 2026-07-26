import { z } from "zod";

const appPreferenceOverrideSchema = z
  .object({
    enabled: z.boolean().optional(),
    showOnHome: z.boolean().optional(),
  })
  .strict();

const appConfigurationSchema = z
  .object({
    apps: z
      .record(z.string().min(1).max(80), appPreferenceOverrideSchema)
      .optional(),
    homeOrder: z.array(z.string().min(1).max(80)).max(100).optional(),
  })
  .strict();

const calendarSourceConfigurationSchema = z
  .object({
    colors: z
      .record(
        z.string().min(1).max(160),
        z.string().regex(/^#[0-9a-f]{6}$/i),
      )
      .optional(),
    visibility: z.record(z.string().min(1).max(160), z.boolean()).optional(),
  })
  .strict();

export const updatePreferencesSchema = z
  .object({
    theme: z.enum(["system", "light", "dark"]).optional(),
    timeFormat: z.enum(["system", "12-hour", "24-hour"]).optional(),
    dateFormat: z
      .enum([
        "system",
        "month-day-year",
        "day-month-year",
        "year-month-day",
      ])
      .optional(),
    calendarClickToCreate: z.boolean().optional(),
    calendarSourceConfiguration: calendarSourceConfigurationSchema.optional(),
    appConfiguration: appConfigurationSchema.optional(),
    favoriteDriverId: z.string().max(100).nullable().optional(),
    favoriteConstructorId: z.string().max(100).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one preference is required.",
  });
