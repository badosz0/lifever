const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const googleCalendarScopes = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
};

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  colorId?: string;
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
};

type GoogleCalendarEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
};

const readGoogleResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as
    | T
    | { error?: { message?: string }; error_description?: string }
    | null;
  if (!response.ok) {
    const errorBody =
      body && typeof body === "object"
        ? (body as {
            error?: { message?: string };
            error_description?: string;
          })
        : null;
    const details =
      errorBody?.error_description
        ? errorBody.error_description
        : errorBody?.error
          ? errorBody.error.message
          : null;
    throw new Error(details || `Google Calendar returned ${response.status}.`);
  }
  return body as T;
};

export const createGoogleAuthorizationUrl = ({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}) => {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleCalendarScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
};

export const exchangeGoogleAuthorizationCode = async ({
  clientId,
  clientSecret,
  code,
  redirectUri,
}: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  return readGoogleResponse<GoogleTokenResponse>(
    await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
};

export const refreshGoogleAccessToken = async ({
  clientId,
  clientSecret,
  refreshToken,
}: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return readGoogleResponse<GoogleTokenResponse>(
    await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }),
  );
};

export const revokeGoogleToken = async (refreshToken: string) => {
  await fetch(GOOGLE_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refreshToken }),
  });
};

export const listGoogleCalendars = async (accessToken: string) => {
  const calendars: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${GOOGLE_CALENDAR_API}/users/me/calendarList`);
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("showHidden", "false");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await readGoogleResponse<{
      items?: GoogleCalendarListEntry[];
      nextPageToken?: string;
    }>(
      await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    calendars.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return calendars;
};

export const listGoogleEvents = async ({
  accessToken,
  calendarId,
  timeMax,
  timeMin,
}: {
  accessToken: string;
  calendarId: string;
  timeMax: string;
  timeMin: string;
}) => {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.set("maxResults", "2500");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("orderBy", "startTime");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await readGoogleResponse<{
      items?: GoogleCalendarEvent[];
      nextPageToken?: string;
    }>(
      await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    events.push(
      ...(page.items ?? []).filter(
        (event) =>
          event.status !== "cancelled" &&
          Boolean(event.start?.date || event.start?.dateTime) &&
          Boolean(event.end?.date || event.end?.dateTime),
      ),
    );
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
};

export const createGoogleEvent = async ({
  accessToken,
  calendarId,
  event,
}: {
  accessToken: string;
  calendarId: string;
  event: GoogleCalendarEventInput;
}) =>
  readGoogleResponse<GoogleCalendarEvent>(
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    ),
  );

export const patchGoogleEvent = async ({
  accessToken,
  calendarId,
  event,
  eventId,
}: {
  accessToken: string;
  calendarId: string;
  event: Partial<GoogleCalendarEventInput>;
  eventId: string;
}) =>
  readGoogleResponse<GoogleCalendarEvent>(
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    ),
  );

export const deleteGoogleEvent = async ({
  accessToken,
  calendarId,
  eventId,
}: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}) => {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok && response.status !== 410) {
    await readGoogleResponse(response);
  }
};
