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

import { addMinutes, toCalendarDate } from "@/features/calendar/lib/dates";
import {
  categoryIdForLegacyColor,
  defaultCalendarCategories,
  isCalendarCategoryColor,
} from "@/features/calendar/lib/categories";
import { RESET_DEMO_DATA_EVENT } from "@/features/settings/lib/demo-data";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

import { initialCalendarEvents } from "./seed";
import type {
  CalendarCategory,
  CalendarEvent,
  NewCalendarEvent,
} from "./types";

type CalendarContextValue = {
  isReady: boolean;
  categories: CalendarCategory[];
  events: CalendarEvent[];
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  addEvent: (input: NewCalendarEvent) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => CalendarEvent | null;
  restoreEvent: (event: CalendarEvent) => void;
  duplicateEvent: (id: string) => CalendarEvent | null;
  addCategory: (input: Pick<CalendarCategory, "name" | "color">) => CalendarCategory;
  updateCategory: (
    id: string,
    patch: Partial<Pick<CalendarCategory, "name" | "color" | "position">>,
  ) => void;
  removeCategory: (id: string) => boolean;
};

const CalendarContext = createContext<CalendarContextValue | null>(null);
const STORAGE_KEY = "lifever-calendar-events";
const CATEGORY_STORAGE_KEY = "lifever-calendar-categories";
const WRITE_DELAY = 400;
const REMOTE_WRITE_DELAY = 400;

type CalendarEventPatch = Partial<
  Pick<
    CalendarEvent,
    | "title"
    | "startAt"
    | "endAt"
    | "categoryId"
    | "location"
    | "notes"
    | "alertsEnabled"
  >
>;

type PendingEventUpdate = {
  body: CalendarEventPatch;
  timeout: number;
};

type StoredCalendarEvent = Omit<
  CalendarEvent,
  "categoryId" | "alertsEnabled"
> & {
  categoryId?: string;
  alertsEnabled?: boolean;
  color?: unknown;
};

function normalizeCalendarEvent(event: StoredCalendarEvent): CalendarEvent {
  const { color, ...currentEvent } = event;
  return {
    ...currentEvent,
    categoryId: event.categoryId || categoryIdForLegacyColor(color),
    alertsEnabled: event.alertsEnabled !== false,
  };
}

function readStoredEvents(): CalendarEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return (JSON.parse(stored) as StoredCalendarEvent[]).map(
        normalizeCalendarEvent,
      );
    }
  } catch {
    // A local storage issue should not prevent Calendar from opening.
  }
  return initialCalendarEvents;
}

function readStoredCategories(): CalendarCategory[] {
  try {
    const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (stored) {
      const categories = (JSON.parse(stored) as CalendarCategory[]).filter(
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
  return defaultCalendarCategories;
}

function writeStoredEvents(events: CalendarEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // The in-memory calendar remains available in restricted contexts.
  }
}

function writeStoredCategories(categories: CalendarCategory[]) {
  try {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // The in-memory calendar remains available in restricted contexts.
  }
}

export function CalendarProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const pendingCreates = useRef(new Map<string, Promise<void>>());
  const pendingDeletes = useRef(new Map<string, Promise<void>>());
  const eventWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingCategoryCreates = useRef(new Map<string, Promise<void>>());
  const categoryWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingEventUpdates = useRef(new Map<string, PendingEventUpdate>());
  const eventsRef = useRef(events);
  const categoriesRef = useRef(categories);
  eventsRef.current = events;
  categoriesRef.current = categories;

  const loadRemote = useCallback(
    async (userId: string, preserveSelection = false) => {
      const requestedMode = `user:${userId}`;
      const requestedVersion = mutationVersion.current;
      try {
        const [{ events: remoteEvents }, { categories: remoteCategories }] =
          await Promise.all([
            apiRequest<{ events: CalendarEvent[] }>("/api/calendar-events"),
            apiRequest<{ categories: CalendarCategory[] }>(
              "/api/calendar-categories",
            ),
          ]);
        if (
          modeRef.current !== requestedMode ||
          requestedVersion !== mutationVersion.current
        ) {
          return;
        }
        setEvents(remoteEvents.map(normalizeCalendarEvent));
        setCategories(remoteCategories);
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

  const recoverRemote = useCallback(
    (userId: string) => {
      toast.error("Calendar could not save", {
        id: "calendar-sync-error",
        description: "Lifever is refreshing your latest synced copy.",
      });
      void loadRemote(userId, true);
    },
    [loadRemote],
  );

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    setHydratedMode(null);
    setSelectedEventId(null);
    if (userId) {
      setEvents([]);
      setCategories([]);
      void loadRemote(userId);
    } else {
      setEvents(readStoredEvents());
      setCategories(readStoredCategories());
      setHydratedMode("local");
    }
  }, [isPending, loadRemote, session?.user.id]);

  useEffect(() => {
    if (hydratedMode !== "local" || session || isPending) return;
    const timeout = window.setTimeout(() => writeStoredEvents(events), WRITE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [events, hydratedMode, isPending, session]);

  useEffect(() => {
    if (hydratedMode !== "local" || session || isPending) return;
    const timeout = window.setTimeout(
      () => writeStoredCategories(categories),
      WRITE_DELAY,
    );
    return () => window.clearTimeout(timeout);
  }, [categories, hydratedMode, isPending, session]);

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (
      userId &&
      pendingCreates.current.size === 0 &&
      pendingDeletes.current.size === 0 &&
      eventWriteChains.current.size === 0 &&
      pendingCategoryCreates.current.size === 0 &&
      categoryWriteChains.current.size === 0 &&
      pendingEventUpdates.current.size === 0
    ) {
      void loadRemote(userId, true);
    }
  }, Boolean(session?.user.id));

  useEffect(() => {
    const reset = () => {
      if (modeRef.current !== "local") return;
      setEvents(initialCalendarEvents.map((event) => ({ ...event })));
      setCategories(
        defaultCalendarCategories.map((category) => ({ ...category })),
      );
      setSelectedEventId(null);
    };
    window.addEventListener(RESET_DEMO_DATA_EVENT, reset);
    return () => window.removeEventListener(RESET_DEMO_DATA_EVENT, reset);
  }, []);

  const sendEventUpdate = useCallback(
    (id: string, body: CalendarEventPatch) => {
      const create = pendingCreates.current.get(id);
      const previous =
        eventWriteChains.current.get(id) ?? create ?? Promise.resolve();
      const request = previous
        .then(() =>
          apiRequest(`/api/calendar-events/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          }).then(() => undefined),
        )
        .catch(() => {
          const userId = session?.user.id;
          if (userId) recoverRemote(userId);
        });
      eventWriteChains.current.set(id, request);
      void request.finally(() => {
        if (eventWriteChains.current.get(id) === request) {
          eventWriteChains.current.delete(id);
        }
      });
    },
    [recoverRemote, session?.user.id],
  );

  const flushEventUpdate = useCallback(
    (id: string) => {
      const pending = pendingEventUpdates.current.get(id);
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      pendingEventUpdates.current.delete(id);
      sendEventUpdate(id, pending.body);
    },
    [sendEventUpdate],
  );

  const queueEventUpdate = useCallback(
    (id: string, body: CalendarEventPatch, deferred: boolean) => {
      const pending = pendingEventUpdates.current.get(id);
      if (pending) window.clearTimeout(pending.timeout);
      const merged = { ...pending?.body, ...body };
      if (!deferred) {
        pendingEventUpdates.current.delete(id);
        sendEventUpdate(id, merged);
        return;
      }
      const timeout = window.setTimeout(
        () => flushEventUpdate(id),
        REMOTE_WRITE_DELAY,
      );
      pendingEventUpdates.current.set(id, { body: merged, timeout });
    },
    [flushEventUpdate, sendEventUpdate],
  );

  useEffect(() => {
    const flush = () => {
      if (modeRef.current === "local") {
        writeStoredEvents(eventsRef.current);
        writeStoredCategories(categoriesRef.current);
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
      const request = apiRequest<{ event: CalendarEvent }>("/api/calendar-events", {
        method: "POST",
        body: JSON.stringify({ id: optimisticEvent.id, ...input }),
      })
        .then(() => undefined)
        .catch(() => recoverRemote(session.user.id))
        .finally(() => pendingCreates.current.delete(optimisticEvent.id));
      pendingCreates.current.set(optimisticEvent.id, request);
    },
    [recoverRemote, session],
  );

  const addEvent = useCallback(
    (input: NewCalendarEvent) => {
      const event: CalendarEvent = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      };
      mutationVersion.current += 1;
      setEvents((current) => [...current, event]);
      setSelectedEventId(event.id);
      persistNewEvent(event, input);
      return event;
    },
    [persistNewEvent],
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<CalendarEvent>) => {
      mutationVersion.current += 1;
      setEvents((current) =>
        current.map((event) => (event.id === id ? { ...event, ...patch } : event)),
      );
      if (session) {
        const allowedPatch: CalendarEventPatch = {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.startAt !== undefined ? { startAt: patch.startAt } : {}),
          ...(patch.endAt !== undefined ? { endAt: patch.endAt } : {}),
          ...(patch.categoryId !== undefined
            ? { categoryId: patch.categoryId }
            : {}),
          ...(patch.location !== undefined ? { location: patch.location } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          ...(patch.alertsEnabled !== undefined
            ? { alertsEnabled: patch.alertsEnabled }
            : {}),
        };
        if (Object.keys(allowedPatch).length > 0) {
          const textOnly = Object.keys(allowedPatch).every(
            (key) => key === "title" || key === "location" || key === "notes",
          );
          queueEventUpdate(id, allowedPatch, textOnly);
        }
      }
    },
    [queueEventUpdate, session],
  );

  const removeEvent = useCallback(
    (id: string) => {
      const event = events.find((item) => item.id === id) ?? null;
      mutationVersion.current += 1;
      const pending = pendingEventUpdates.current.get(id);
      if (pending) {
        window.clearTimeout(pending.timeout);
        pendingEventUpdates.current.delete(id);
      }
      setEvents((current) => current.filter((item) => item.id !== id));
      setSelectedEventId((current) => (current === id ? null : current));
      if (session) {
        const previous =
          eventWriteChains.current.get(id) ??
          pendingCreates.current.get(id) ??
          Promise.resolve();
        const request = previous
          .then(() =>
            apiRequest(`/api/calendar-events/${id}`, { method: "DELETE" }),
          )
          .then(() => undefined)
          .catch(() => recoverRemote(session.user.id))
          .finally(() => pendingDeletes.current.delete(id));
        pendingDeletes.current.set(id, request);
      }
      return event;
    },
    [events, recoverRemote, session],
  );

  const restoreEvent = useCallback(
    (event: CalendarEvent) => {
      mutationVersion.current += 1;
      setEvents((current) => [...current, event]);
      const input = {
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        categoryId: event.categoryId,
        location: event.location,
        notes: event.notes,
        alertsEnabled: event.alertsEnabled,
      };
      const deletion = pendingDeletes.current.get(event.id);
      if (deletion) {
        void deletion.then(() => persistNewEvent(event, input));
      } else {
        persistNewEvent(event, input);
      }
    },
    [persistNewEvent],
  );

  const duplicateEvent = useCallback(
    (id: string) => {
      const source = events.find((event) => event.id === id);
      if (!source) return null;
      const duplicate: NewCalendarEvent = {
        title: source.title,
        startAt: addMinutes(toCalendarDate(source.startAt), 30).toISOString(),
        endAt: addMinutes(toCalendarDate(source.endAt), 30).toISOString(),
        categoryId: source.categoryId,
        location: source.location,
        notes: source.notes,
        alertsEnabled: source.alertsEnabled,
      };
      return addEvent(duplicate);
    },
    [addEvent, events],
  );

  const addCategory = useCallback(
    (input: Pick<CalendarCategory, "name" | "color">) => {
      const category: CalendarCategory = {
        id: crypto.randomUUID(),
        name: input.name.trim() || "New category",
        color: input.color,
        position:
          categories.reduce(
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
          .catch(() => recoverRemote(session.user.id))
          .finally(() => pendingCategoryCreates.current.delete(category.id));
        pendingCategoryCreates.current.set(category.id, request);
      }
      return category;
    },
    [categories, recoverRemote, session],
  );

  const updateCategory = useCallback(
    (
      id: string,
      patch: Partial<Pick<CalendarCategory, "name" | "color" | "position">>,
    ) => {
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
          .catch(() => recoverRemote(session.user.id));
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
      const replacement = categories.find((category) => category.id !== id);
      if (!replacement || !categories.some((category) => category.id === id)) {
        return false;
      }

      mutationVersion.current += 1;
      setCategories((current) =>
        current.filter((category) => category.id !== id),
      );
      setEvents((current) =>
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
          .catch(() => recoverRemote(session.user.id));
      }
      return true;
    },
    [categories, recoverRemote, session],
  );

  const value = useMemo(
    () => ({
      isReady: hydratedMode !== null && categories.length > 0,
      categories,
      events,
      selectedEventId,
      setSelectedEventId,
      addEvent,
      updateEvent,
      removeEvent,
      restoreEvent,
      duplicateEvent,
      addCategory,
      updateCategory,
      removeCategory,
    }),
    [
      addEvent,
      addCategory,
      categories,
      hydratedMode,
      duplicateEvent,
      events,
      removeEvent,
      removeCategory,
      restoreEvent,
      selectedEventId,
      updateEvent,
      updateCategory,
    ],
  );

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar must be used inside CalendarProvider");
  return context;
}
