import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { useAppCalendarSources } from "@/features/apps/calendar-source-registry";
import { useApps } from "@/features/apps/model/apps-provider";
import {
  categoryIdForLegacyColor,
  defaultCalendarCategories,
  isCalendarCategoryColor,
} from "@/features/calendar/lib/categories";
import { addDays } from "@/features/calendar/lib/dates";
import {
  defaultLocalCalendars,
  initialCalendarEvents,
} from "@/features/calendar/model/seed";
import type {
  CalendarCategory,
  CalendarCollection,
  CalendarEvent,
  NewCalendarEvent,
} from "@/features/calendar/model/types";
import { RESET_DEMO_DATA_EVENT } from "@/features/settings/lib/demo-data";
import { SHARING_CHANGED_EVENT } from "@/features/sharing/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { ApiRequestError, apiRequest, apiUrl } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type GoogleCalendarStatus = {
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
};

type CalendarContextValue = {
  isReady: boolean;
  categories: CalendarCategory[];
  calendars: CalendarCollection[];
  events: CalendarEvent[];
  nativeEvents: CalendarEvent[];
  activeCalendarId: string | null;
  selectedEventId: string | null;
  google: GoogleCalendarStatus & { syncing: boolean };
  setActiveCalendarId: (id: string) => void;
  setVisibleEventRange: (start: Date, end: Date) => void;
  setSelectedEventId: (id: string | null) => void;
  setCalendarVisibility: (id: string, visible: boolean) => void;
  setExternalCalendarColor: (id: string, color: string | null) => void;
  addEvent: (input: NewCalendarEvent) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => CalendarEvent | null;
  restoreEvent: (event: CalendarEvent) => CalendarEvent | null;
  duplicateEvent: (id: string) => CalendarEvent | null;
  registerEventUndo: (action: () => void) => () => void;
  undoLastEventAction: () => boolean;
  addCalendar: (
    input: Pick<CalendarCollection, "name" | "color">,
  ) => CalendarCollection;
  updateCalendar: (
    id: string,
    patch: Partial<Pick<CalendarCollection, "name" | "color" | "position">>,
  ) => void;
  removeCalendar: (id: string) => boolean;
  connectGoogle: () => Promise<void>;
  disconnectGoogle: () => Promise<void>;
  refreshGoogle: () => Promise<void>;
  addCategory: (
    input: Pick<CalendarCategory, "name" | "color" | "calendarId">,
  ) => CalendarCategory;
  updateCategory: (
    id: string,
    patch: Partial<Pick<CalendarCategory, "name" | "color" | "position">>,
  ) => void;
  removeCategory: (id: string) => boolean;
};

type CalendarEventPatch = Partial<
  Pick<
    CalendarEvent,
    | "title"
    | "startAt"
    | "endAt"
    | "categoryId"
    | "calendarId"
    | "location"
    | "notes"
    | "color"
    | "alertsEnabled"
    | "allDay"
  >
>;

type PendingEventUpdate = {
  body: CalendarEventPatch;
  baseUpdatedAt?: string;
  timeout: number;
};

type StoredCalendarEvent = Omit<
  CalendarEvent,
  | "alertsEnabled"
  | "allDay"
  | "calendarId"
  | "categoryId"
  | "readOnly"
  | "source"
> & {
  alertsEnabled?: boolean;
  allDay?: boolean;
  calendarId?: string;
  categoryId?: string;
  color?: unknown;
  readOnly?: boolean;
  source?: CalendarEvent["source"];
};

type RemoteCalendar = {
  id: string;
  name: string;
  color: string;
  position: number;
  visible: boolean;
  createdAt: string;
  writable?: boolean;
  access?: CalendarCollection["access"];
};

type RemoteGoogleCalendar = RemoteCalendar & {
  accessRole: string;
  primary: boolean;
};

type GoogleStatusResponse = {
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
  calendars: RemoteGoogleCalendar[];
};

const CalendarContext = createContext<CalendarContextValue | null>(null);
const EVENT_STORAGE_KEY = "lifever-calendar-events";
const CATEGORY_STORAGE_KEY = "lifever-calendar-categories";
const CALENDAR_STORAGE_KEY = "lifever-calendars";
const ACTIVE_CALENDAR_STORAGE_KEY = "lifever-active-calendar";
const WRITE_DELAY = 400;
const REMOTE_WRITE_DELAY = 400;
const EVENT_UNDO_LIMIT = 50;

const defaultGoogleEventRange = () => {
  const year = new Date().getFullYear();
  return {
    timeMin: new Date(year, 0, 1).toISOString(),
    timeMax: new Date(year + 1, 0, 1).toISOString(),
  };
};

const normalizeCalendarEvent = (
  event: StoredCalendarEvent,
  fallbackCalendarId: string,
): CalendarEvent => {
  const { color: storedColor, ...currentEvent } = event;
  const source = event.source ?? "lifever";
  const color =
    typeof storedColor === "string" &&
    /^#[0-9a-f]{6}$/i.test(storedColor)
      ? storedColor.toLowerCase()
      : null;
  return {
    ...currentEvent,
    categoryId:
      event.categoryId ||
      categoryIdForLegacyColor(source === "lifever" ? storedColor : null),
    calendarId: event.calendarId || fallbackCalendarId,
    alertsEnabled: event.alertsEnabled !== false,
    allDay: event.allDay === true,
    source,
    readOnly: event.readOnly === true,
    ...(color ? { color } : {}),
  };
};

const normalizeNativeCalendar = (
  calendar: RemoteCalendar,
): CalendarCollection => ({
  ...calendar,
  source: "lifever",
  writable: calendar.writable !== false,
});

const normalizeGoogleCalendar = (
  calendar: RemoteGoogleCalendar,
): CalendarCollection => ({
  ...calendar,
  sourceColor: calendar.color,
  source: "google",
  writable:
    calendar.accessRole === "writer" || calendar.accessRole === "owner",
});

const readStoredCalendars = (): CalendarCollection[] => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(CALENDAR_STORAGE_KEY) ?? "null",
    ) as CalendarCollection[] | null;
    const calendars = stored?.filter(
      (calendar) =>
        calendar.id &&
        calendar.name?.trim() &&
        isCalendarCategoryColor(calendar.color),
    );
    if (calendars?.length) {
      return calendars
        .map((calendar) => ({
          ...calendar,
          source: "lifever" as const,
          writable: true,
        }))
        .sort((left, right) => left.position - right.position);
    }
  } catch {
    // Fall back to the curated local calendar.
  }
  return defaultLocalCalendars.map((calendar) => ({ ...calendar }));
};

const readStoredEvents = (fallbackCalendarId: string): CalendarEvent[] => {
  try {
    const stored = localStorage.getItem(EVENT_STORAGE_KEY);
    if (stored) {
      return (JSON.parse(stored) as StoredCalendarEvent[]).map((event) =>
        normalizeCalendarEvent(event, fallbackCalendarId),
      );
    }
  } catch {
    // A storage issue should not prevent Calendar from opening.
  }
  return initialCalendarEvents.map((event) => ({
    ...event,
    calendarId: fallbackCalendarId,
  }));
};

const readStoredCategories = (fallbackCalendarId: string): CalendarCategory[] => {
  try {
    const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (stored) {
      const categories = (JSON.parse(stored) as CalendarCategory[])
        .map((category) => ({
          ...category,
          calendarId: category.calendarId || fallbackCalendarId,
        }))
        .filter(
        (category) =>
          category.id &&
          category.name?.trim() &&
          isCalendarCategoryColor(category.color),
      );
      if (categories.length > 0) {
        return categories.sort((left, right) => left.position - right.position);
      }
    }
  } catch {
    // Fall back to the curated category set.
  }
  return defaultCalendarCategories.map((category) => ({
    ...category,
    calendarId: fallbackCalendarId,
  }));
};

const writeLocalState = ({
  calendars,
  categories,
  events,
}: {
  calendars: CalendarCollection[];
  categories: CalendarCategory[];
  events: CalendarEvent[];
}) => {
  try {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(calendars));
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // The current in-memory state remains usable in restricted contexts.
  }
};

const readActiveCalendar = () => {
  try {
    return localStorage.getItem(ACTIVE_CALENDAR_STORAGE_KEY);
  } catch {
    return null;
  }
};

export function CalendarProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const { isAppEnabled } = useApps();
  const appCalendarSources = useAppCalendarSources();
  const {
    calendarSourceConfiguration,
    setCalendarSourceConfiguration,
  } = useUserPreferences();
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [nativeCalendars, setNativeCalendars] = useState<
    CalendarCollection[]
  >([]);
  const [googleCalendars, setGoogleCalendars] = useState<
    CalendarCollection[]
  >([]);
  const [nativeEvents, setNativeEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeCalendarId, setActiveCalendarIdState] = useState<string | null>(
    readActiveCalendar,
  );
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({
    configured: false,
    connected: false,
    lastSyncedAt: null,
  });
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [visibleGoogleRange, setVisibleGoogleRange] = useState(
    defaultGoogleEventRange,
  );
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const pendingCreates = useRef(new Map<string, Promise<void>>());
  const pendingDeletes = useRef(new Map<string, Promise<void>>());
  const eventWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingCategoryCreates = useRef(new Map<string, Promise<void>>());
  const categoryWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingCalendarCreates = useRef(new Map<string, Promise<void>>());
  const calendarWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingEventUpdates = useRef(new Map<string, PendingEventUpdate>());
  const eventUndoStack = useRef<
    Array<{ action: () => void; consumed: boolean }>
  >([]);
  const nativeEventsRef = useRef(nativeEvents);
  const googleEventsRef = useRef(googleEvents);
  const categoriesRef = useRef(categories);
  const nativeCalendarsRef = useRef(nativeCalendars);
  nativeEventsRef.current = nativeEvents;
  googleEventsRef.current = googleEvents;
  categoriesRef.current = categories;
  nativeCalendarsRef.current = nativeCalendars;

  const configuredGoogleCalendars = useMemo(
    () =>
      googleCalendars.map((calendar) => ({
        ...calendar,
        color:
          calendarSourceConfiguration.colors?.[calendar.id] ??
          calendar.sourceColor ??
          calendar.color,
      })),
    [calendarSourceConfiguration.colors, googleCalendars],
  );
  const appCalendars = useMemo(
    () =>
      appCalendarSources
        .filter((source) => isAppEnabled(source.appId))
        .map<CalendarCollection>((source, position) => ({
          id: source.id,
          appId: source.appId,
          name: source.name,
          color:
            calendarSourceConfiguration.colors?.[source.id] ?? source.color,
          sourceColor: source.color,
          position,
          visible:
            calendarSourceConfiguration.visibility?.[source.id] ??
            source.defaultVisible,
          writable: false,
          source: "app",
        })),
    [
      appCalendarSources,
      calendarSourceConfiguration.colors,
      calendarSourceConfiguration.visibility,
      isAppEnabled,
    ],
  );
  const calendars = useMemo(
    () => [
      ...nativeCalendars,
      ...configuredGoogleCalendars,
      ...appCalendars,
    ],
    [appCalendars, configuredGoogleCalendars, nativeCalendars],
  );
  const appEvents = useMemo(
    () =>
      appCalendarSources
        .filter((source) => isAppEnabled(source.appId))
        .flatMap((source) =>
          source.events.map<CalendarEvent>((event) => ({
            id: event.id,
            externalId: event.id,
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            categoryId: "",
            calendarId: source.id,
            calendarName: source.name,
            color:
              calendarSourceConfiguration.colors?.[source.id] ??
              source.color,
            location: event.location ?? "",
            notes: event.notes ?? "",
            alertsEnabled: false,
            allDay: event.allDay === true,
            source: "app",
            readOnly: true,
            htmlLink: event.htmlLink ?? null,
            createdAt: event.startAt,
          })),
        ),
    [
      appCalendarSources,
      calendarSourceConfiguration.colors,
      isAppEnabled,
    ],
  );
  const configuredGoogleEvents = useMemo(
    () =>
      googleEvents.map((event) => {
        const color =
          calendarSourceConfiguration.colors?.[event.calendarId];
        return color ? { ...event, color } : event;
      }),
    [calendarSourceConfiguration.colors, googleEvents],
  );
  const visibleCalendarIds = useMemo(
    () =>
      new Set(
        calendars
          .filter((calendar) => calendar.visible)
          .map((calendar) => calendar.id),
      ),
    [calendars],
  );
  const events = useMemo(
    () =>
      [...nativeEvents, ...configuredGoogleEvents, ...appEvents].filter(
        (event) => visibleCalendarIds.has(event.calendarId),
      ),
    [
      appEvents,
      configuredGoogleEvents,
      nativeEvents,
      visibleCalendarIds,
    ],
  );

  const recoverRemote = useCallback((message: string) => {
    toast.error("Calendar could not save", {
      id: "calendar-sync-error",
      description: message,
    });
  }, []);

  const loadGoogleEvents = useCallback(async () => {
    if (!session || !googleStatus.connected) {
      setGoogleEvents([]);
      return;
    }
    const query = new URLSearchParams(visibleGoogleRange);
    const { events: remoteEvents } = await apiRequest<{
      events: CalendarEvent[];
    }>(`/api/calendar-integrations/google/events?${query.toString()}`);
    setGoogleEvents(
      remoteEvents.map((event) =>
        normalizeCalendarEvent(event, event.calendarId),
      ),
    );
  }, [googleStatus.connected, session, visibleGoogleRange]);

  const loadGoogleStatus = useCallback(async () => {
    if (!session) {
      setGoogleCalendars([]);
      setGoogleEvents([]);
      setGoogleStatus({
        configured: false,
        connected: false,
        lastSyncedAt: null,
      });
      return;
    }
    const status = await apiRequest<GoogleStatusResponse>(
      "/api/calendar-integrations/google/status",
    );
    setGoogleCalendars(status.calendars.map(normalizeGoogleCalendar));
    setGoogleStatus({
      configured: status.configured,
      connected: status.connected,
      lastSyncedAt: status.lastSyncedAt,
    });
    if (!status.connected) setGoogleEvents([]);
  }, [session]);

  const loadRemote = useCallback(
    async (userId: string, preserveSelection = false) => {
      const requestedMode = `user:${userId}`;
      const requestedVersion = mutationVersion.current;
      try {
        const [
          { events: remoteEvents },
          { categories: remoteCategories },
          { calendars: remoteCalendars },
          google,
        ] = await Promise.all([
          apiRequest<{ events: CalendarEvent[] }>("/api/calendar-events"),
          apiRequest<{ categories: CalendarCategory[] }>(
            "/api/calendar-categories",
          ),
          apiRequest<{ calendars: RemoteCalendar[] }>("/api/calendars"),
          apiRequest<GoogleStatusResponse>(
            "/api/calendar-integrations/google/status",
          ),
        ]);
        if (
          modeRef.current !== requestedMode ||
          requestedVersion !== mutationVersion.current
        ) {
          return;
        }
        const normalizedCalendars = remoteCalendars.map(
          normalizeNativeCalendar,
        );
        const fallbackCalendarId = normalizedCalendars[0]!.id;
        setNativeCalendars(normalizedCalendars);
        setNativeEvents(
          remoteEvents.map((event) =>
            normalizeCalendarEvent(event, fallbackCalendarId),
          ),
        );
        setCategories(remoteCategories);
        setGoogleCalendars(google.calendars.map(normalizeGoogleCalendar));
        setGoogleStatus({
          configured: google.configured,
          connected: google.connected,
          lastSyncedAt: google.lastSyncedAt,
        });
        if (!google.connected) setGoogleEvents([]);
        if (!preserveSelection) setSelectedEventId(null);
        setHydratedMode(requestedMode);
      } catch {
        if (modeRef.current === requestedMode) {
          toast.error("Calendar could not sync", {
            id: "calendar-sync-error",
            description: "Check your connection and try again.",
          });
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    for (const entry of eventUndoStack.current) entry.consumed = true;
    eventUndoStack.current = [];
    setHydratedMode(null);
    setSelectedEventId(null);
    if (userId) {
      setNativeEvents([]);
      setNativeCalendars([]);
      setCategories([]);
      void loadRemote(userId);
    } else {
      const storedCalendars = readStoredCalendars();
      setNativeCalendars(storedCalendars);
      setNativeEvents(readStoredEvents(storedCalendars[0]!.id));
      setCategories(readStoredCategories(storedCalendars[0]!.id));
      setGoogleCalendars([]);
      setGoogleEvents([]);
      setGoogleStatus({
        configured: false,
        connected: false,
        lastSyncedAt: null,
      });
      setHydratedMode("local");
    }
  }, [isPending, loadRemote, session?.user.id]);

  useEffect(() => {
    if (!session || !googleStatus.connected) return;
    void loadGoogleEvents().catch(() => {
      toast.error("Google Calendar could not sync", {
        id: "google-calendar-sync-error",
        description: "Lifever will try again when the app regains focus.",
      });
    });
  }, [googleStatus.connected, loadGoogleEvents, session]);

  useEffect(() => {
    if (hydratedMode !== "local" || session || isPending) return;
    const timeout = window.setTimeout(
      () =>
        writeLocalState({
          calendars: nativeCalendars,
          categories,
          events: nativeEvents,
        }),
      WRITE_DELAY,
    );
    return () => window.clearTimeout(timeout);
  }, [
    categories,
    hydratedMode,
    isPending,
    nativeCalendars,
    nativeEvents,
    session,
  ]);

  useEffect(() => {
    const writableCalendars = calendars.filter(
      (calendar) => calendar.writable && calendar.visible,
    );
    if (
      activeCalendarId &&
      writableCalendars.some((calendar) => calendar.id === activeCalendarId)
    ) {
      return;
    }
    setActiveCalendarIdState(writableCalendars[0]?.id ?? null);
  }, [activeCalendarId, calendars]);

  useEffect(() => {
    if (
      selectedEventId &&
      !events.some((event) => event.id === selectedEventId)
    ) {
      setSelectedEventId(null);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    try {
      if (activeCalendarId) {
        localStorage.setItem(ACTIVE_CALENDAR_STORAGE_KEY, activeCalendarId);
      }
    } catch {
      // The current selection remains available in memory.
    }
  }, [activeCalendarId]);

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (
      userId &&
      pendingCreates.current.size === 0 &&
      pendingDeletes.current.size === 0 &&
      eventWriteChains.current.size === 0 &&
      pendingCategoryCreates.current.size === 0 &&
      categoryWriteChains.current.size === 0 &&
      pendingCalendarCreates.current.size === 0 &&
      calendarWriteChains.current.size === 0 &&
      pendingEventUpdates.current.size === 0
    ) {
      void loadRemote(userId, true).then(() => loadGoogleEvents());
    }
  }, Boolean(session?.user.id));

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const refresh = () => {
      if (
        pendingCreates.current.size === 0 &&
        pendingDeletes.current.size === 0 &&
        eventWriteChains.current.size === 0 &&
        pendingCategoryCreates.current.size === 0 &&
        categoryWriteChains.current.size === 0 &&
        pendingCalendarCreates.current.size === 0 &&
        calendarWriteChains.current.size === 0 &&
        pendingEventUpdates.current.size === 0
      ) {
        void loadRemote(userId, true).then(() => loadGoogleEvents());
      }
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 5_000);
    window.addEventListener(SHARING_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(SHARING_CHANGED_EVENT, refresh);
    };
  }, [loadGoogleEvents, loadRemote, session?.user.id]);

  useEffect(() => {
    const reset = () => {
      if (modeRef.current !== "local") return;
      const resetCalendars = defaultLocalCalendars.map((calendar) => ({
        ...calendar,
      }));
      setNativeCalendars(resetCalendars);
      setNativeEvents(
        initialCalendarEvents.map((event) => ({
          ...event,
          calendarId: resetCalendars[0]!.id,
        })),
      );
      setCategories(
        defaultCalendarCategories.map((category) => ({
          ...category,
          calendarId: resetCalendars[0]!.id,
        })),
      );
      setActiveCalendarIdState(resetCalendars[0]!.id);
      setSelectedEventId(null);
      for (const entry of eventUndoStack.current) entry.consumed = true;
      eventUndoStack.current = [];
    };
    window.addEventListener(RESET_DEMO_DATA_EVENT, reset);
    return () => window.removeEventListener(RESET_DEMO_DATA_EVENT, reset);
  }, []);

  const registerEventUndo = useCallback((action: () => void) => {
    const entry = { action, consumed: false };
    eventUndoStack.current.push(entry);
    if (eventUndoStack.current.length > EVENT_UNDO_LIMIT) {
      eventUndoStack.current.splice(
        0,
        eventUndoStack.current.length - EVENT_UNDO_LIMIT,
      );
    }

    return () => {
      if (entry.consumed) return;
      entry.consumed = true;
      eventUndoStack.current = eventUndoStack.current.filter(
        (candidate) => candidate !== entry,
      );
      entry.action();
    };
  }, []);

  const undoLastEventAction = useCallback(() => {
    let entry = eventUndoStack.current.pop();
    while (entry?.consumed) entry = eventUndoStack.current.pop();
    if (!entry) return false;
    entry.consumed = true;
    entry.action();
    return true;
  }, []);

  const findEvent = useCallback(
    (id: string) =>
      nativeEventsRef.current.find((event) => event.id === id) ??
      googleEventsRef.current.find((event) => event.id === id) ??
      appEvents.find((event) => event.id === id),
    [appEvents],
  );

  const sendEventUpdate = useCallback(
    (id: string, body: CalendarEventPatch, baseUpdatedAt?: string) => {
      const event = findEvent(id);
      if (!session || !event || event.readOnly) return;
      const create = pendingCreates.current.get(id);
      const previous =
        eventWriteChains.current.get(id) ?? create ?? Promise.resolve();
      const request = previous
        .then(async () => {
          if (event.source === "google" && event.externalId) {
            const { event: savedEvent } = await apiRequest<{
              event: CalendarEvent;
            }>(
              `/api/calendar-integrations/google/events/${encodeURIComponent(
                event.calendarId,
              )}/${encodeURIComponent(event.externalId)}`,
              {
                method: "PATCH",
                body: JSON.stringify(body),
              },
            );
            setGoogleEvents((current) =>
              current.map((item) =>
                item.id === id
                  ? normalizeCalendarEvent(savedEvent, savedEvent.calendarId)
                  : item,
              ),
            );
            return;
          }
          const save = (version?: string) =>
            apiRequest<{ event: CalendarEvent }>(
              `/api/calendar-events/${id}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  ...body,
                  ...(version ? { baseUpdatedAt: version } : {}),
                }),
              },
            );
          try {
            const { event: savedEvent } = await save(baseUpdatedAt);
            setNativeEvents((current) =>
              current.map((item) =>
                item.id === id
                  ? { ...item, updatedAt: savedEvent.updatedAt }
                  : item,
              ),
            );
          } catch (error) {
            if (
              error instanceof ApiRequestError &&
              error.status === 409 &&
              error.payload &&
              typeof error.payload === "object" &&
              "event" in error.payload
            ) {
              const latest = error.payload.event as CalendarEvent;
              const { event: savedEvent } = await save(latest.updatedAt);
              setNativeEvents((current) =>
                current.map((item) =>
                  item.id === id
                    ? { ...item, updatedAt: savedEvent.updatedAt }
                    : item,
                ),
              );
              return;
            }
            throw error;
          }
        })
        .catch(() => {
          recoverRemote("Lifever is refreshing your latest synced copy.");
          const userId = session.user.id;
          void loadRemote(userId, true).then(() => loadGoogleEvents());
        });
      eventWriteChains.current.set(id, request);
      void request.finally(() => {
        if (eventWriteChains.current.get(id) === request) {
          eventWriteChains.current.delete(id);
        }
      });
    },
    [
      findEvent,
      loadGoogleEvents,
      loadRemote,
      recoverRemote,
      session,
    ],
  );

  const flushEventUpdate = useCallback(
    (id: string) => {
      const pending = pendingEventUpdates.current.get(id);
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      pendingEventUpdates.current.delete(id);
      sendEventUpdate(id, pending.body, pending.baseUpdatedAt);
    },
    [sendEventUpdate],
  );

  const queueEventUpdate = useCallback(
    (
      id: string,
      body: CalendarEventPatch,
      deferred: boolean,
      baseUpdatedAt?: string,
    ) => {
      const pending = pendingEventUpdates.current.get(id);
      if (pending) window.clearTimeout(pending.timeout);
      const merged = { ...pending?.body, ...body };
      if (!deferred) {
        pendingEventUpdates.current.delete(id);
        sendEventUpdate(
          id,
          merged,
          pending?.baseUpdatedAt ?? baseUpdatedAt,
        );
        return;
      }
      const timeout = window.setTimeout(
        () => flushEventUpdate(id),
        REMOTE_WRITE_DELAY,
      );
      pendingEventUpdates.current.set(id, {
        body: merged,
        baseUpdatedAt: pending?.baseUpdatedAt ?? baseUpdatedAt,
        timeout,
      });
    },
    [flushEventUpdate, sendEventUpdate],
  );

  useEffect(() => {
    const flush = () => {
      if (modeRef.current === "local") {
        writeLocalState({
          calendars: nativeCalendarsRef.current,
          categories: categoriesRef.current,
          events: nativeEventsRef.current,
        });
      }
      for (const id of pendingEventUpdates.current.keys()) {
        flushEventUpdate(id);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      for (const pending of pendingEventUpdates.current.values()) {
        window.clearTimeout(pending.timeout);
      }
    };
  }, [flushEventUpdate]);

  const persistNewEvent = useCallback(
    (optimisticEvent: CalendarEvent, input: NewCalendarEvent) => {
      if (!session) return;
      const request =
        optimisticEvent.source === "google"
          ? apiRequest<{ event: CalendarEvent }>(
              "/api/calendar-integrations/google/events",
              {
                method: "POST",
                body: JSON.stringify(input),
              },
            ).then(({ event }) => {
              const normalized = normalizeCalendarEvent(
                event,
                event.calendarId,
              );
              setGoogleEvents((current) =>
                current.map((item) =>
                  item.id === optimisticEvent.id ? normalized : item,
                ),
              );
              setSelectedEventId((current) =>
                current === optimisticEvent.id ? normalized.id : current,
              );
            })
          : apiRequest<{ event: CalendarEvent }>("/api/calendar-events", {
              method: "POST",
              body: JSON.stringify({ id: optimisticEvent.id, ...input }),
            }).then(({ event }) => {
              setNativeEvents((current) =>
                current.map((item) =>
                  item.id === optimisticEvent.id
                    ? { ...item, updatedAt: event.updatedAt }
                    : item,
                ),
              );
            });
      const tracked = request
        .catch(() => {
          if (optimisticEvent.source === "google") {
            setGoogleEvents((current) =>
              current.filter((event) => event.id !== optimisticEvent.id),
            );
          }
          recoverRemote("The new event was not saved.");
        })
        .finally(() => pendingCreates.current.delete(optimisticEvent.id));
      pendingCreates.current.set(optimisticEvent.id, tracked);
    },
    [recoverRemote, session],
  );

  const addEvent = useCallback(
    (input: NewCalendarEvent) => {
      const requestedCalendar =
        calendars.find((calendar) => calendar.id === input.calendarId) ??
        calendars.find(
          (calendar) => calendar.id === activeCalendarId,
        ) ??
        calendars.find((calendar) => calendar.writable);
      if (!requestedCalendar?.writable) {
        throw new Error("Choose a writable calendar.");
      }
      const event: CalendarEvent = {
        id: crypto.randomUUID(),
        ...input,
        calendarId: requestedCalendar.id,
        calendarName: requestedCalendar.name,
        ...(requestedCalendar.source !== "lifever"
          ? { color: requestedCalendar.color }
          : {}),
        source: requestedCalendar.source,
        readOnly: false,
        createdAt: new Date().toISOString(),
      };
      mutationVersion.current += 1;
      if (event.source === "google") {
        setGoogleEvents((current) => [...current, event]);
      } else {
        setNativeEvents((current) => [...current, event]);
      }
      setSelectedEventId(event.id);
      persistNewEvent(event, {
        ...input,
        calendarId: requestedCalendar.id,
        ...(requestedCalendar.source === "lifever"
          ? {}
          : { color: undefined }),
      });
      return event;
    },
    [activeCalendarId, calendars, persistNewEvent],
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<CalendarEvent>) => {
      const event = findEvent(id);
      if (!event || event.readOnly) return;
      mutationVersion.current += 1;
      const apply = (current: CalendarEvent[]) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      if (event.source === "google") setGoogleEvents(apply);
      else setNativeEvents(apply);
      if (session) {
        const allowedPatch: CalendarEventPatch = {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.startAt !== undefined ? { startAt: patch.startAt } : {}),
          ...(patch.endAt !== undefined ? { endAt: patch.endAt } : {}),
          ...(patch.categoryId !== undefined
            ? { categoryId: patch.categoryId }
            : {}),
          ...(patch.calendarId !== undefined
            ? { calendarId: patch.calendarId }
            : {}),
          ...(patch.location !== undefined
            ? { location: patch.location }
            : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          ...(patch.color !== undefined ? { color: patch.color } : {}),
          ...(patch.alertsEnabled !== undefined
            ? { alertsEnabled: patch.alertsEnabled }
            : {}),
          ...(patch.allDay !== undefined ? { allDay: patch.allDay } : {}),
        };
        if (event.source === "google") {
          delete allowedPatch.categoryId;
          delete allowedPatch.calendarId;
          delete allowedPatch.color;
          delete allowedPatch.alertsEnabled;
          if (
            patch.startAt !== undefined ||
            patch.endAt !== undefined
          ) {
            allowedPatch.allDay = event.allDay;
          }
        }
        if (Object.keys(allowedPatch).length > 0) {
          const textOnly = Object.keys(allowedPatch).every(
            (key) => key === "title" || key === "location" || key === "notes",
          );
          queueEventUpdate(id, allowedPatch, textOnly, event.updatedAt);
        }
      }
    },
    [findEvent, queueEventUpdate, session],
  );

  const removeEvent = useCallback(
    (id: string) => {
      const event = findEvent(id) ?? null;
      if (!event || event.readOnly) return null;
      mutationVersion.current += 1;
      const pending = pendingEventUpdates.current.get(id);
      if (pending) {
        window.clearTimeout(pending.timeout);
        pendingEventUpdates.current.delete(id);
      }
      if (event.source === "google") {
        setGoogleEvents((current) =>
          current.filter((item) => item.id !== id),
        );
      } else {
        setNativeEvents((current) =>
          current.filter((item) => item.id !== id),
        );
      }
      setSelectedEventId((current) => (current === id ? null : current));
      if (session) {
        const previous =
          eventWriteChains.current.get(id) ??
          pendingCreates.current.get(id) ??
          Promise.resolve();
        const request = previous
          .then(() => {
            if (event.source === "google" && event.externalId) {
              return apiRequest(
                `/api/calendar-integrations/google/events/${encodeURIComponent(
                  event.calendarId,
                )}/${encodeURIComponent(event.externalId)}`,
                { method: "DELETE" },
              );
            }
            return apiRequest(`/api/calendar-events/${id}`, {
              method: "DELETE",
            });
          })
          .then(() => undefined)
          .catch(() => {
            recoverRemote("The event could not be deleted.");
            void loadRemote(session.user.id, true).then(() =>
              loadGoogleEvents(),
            );
          })
          .finally(() => pendingDeletes.current.delete(id));
        pendingDeletes.current.set(id, request);
      }
      return event;
    },
    [
      findEvent,
      loadGoogleEvents,
      loadRemote,
      recoverRemote,
      session,
    ],
  );

  const restoreEvent = useCallback(
    (event: CalendarEvent) => {
      if (event.readOnly) return null;
      const restored = addEvent({
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        categoryId:
          event.categoryId || categoriesRef.current[0]?.id || "",
        calendarId: event.calendarId,
        location: event.location,
        notes: event.notes,
        color: event.color,
        alertsEnabled: event.alertsEnabled,
        allDay: event.allDay,
      });
      return restored;
    },
    [addEvent],
  );

  const duplicateEvent = useCallback(
    (id: string) => {
      const source = findEvent(id);
      if (!source || source.readOnly) return null;
      return addEvent({
        title: source.title,
        startAt: source.startAt,
        endAt: source.endAt,
        categoryId:
          source.categoryId || categoriesRef.current[0]?.id || "",
        calendarId: source.calendarId,
        location: source.location,
        notes: source.notes,
        color: source.color,
        alertsEnabled: source.alertsEnabled,
        allDay: source.allDay,
      });
    },
    [addEvent, findEvent],
  );

  const setActiveCalendarId = useCallback(
    (id: string) => {
      if (calendars.some((calendar) => calendar.id === id && calendar.writable)) {
        setActiveCalendarIdState(id);
      }
    },
    [calendars],
  );

  const setVisibleEventRange = useCallback((start: Date, end: Date) => {
    const next = {
      timeMin: addDays(start, -35).toISOString(),
      timeMax: addDays(end, 35).toISOString(),
    };
    setVisibleGoogleRange((current) =>
      current.timeMin === next.timeMin && current.timeMax === next.timeMax
        ? current
        : next,
    );
  }, []);

  const setCalendarVisibility = useCallback(
    (id: string, visible: boolean) => {
      const calendar = calendars.find((item) => item.id === id);
      if (!calendar) return;
      mutationVersion.current += 1;
      if (calendar.source === "lifever") {
        setNativeCalendars((current) =>
          current.map((item) =>
            item.id === id ? { ...item, visible } : item,
          ),
        );
        if (session) {
          void apiRequest(`/api/calendars/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ visible }),
          }).catch(() => recoverRemote("Calendar visibility was not saved."));
        }
      } else if (calendar.source === "google") {
        setGoogleCalendars((current) =>
          current.map((item) =>
            item.id === id ? { ...item, visible } : item,
          ),
        );
        if (session) {
          void apiRequest(
            `/api/calendar-integrations/google/calendars/${id}`,
            {
              method: "PATCH",
              body: JSON.stringify({ visible }),
            },
          )
            .then(() => loadGoogleEvents())
            .catch(() =>
              recoverRemote("Google Calendar visibility was not saved."),
            );
        }
      } else {
        const nextVisibility = {
          ...calendarSourceConfiguration.visibility,
          [id]: visible,
        };
        const appSource = appCalendarSources.find((source) => source.id === id);
        if (visible === appSource?.defaultVisible) delete nextVisibility[id];
        setCalendarSourceConfiguration({
          ...calendarSourceConfiguration,
          visibility: Object.keys(nextVisibility).length
            ? nextVisibility
            : undefined,
        });
      }
    },
    [
      appCalendarSources,
      calendarSourceConfiguration,
      calendars,
      loadGoogleEvents,
      recoverRemote,
      session,
      setCalendarSourceConfiguration,
    ],
  );

  const setExternalCalendarColor = useCallback(
    (id: string, color: string | null) => {
      const calendar = calendars.find((item) => item.id === id);
      if (!calendar || calendar.source === "lifever") return;
      const nextColors = { ...calendarSourceConfiguration.colors };
      const normalizedColor = color?.toLowerCase() ?? null;
      if (
        !normalizedColor ||
        normalizedColor === calendar.sourceColor?.toLowerCase()
      ) {
        delete nextColors[id];
      } else {
        nextColors[id] = normalizedColor;
      }
      setCalendarSourceConfiguration({
        ...calendarSourceConfiguration,
        colors: Object.keys(nextColors).length ? nextColors : undefined,
      });
    },
    [
      calendarSourceConfiguration,
      calendars,
      setCalendarSourceConfiguration,
    ],
  );

  const addCalendar = useCallback(
    (input: Pick<CalendarCollection, "name" | "color">) => {
      const defaultCategoryId = crypto.randomUUID();
      const calendar: CalendarCollection = {
        id: crypto.randomUUID(),
        name: input.name.trim() || "New calendar",
        color: input.color,
        position:
          nativeCalendars.reduce(
            (maximum, item) => Math.max(maximum, item.position),
            -1,
          ) + 1,
        visible: true,
        writable: true,
        source: "lifever",
        createdAt: new Date().toISOString(),
      };
      mutationVersion.current += 1;
      setNativeCalendars((current) => [...current, calendar]);
      setCategories((current) => [
        ...current,
        {
          id: defaultCategoryId,
          name: "General",
          color: calendar.color.toLowerCase(),
          position: 0,
          calendarId: calendar.id,
          createdAt: new Date().toISOString(),
        },
      ]);
      setActiveCalendarIdState(calendar.id);
      if (session) {
        const request = apiRequest<{
          calendar: RemoteCalendar;
          category: CalendarCategory;
        }>("/api/calendars", {
          method: "POST",
          body: JSON.stringify({
            id: calendar.id,
            name: calendar.name,
            color: calendar.color,
            position: calendar.position,
            visible: calendar.visible,
            defaultCategoryId,
          }),
        })
          .then(({ category }) => {
            setCategories((current) =>
              current.map((item) =>
                item.id === defaultCategoryId ? category : item,
              ),
            );
          })
          .catch(() => {
            setNativeCalendars((current) =>
              current.filter((item) => item.id !== calendar.id),
            );
            setCategories((current) =>
              current.filter((item) => item.id !== defaultCategoryId),
            );
            recoverRemote("The calendar was not created.");
          })
          .finally(() => pendingCalendarCreates.current.delete(calendar.id));
        pendingCalendarCreates.current.set(calendar.id, request);
      }
      return calendar;
    },
    [nativeCalendars, recoverRemote, session],
  );

  const updateCalendar = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<CalendarCollection, "name" | "color" | "position">
      >,
    ) => {
      const calendar = nativeCalendars.find((item) => item.id === id);
      if (!calendar || !calendar.writable) return;
      mutationVersion.current += 1;
      setNativeCalendars((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
      if (session && Object.keys(patch).length > 0) {
        const previous =
          calendarWriteChains.current.get(id) ??
          pendingCalendarCreates.current.get(id) ??
          Promise.resolve();
        const request = previous
          .then(() =>
            apiRequest(`/api/calendars/${id}`, {
              method: "PATCH",
              body: JSON.stringify(patch),
            }).then(() => undefined),
          )
          .catch(() => recoverRemote("Calendar changes were not saved."));
        calendarWriteChains.current.set(id, request);
        void request.finally(() => {
          if (calendarWriteChains.current.get(id) === request) {
            calendarWriteChains.current.delete(id);
          }
        });
      }
    },
    [nativeCalendars, recoverRemote, session],
  );

  const removeCalendar = useCallback(
    (id: string) => {
      if (nativeCalendars.length <= 1) return false;
      const target = nativeCalendars.find((calendar) => calendar.id === id);
      const replacement = nativeCalendars.find(
        (calendar) => calendar.id !== id,
      );
      const replacementCategory = categoriesRef.current.find(
        (category) => category.calendarId === replacement?.id,
      );
      if (
        !target ||
        target.access?.role === "collaborator" ||
        !replacement ||
        !replacementCategory
      ) {
        return false;
      }
      mutationVersion.current += 1;
      setNativeCalendars((current) =>
        current.filter((calendar) => calendar.id !== id),
      );
      setNativeEvents((current) =>
        current.map((event) =>
          event.calendarId === id
            ? {
                ...event,
                calendarId: replacement.id,
                categoryId: replacementCategory.id,
              }
            : event,
        ),
      );
      setCategories((current) =>
        current.filter((category) => category.calendarId !== id),
      );
      setActiveCalendarIdState((current) =>
        current === id ? replacement.id : current,
      );
      if (session) {
        const previous =
          calendarWriteChains.current.get(id) ??
          pendingCalendarCreates.current.get(id) ??
          Promise.resolve();
        void previous
          .then(() =>
            apiRequest(`/api/calendars/${id}`, { method: "DELETE" }),
          )
          .catch(() => recoverRemote("The calendar was not deleted."));
      }
      return true;
    },
    [nativeCalendars, recoverRemote, session],
  );

  const addCategory = useCallback(
    (
      input: Pick<CalendarCategory, "name" | "color" | "calendarId">,
    ) => {
      const calendar = nativeCalendars.find(
        (item) => item.id === input.calendarId,
      );
      if (!calendar?.writable) {
        throw new Error("You only have read access to this calendar.");
      }
      const category: CalendarCategory = {
        id: crypto.randomUUID(),
        name: input.name.trim() || "New category",
        color: input.color,
        calendarId: input.calendarId,
        position:
          categories
            .filter((item) => item.calendarId === input.calendarId)
            .reduce(
            (maximum, item) => Math.max(maximum, item.position),
            -1,
            ) + 1,
        createdAt: new Date().toISOString(),
      };
      mutationVersion.current += 1;
      setCategories((current) => [...current, category]);
      if (session) {
        const request = apiRequest("/api/calendar-categories", {
          method: "POST",
          body: JSON.stringify(category),
        })
          .then(() => undefined)
          .catch(() => recoverRemote("The category was not created."))
          .finally(() => pendingCategoryCreates.current.delete(category.id));
        pendingCategoryCreates.current.set(category.id, request);
      }
      return category;
    },
    [categories, nativeCalendars, recoverRemote, session],
  );

  const updateCategory = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<CalendarCategory, "name" | "color" | "position">
      >,
    ) => {
      const calendarId = categoriesRef.current.find(
        (category) => category.id === id,
      )?.calendarId;
      if (
        !calendarId ||
        !nativeCalendarsRef.current.find(
          (calendar) => calendar.id === calendarId,
        )?.writable
      ) {
        return;
      }
      mutationVersion.current += 1;
      setCategories((current) =>
        current.map((category) =>
          category.id === id ? { ...category, ...patch } : category,
        ),
      );
      if (session && Object.keys(patch).length > 0) {
        const previous =
          categoryWriteChains.current.get(id) ??
          pendingCategoryCreates.current.get(id) ??
          Promise.resolve();
        const request = previous
          .then(() =>
            apiRequest(`/api/calendar-categories/${id}`, {
              method: "PATCH",
              body: JSON.stringify(patch),
            }).then(() => undefined),
          )
          .catch(() => recoverRemote("Category changes were not saved."));
        categoryWriteChains.current.set(id, request);
        void request.finally(() => {
          if (categoryWriteChains.current.get(id) === request) {
            categoryWriteChains.current.delete(id);
          }
        });
      }
    },
    [recoverRemote, session],
  );

  const removeCategory = useCallback(
    (id: string) => {
      if (categories.length <= 1) return false;
      const target = categories.find((category) => category.id === id);
      if (
        !target ||
        !nativeCalendars.find(
          (calendar) => calendar.id === target.calendarId,
        )?.writable
      ) {
        return false;
      }
      const replacement = categories.find(
        (category) =>
          category.id !== id && category.calendarId === target?.calendarId,
      );
      if (!replacement) {
        return false;
      }
      mutationVersion.current += 1;
      setCategories((current) =>
        current.filter((category) => category.id !== id),
      );
      setNativeEvents((current) =>
        current.map((event) =>
          event.categoryId === id
            ? { ...event, categoryId: replacement.id }
            : event,
        ),
      );
      if (session) {
        const previous =
          categoryWriteChains.current.get(id) ??
          pendingCategoryCreates.current.get(id) ??
          Promise.resolve();
        void previous
          .then(() =>
            apiRequest(`/api/calendar-categories/${id}`, {
              method: "DELETE",
            }),
          )
          .catch(() => recoverRemote("The category was not deleted."));
      }
      return true;
    },
    [categories, nativeCalendars, recoverRemote, session],
  );

  const refreshGoogle = useCallback(async () => {
    if (!session) return;
    setGoogleSyncing(true);
    try {
      const response = await apiRequest<{
        calendars: RemoteGoogleCalendar[];
        syncedAt: string;
      }>("/api/calendar-integrations/google/refresh", { method: "POST" });
      setGoogleCalendars(response.calendars.map(normalizeGoogleCalendar));
      setGoogleStatus((current) => ({
        ...current,
        connected: true,
        lastSyncedAt: response.syncedAt,
      }));
      await loadGoogleEvents();
    } finally {
      setGoogleSyncing(false);
    }
  }, [loadGoogleEvents, session]);

  const connectGoogle = useCallback(async () => {
    if (!session) {
      throw new Error("Sign in to Lifever before connecting Google Calendar.");
    }
    const { authorizationUrl } = await apiRequest<{
      authorizationUrl: string;
    }>("/api/calendar-integrations/google/authorize", { method: "POST" });
    const apiOrigin = new URL(apiUrl).origin;
    await new Promise<void>((resolve, reject) => {
      let timeout = 0;
      const finish = () => {
        window.removeEventListener("message", receive);
        window.clearTimeout(timeout);
      };
      const receive = (message: MessageEvent) => {
        if (
          message.origin !== apiOrigin ||
          message.data?.type !== "lifever:google-calendar"
        ) {
          return;
        }
        finish();
        if (message.data.ok) resolve();
        else reject(new Error(message.data.message || "Connection failed."));
      };
      window.addEventListener("message", receive);
      const popup = window.open(
        authorizationUrl,
        "lifever-google-calendar",
        "popup,width=520,height=720",
      );
      if (!popup) {
        finish();
        reject(new Error("Allow popups to connect Google Calendar."));
        return;
      }
      timeout = window.setTimeout(() => {
        finish();
        reject(new Error("Google Calendar connection timed out."));
      }, 10 * 60 * 1_000);
    });
    await loadGoogleStatus();
    await loadGoogleEvents();
  }, [loadGoogleEvents, loadGoogleStatus, session]);

  const disconnectGoogle = useCallback(async () => {
    if (!session) return;
    await apiRequest("/api/calendar-integrations/google", {
      method: "DELETE",
    });
    setGoogleCalendars([]);
    setGoogleEvents([]);
    setGoogleStatus((current) => ({
      ...current,
      connected: false,
      lastSyncedAt: null,
    }));
  }, [session]);

  const value = useMemo<CalendarContextValue>(
    () => ({
      isReady:
        hydratedMode !== null &&
        categories.length > 0 &&
        nativeCalendars.length > 0,
      categories,
      calendars,
      events,
      nativeEvents,
      activeCalendarId,
      selectedEventId,
      google: { ...googleStatus, syncing: googleSyncing },
      setActiveCalendarId,
      setVisibleEventRange,
      setSelectedEventId,
      setCalendarVisibility,
      setExternalCalendarColor,
      addEvent,
      updateEvent,
      removeEvent,
      restoreEvent,
      duplicateEvent,
      registerEventUndo,
      undoLastEventAction,
      addCalendar,
      updateCalendar,
      removeCalendar,
      connectGoogle,
      disconnectGoogle,
      refreshGoogle,
      addCategory,
      updateCategory,
      removeCategory,
    }),
    [
      activeCalendarId,
      addCalendar,
      addCategory,
      addEvent,
      calendars,
      categories,
      connectGoogle,
      disconnectGoogle,
      duplicateEvent,
      events,
      googleStatus,
      googleSyncing,
      hydratedMode,
      nativeCalendars.length,
      nativeEvents,
      refreshGoogle,
      registerEventUndo,
      removeCalendar,
      removeCategory,
      removeEvent,
      restoreEvent,
      selectedEventId,
      setActiveCalendarId,
      setVisibleEventRange,
      setCalendarVisibility,
      setExternalCalendarColor,
      updateCalendar,
      undoLastEventAction,
      updateCategory,
      updateEvent,
    ],
  );

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used inside CalendarProvider");
  }
  return context;
}
