import { Hono } from "hono";

import { prisma } from "../../db/client.js";
import { getSession } from "../auth/session.js";
import { updatePreferencesSchema } from "./preferences.schema.js";

type PreferencesEnv = {
  Variables: {
    session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  };
};

const preferencesSelect = {
  theme: true,
  timeFormat: true,
  dateFormat: true,
  favoriteDriverId: true,
  favoriteConstructorId: true,
} as const;

export const preferencesRoutes = new Hono<PreferencesEnv>();

preferencesRoutes.use("*", async (context, next) => {
  const session = await getSession(context);
  if (!session) return context.json({ error: "Unauthorized" }, 401);
  context.set("session", session);
  await next();
});

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
