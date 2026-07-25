import { z } from "zod";

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
    favoriteDriverId: z.string().max(100).nullable().optional(),
    favoriteConstructorId: z.string().max(100).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one preference is required.",
  });
