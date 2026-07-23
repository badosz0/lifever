import { cors } from "hono/cors";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { env } from "./config/env.js";
import { auth } from "./modules/auth/auth.js";
import { calendarCategoriesRoutes } from "./modules/calendar/calendar-categories.routes.js";
import { calendarRoutes } from "./modules/calendar/calendar.routes.js";
import { remindersRoutes } from "./modules/reminders/reminders.routes.js";

const allowedOrigins = new Set([
  env.webUrl,
  "tauri://localhost",
  "https://tauri.localhost",
]);

export const app = new Hono();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => (allowedOrigins.has(origin) ? origin : env.webUrl),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/api/health", (context) =>
  context.json({ status: "ok", service: "lifever-api" }),
);

app.on(["GET", "POST"], "/api/auth/*", (context) =>
  auth.handler(context.req.raw),
);

app.route("/api/reminders", remindersRoutes);
app.route("/api/calendar-categories", calendarCategoriesRoutes);
app.route("/api/calendar-events", calendarRoutes);

app.notFound((context) => context.json({ error: "Not found" }, 404));

app.onError((error, context) => {
  console.error(error);
  return context.json({ error: "Something went wrong" }, 500);
});
