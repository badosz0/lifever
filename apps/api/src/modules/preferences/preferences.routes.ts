import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import { updatePreferencesSchema } from "./preferences.schema.js";

const preferencesSelect = {
  theme: true,
  timeFormat: true,
  dateFormat: true,
  calendarClickToCreate: true,
  calendarSourceConfiguration: true,
  appConfiguration: true,
  favoriteDriverId: true,
  favoriteConstructorId: true,
} as const;

export const createPreferencesRoutes = ({
  prisma,
  requireSession,
}: RouteDependencies) => {
  const preferencesRoutes = new Hono<AuthenticatedEnv>();

  preferencesRoutes.use("*", requireSession);

  preferencesRoutes.get("/", async (context) => {
    const userId = context.get("session").user.id;
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: preferencesSelect,
    });
    return context.json({ preferences });
  });

  preferencesRoutes.patch("/", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updatePreferencesSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { error: "Invalid preferences", issues: parsed.error.issues },
        400,
      );
    }
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...parsed.data },
      update: parsed.data,
      select: preferencesSelect,
    });
    return context.json({ preferences });
  });

  return preferencesRoutes;
};
