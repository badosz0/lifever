import { Hono } from "hono";

import type { ApiConfig } from "../../config/env.js";
import type { AppPrisma } from "../../db/types.js";
import type { AuthenticatedEnv } from "../auth/session.js";
import type { RouteDependencies } from "../route-dependencies.js";
import {
  createGoogleAuthorizationUrl,
  createGoogleEvent,
  deleteGoogleEvent,
  exchangeGoogleAuthorizationCode,
  listGoogleCalendars,
  listGoogleEvents,
  patchGoogleEvent,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type GoogleCalendarEvent,
  type GoogleCalendarListEntry,
} from "./google-calendar.client.js";
import {
  createGoogleEventSchema,
  googleEventRangeSchema,
  updateGoogleCalendarSchema,
  updateGoogleEventSchema,
} from "./google-calendar.schema.js";
import {
  createSignedCalendarState,
  decryptCalendarToken,
  encryptCalendarToken,
  readSignedCalendarState,
} from "./token-crypto.js";

const GOOGLE_CALENDAR_COLOR = "#4285F4";
const GOOGLE_STATE_TTL_MS = 10 * 60 * 1_000;

type GoogleState = {
  expiresAt: number;
  nonce: string;
  userId: string;
};

type StoredGoogleCalendar = {
  id: string;
  googleId: string;
  name: string;
  color: string;
  accessRole: string;
  primary: boolean;
  visible: boolean;
  position: number;
};

const googleCalendarSelect = {
  id: true,
  googleId: true,
  name: true,
  color: true,
  accessRole: true,
  primary: true,
  visible: true,
  position: true,
} as const;

const getRedirectUri = (config: ApiConfig) =>
  `${config.authUrl.replace(/\/$/u, "")}/api/calendar-integrations/google/callback`;

const requireGoogleConfiguration = (config: ApiConfig) => {
  if (
    !config.googleCalendarConfigured ||
    !config.googleCalendarClientId ||
    !config.googleCalendarClientSecret
  ) {
    throw new Error("Google Calendar is not configured.");
  }
  return {
    clientId: config.googleCalendarClientId,
    clientSecret: config.googleCalendarClientSecret,
  };
};

const getGoogleAccessToken = async (
  prisma: AppPrisma,
  config: ApiConfig,
  userId: string,
) => {
  const credentials = requireGoogleConfiguration(config);
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: { encryptedRefreshToken: true },
  });
  if (!connection) throw new Error("Google Calendar is not connected.");

  const refreshToken = await decryptCalendarToken(
    connection.encryptedRefreshToken,
    config.calendarTokenEncryptionKey,
  );
  const tokens = await refreshGoogleAccessToken({
    ...credentials,
    refreshToken,
  });
  return { accessToken: tokens.access_token, refreshToken };
};

const normalizedGoogleColor = (entry: GoogleCalendarListEntry) =>
  /^#[0-9a-f]{6}$/iu.test(entry.backgroundColor ?? "")
    ? entry.backgroundColor!
    : GOOGLE_CALENDAR_COLOR;

const syncGoogleCalendarList = async ({
  accessToken,
  prisma,
  userId,
}: {
  accessToken: string;
  prisma: AppPrisma;
  userId: string;
}) => {
  const discovered = (await listGoogleCalendars(accessToken))
    .filter((calendar) => !calendar.hidden)
    .sort(
      (left, right) =>
        Number(Boolean(right.primary)) - Number(Boolean(left.primary)) ||
        left.summary.localeCompare(right.summary),
    );
  const existing = await prisma.googleCalendar.findMany({
    where: { userId },
    select: { googleId: true, visible: true },
  });
  const visibility = new Map(
    existing.map((calendar) => [calendar.googleId, calendar.visible]),
  );

  await prisma.$transaction([
    ...discovered.map((calendar, position) =>
      prisma.googleCalendar.upsert({
        where: {
          userId_googleId: { userId, googleId: calendar.id },
        },
        create: {
          googleId: calendar.id,
          name: calendar.summaryOverride || calendar.summary,
          color: normalizedGoogleColor(calendar),
          accessRole: calendar.accessRole,
          primary: Boolean(calendar.primary),
          visible:
            visibility.get(calendar.id) ??
            (calendar.selected !== false && !calendar.hidden),
          position,
          userId,
        },
        update: {
          name: calendar.summaryOverride || calendar.summary,
          color: normalizedGoogleColor(calendar),
          accessRole: calendar.accessRole,
          primary: Boolean(calendar.primary),
          position,
        },
      }),
    ),
    prisma.googleCalendar.deleteMany({
      where: {
        userId,
        googleId: { notIn: discovered.map((calendar) => calendar.id) },
      },
    }),
    prisma.googleCalendarConnection.update({
      where: { userId },
      data: { calendarListSyncedAt: new Date() },
    }),
  ]);

  return prisma.googleCalendar.findMany({
    where: { userId },
    select: googleCalendarSelect,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
};

const localAllDayDate = (value: string) => `${value}T00:00:00`;

const normalizeGoogleEvent = (
  event: GoogleCalendarEvent,
  calendar: StoredGoogleCalendar,
) => {
  const allDay = Boolean(event.start.date);
  return {
    id: `google:${calendar.id}:${event.id}`,
    externalId: event.id,
    title: event.summary?.trim() || "Untitled event",
    startAt: event.start.dateTime ?? localAllDayDate(event.start.date!),
    endAt: event.end.dateTime ?? localAllDayDate(event.end.date!),
    categoryId: "",
    calendarId: calendar.id,
    calendarName: calendar.name,
    color: calendar.color,
    location: event.location ?? "",
    notes: event.description ?? "",
    alertsEnabled: false,
    allDay,
    source: "google" as const,
    readOnly:
      calendar.accessRole !== "writer" && calendar.accessRole !== "owner",
    htmlLink: event.htmlLink ?? null,
    createdAt: event.start.dateTime ?? localAllDayDate(event.start.date!),
  };
};

const toGoogleEventInput = (input: {
  title?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  location?: string;
  notes?: string;
}) => {
  const result: {
    summary?: string;
    description?: string;
    location?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
  } = {};
  if (input.title !== undefined) result.summary = input.title;
  if (input.location !== undefined) result.location = input.location;
  if (input.notes !== undefined) result.description = input.notes;
  if (input.startAt !== undefined) {
    result.start = input.allDay
      ? { date: input.startAt.slice(0, 10) }
      : { dateTime: new Date(input.startAt).toISOString() };
  }
  if (input.endAt !== undefined) {
    result.end = input.allDay
      ? { date: input.endAt.slice(0, 10) }
      : { dateTime: new Date(input.endAt).toISOString() };
  }
  return result;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeInlineJson = (value: unknown) =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

const callbackPage = ({
  message,
  ok,
}: {
  message: string;
  ok: boolean;
}) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>${ok ? "Calendar connected" : "Calendar connection failed"}</title>
    <style>
      :root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color-scheme: light dark; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: Canvas; color: CanvasText; }
      main { width: min(360px, calc(100vw - 48px)); text-align: center; }
      .mark { margin: 0 auto 16px; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 14px; background: color-mix(in srgb, #4285f4 14%, Canvas); color: #4285f4; font-size: 22px; font-weight: 700; }
      h1 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
      p { margin: 8px 0 0; color: color-mix(in srgb, CanvasText 58%, transparent); font-size: 13px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">${ok ? "✓" : "!"}</div>
      <h1>${ok ? "Google Calendar connected" : "Couldn’t connect Google Calendar"}</h1>
      <p>${escapeHtml(message)}</p>
    </main>
    <script>
      window.opener?.postMessage(
        { type: "lifever:google-calendar", ok: ${safeInlineJson(ok)}, message: ${safeInlineJson(message)} },
        "*"
      );
      setTimeout(() => window.close(), ${ok ? 250 : 1800});
    </script>
  </body>
</html>`;

const connectionError = (error: unknown) =>
  error instanceof Error ? error.message : "Google Calendar could not connect.";

export const createGoogleCalendarRoutes = ({
  config,
  prisma,
  requireSession,
}: RouteDependencies) => {
  const routes = new Hono<AuthenticatedEnv>();

  routes.get("/callback", async (context) => {
    const code = context.req.query("code");
    const state = context.req.query("state");
    const oauthError = context.req.query("error");
    if (oauthError) {
      return context.html(
        callbackPage({ ok: false, message: "Permission was not granted." }),
        400,
      );
    }
    if (!code || !state) {
      return context.html(
        callbackPage({ ok: false, message: "The sign-in response was incomplete." }),
        400,
      );
    }

    try {
      const signedState = await readSignedCalendarState<GoogleState>(
        state,
        config.calendarTokenEncryptionKey,
      );
      if (!signedState || signedState.expiresAt < Date.now()) {
        throw new Error("This connection request expired. Please try again.");
      }
      const credentials = requireGoogleConfiguration(config);
      const tokens = await exchangeGoogleAuthorizationCode({
        ...credentials,
        code,
        redirectUri: getRedirectUri(config),
      });
      const existing = await prisma.googleCalendarConnection.findUnique({
        where: { userId: signedState.userId },
        select: { encryptedRefreshToken: true },
      });
      const encryptedRefreshToken = tokens.refresh_token
        ? await encryptCalendarToken(
            tokens.refresh_token,
            config.calendarTokenEncryptionKey,
          )
        : existing?.encryptedRefreshToken;
      if (!encryptedRefreshToken) {
        throw new Error(
          "Google did not return offline access. Reconnect and grant access again.",
        );
      }
      await prisma.googleCalendarConnection.upsert({
        where: { userId: signedState.userId },
        create: {
          userId: signedState.userId,
          encryptedRefreshToken,
        },
        update: { encryptedRefreshToken },
      });
      await syncGoogleCalendarList({
        accessToken: tokens.access_token,
        prisma,
        userId: signedState.userId,
      });
      return context.html(
        callbackPage({
          ok: true,
          message: "You can return to Lifever. This window will close.",
        }),
      );
    } catch (error) {
      return context.html(
        callbackPage({ ok: false, message: connectionError(error) }),
        400,
      );
    }
  });

  routes.use("*", requireSession);

  routes.get("/status", async (context) => {
    const userId = context.get("session").user.id;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: { calendarListSyncedAt: true },
    });
    const calendars = connection
      ? await prisma.googleCalendar.findMany({
          where: { userId },
          select: googleCalendarSelect,
          orderBy: [{ position: "asc" }, { name: "asc" }],
        })
      : [];
    return context.json({
      configured: config.googleCalendarConfigured,
      connected: Boolean(connection),
      lastSyncedAt: connection?.calendarListSyncedAt ?? null,
      calendars,
    });
  });

  routes.post("/authorize", async (context) => {
    const userId = context.get("session").user.id;
    if (!config.googleCalendarConfigured || !config.googleCalendarClientId) {
      return context.json(
        { error: "Google Calendar is not configured on this Lifever server." },
        503,
      );
    }
    const state = await createSignedCalendarState(
      {
        userId,
        nonce: crypto.randomUUID(),
        expiresAt: Date.now() + GOOGLE_STATE_TTL_MS,
      } satisfies GoogleState,
      config.calendarTokenEncryptionKey,
    );
    return context.json({
      authorizationUrl: createGoogleAuthorizationUrl({
        clientId: config.googleCalendarClientId,
        redirectUri: getRedirectUri(config),
        state,
      }),
    });
  });

  routes.post("/refresh", async (context) => {
    const userId = context.get("session").user.id;
    try {
      const { accessToken } = await getGoogleAccessToken(
        prisma,
        config,
        userId,
      );
      const calendars = await syncGoogleCalendarList({
        accessToken,
        prisma,
        userId,
      });
      return context.json({ calendars, syncedAt: new Date().toISOString() });
    } catch (error) {
      return context.json({ error: connectionError(error) }, 400);
    }
  });

  routes.patch("/calendars/:id", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updateGoogleCalendarSchema.safeParse(
      await context.req.json(),
    );
    if (!parsed.success) {
      return context.json({ error: "Invalid calendar setting" }, 400);
    }
    const existing = await prisma.googleCalendar.findFirst({
      where: { id: context.req.param("id"), userId },
      select: { id: true },
    });
    if (!existing) return context.json({ error: "Calendar not found" }, 404);
    const calendar = await prisma.googleCalendar.update({
      where: { id: existing.id },
      data: parsed.data,
      select: googleCalendarSelect,
    });
    return context.json({ calendar });
  });

  routes.get("/events", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = googleEventRangeSchema.safeParse({
      timeMin: context.req.query("timeMin"),
      timeMax: context.req.query("timeMax"),
    });
    if (!parsed.success) {
      return context.json({ error: "A valid event range is required." }, 400);
    }
    try {
      const { accessToken } = await getGoogleAccessToken(
        prisma,
        config,
        userId,
      );
      const calendars = await prisma.googleCalendar.findMany({
        where: { userId, visible: true },
        select: googleCalendarSelect,
        orderBy: [{ position: "asc" }, { name: "asc" }],
      });
      const eventResults = await Promise.allSettled(
          calendars.map(async (calendar) =>
            (
              await listGoogleEvents({
                accessToken,
                calendarId: calendar.googleId,
                ...parsed.data,
              })
            ).map((event) => normalizeGoogleEvent(event, calendar)),
          ),
        );
      const events = eventResults.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );
      if (
        calendars.length > 0 &&
        eventResults.every((result) => result.status === "rejected")
      ) {
        throw eventResults[0]!.reason;
      }
      return context.json({ events });
    } catch (error) {
      return context.json({ error: connectionError(error) }, 400);
    }
  });

  routes.post("/events", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = createGoogleEventSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { error: "Invalid Google Calendar event", issues: parsed.error.issues },
        400,
      );
    }
    const calendar = await prisma.googleCalendar.findFirst({
      where: { id: parsed.data.calendarId, userId },
      select: googleCalendarSelect,
    });
    if (!calendar) return context.json({ error: "Calendar not found" }, 404);
    if (calendar.accessRole !== "writer" && calendar.accessRole !== "owner") {
      return context.json({ error: "This Google calendar is read-only." }, 403);
    }
    try {
      const { accessToken } = await getGoogleAccessToken(
        prisma,
        config,
        userId,
      );
      const event = await createGoogleEvent({
        accessToken,
        calendarId: calendar.googleId,
        event: toGoogleEventInput(parsed.data) as Parameters<
          typeof createGoogleEvent
        >[0]["event"],
      });
      return context.json(
        { event: normalizeGoogleEvent(event, calendar) },
        201,
      );
    } catch (error) {
      return context.json({ error: connectionError(error) }, 400);
    }
  });

  routes.patch("/events/:calendarId/:eventId", async (context) => {
    const userId = context.get("session").user.id;
    const parsed = updateGoogleEventSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      return context.json(
        { error: "Invalid Google Calendar event", issues: parsed.error.issues },
        400,
      );
    }
    const calendar = await prisma.googleCalendar.findFirst({
      where: { id: context.req.param("calendarId"), userId },
      select: googleCalendarSelect,
    });
    if (!calendar) return context.json({ error: "Calendar not found" }, 404);
    if (calendar.accessRole !== "writer" && calendar.accessRole !== "owner") {
      return context.json({ error: "This Google calendar is read-only." }, 403);
    }
    try {
      const { accessToken } = await getGoogleAccessToken(
        prisma,
        config,
        userId,
      );
      const event = await patchGoogleEvent({
        accessToken,
        calendarId: calendar.googleId,
        eventId: context.req.param("eventId"),
        event: toGoogleEventInput(parsed.data),
      });
      return context.json({ event: normalizeGoogleEvent(event, calendar) });
    } catch (error) {
      return context.json({ error: connectionError(error) }, 400);
    }
  });

  routes.delete("/events/:calendarId/:eventId", async (context) => {
    const userId = context.get("session").user.id;
    const calendar = await prisma.googleCalendar.findFirst({
      where: { id: context.req.param("calendarId"), userId },
      select: googleCalendarSelect,
    });
    if (!calendar) return context.json({ error: "Calendar not found" }, 404);
    if (calendar.accessRole !== "writer" && calendar.accessRole !== "owner") {
      return context.json({ error: "This Google calendar is read-only." }, 403);
    }
    try {
      const { accessToken } = await getGoogleAccessToken(
        prisma,
        config,
        userId,
      );
      await deleteGoogleEvent({
        accessToken,
        calendarId: calendar.googleId,
        eventId: context.req.param("eventId"),
      });
      return context.body(null, 204);
    } catch (error) {
      return context.json({ error: connectionError(error) }, 400);
    }
  });

  routes.delete("/", async (context) => {
    const userId = context.get("session").user.id;
    const connection = await prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: { encryptedRefreshToken: true },
    });
    if (connection) {
      try {
        const token = await decryptCalendarToken(
          connection.encryptedRefreshToken,
          config.calendarTokenEncryptionKey,
        );
        await revokeGoogleToken(token);
      } catch {
        // Removing Lifever's saved access still completes if Google is unavailable.
      }
      await prisma.$transaction([
        prisma.googleCalendar.deleteMany({ where: { userId } }),
        prisma.googleCalendarConnection.delete({ where: { userId } }),
      ]);
    }
    return context.body(null, 204);
  });

  return routes;
};
