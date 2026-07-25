import { cors } from "hono/cors";
import { Hono } from "hono";
import { logger } from "hono/logger";

import type { ApiConfig } from "./config/env.js";
import type { AppPrisma } from "./db/types.js";
import { createAuth } from "./modules/auth/auth.js";
import { createSessionMiddleware } from "./modules/auth/session.js";
import { createCalendarCategoriesRoutes } from "./modules/calendar/calendar-categories.routes.js";
import { createCalendarRoutes } from "./modules/calendar/calendar.routes.js";
import { createKanbanRoutes } from "./modules/kanban/kanban.routes.js";
import { createNotesRoutes } from "./modules/notes/notes.routes.js";
import { createPreferencesRoutes } from "./modules/preferences/preferences.routes.js";
import { createRemindersRoutes } from "./modules/reminders/reminders.routes.js";

type ApiDependencies = {
  config: ApiConfig;
  prisma: AppPrisma;
};

export const createApp = ({ config, prisma }: ApiDependencies) => {
  const app = new Hono();
  const auth = createAuth({ config, prisma });
  const requireSession = createSessionMiddleware(auth);
  const routeDependencies = { prisma, requireSession };
  const allowedOrigins = new Set([
    config.webUrl,
    "tauri://localhost",
    "https://tauri.localhost",
  ]);

  app.use(logger());
  app.use(
    "/api/*",
    cors({
      origin: (origin) => (allowedOrigins.has(origin) ? origin : config.webUrl),
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.get("/api/health", async (context) => {
    await prisma.user.findFirst({ select: { id: true } });
    return context.json({
      status: "ok",
      service: "lifever-api",
      database: "ok",
    });
  });

  app.on(["GET", "POST"], "/api/auth/*", (context) =>
    auth.handler(context.req.raw),
  );

  app.route("/api/reminders", createRemindersRoutes(routeDependencies));
  app.route(
    "/api/calendar-categories",
    createCalendarCategoriesRoutes(routeDependencies),
  );
  app.route("/api/calendar-events", createCalendarRoutes(routeDependencies));
  app.route("/api/kanban", createKanbanRoutes(routeDependencies));
  app.route("/api/notes", createNotesRoutes(routeDependencies));
  app.route("/api/preferences", createPreferencesRoutes(routeDependencies));

  app.notFound((context) => context.json({ error: "Not found" }, 404));

  app.onError((error, context) => {
    console.error(error);
    return context.json({ error: "Something went wrong" }, 500);
  });

  return app;
};
