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

import { addMinutes, toCalendarDate } from "@/features/calendar/lib/dates";
import {
  categoryIdForLegacyColor,
  defaultCalendarCategories,
  isCalendarCategoryColor,
} from "@/features/calendar/lib/categories";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

import { initialCalendarEvents } from "./seed";
import type {
  CalendarCategory,
  CalendarEvent,
  NewCalendarEvent,
} from "./types";

type CalendarContextValue = {
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

type StoredCalendarEvent = Omit<CalendarEvent, "categoryId"> & {
  categoryId?: string;
  color?: unknown;
};

function readStoredEvents(): CalendarEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return (JSON.parse(stored) as StoredCalendarEvent[]).map((event) => {
        const { color, ...currentEvent } = event;
        return {
          ...currentEvent,
          categoryId:
            event.categoryId || categoryIdForLegacyColor(color),
        } as CalendarEvent;
      });
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
  const { data: session } = authClient.useSession();
  const [categories, setCategories] =
    useState<CalendarCategory[]>(readStoredCategories);
  const [events, setEvents] = useState<CalendarEvent[]>(readStoredEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id ?? null;
    let cancelled = false;
    if (userId) {
      void Promise.all([
        apiRequest<{ events: CalendarEvent[] }>("/api/calendar-events"),
        apiRequest<{ categories: CalendarCategory[] }>(
          "/api/calendar-categories",
        ),
      ]).then(
        ([{ events: remoteEvents }, { categories: remoteCategories }]) => {
          if (!cancelled) {
            setEvents(remoteEvents);
            setCategories(remoteCategories);
            setSelectedEventId(null);
          }
        },
        () => {
          // Keep the local snapshot visible while the API is unavailable.
        },
      );
    } else if (previousUserId.current) {
      setEvents(readStoredEvents());
      setCategories(readStoredCategories());
      setSelectedEventId(null);
    }
    previousUserId.current = userId;
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (session) return;
    const timeout = window.setTimeout(() => writeStoredEvents(events), WRITE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [events, session]);

  useEffect(() => {
    if (session) return;
    const timeout = window.setTimeout(
      () => writeStoredCategories(categories),
      WRITE_DELAY,
    );
    return () => window.clearTimeout(timeout);
  }, [categories, session]);

  const persistNewEvent = useCallback(
    (optimisticEvent: CalendarEvent, input: NewCalendarEvent) => {
      if (!session) return;
      void apiRequest<{ event: CalendarEvent }>("/api/calendar-events", {
        method: "POST",
        body: JSON.stringify(input),
      }).then(
        ({ event: savedEvent }) => {
          setEvents((current) =>
            current.map((item) => (item.id === optimisticEvent.id ? savedEvent : item)),
          );
          setSelectedEventId((current) =>
            current === optimisticEvent.id ? savedEvent.id : current,
          );
        },
        () => {
          // The optimistic event remains available locally.
        },
      );
    },
    [session],
  );

  const addEvent = useCallback(
    (input: NewCalendarEvent) => {
      const event: CalendarEvent = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date().toISOString(),
      };
      setEvents((current) => [...current, event]);
      setSelectedEventId(event.id);
      persistNewEvent(event, input);
      return event;
    },
    [persistNewEvent],
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<CalendarEvent>) => {
      setEvents((current) =>
        current.map((event) => (event.id === id ? { ...event, ...patch } : event)),
      );
      if (session) {
        const allowedPatch = {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.startAt !== undefined ? { startAt: patch.startAt } : {}),
          ...(patch.endAt !== undefined ? { endAt: patch.endAt } : {}),
          ...(patch.categoryId !== undefined
            ? { categoryId: patch.categoryId }
            : {}),
          ...(patch.location !== undefined ? { location: patch.location } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        };
        if (Object.keys(allowedPatch).length > 0) {
          void apiRequest(`/api/calendar-events/${id}`, {
            method: "PATCH",
            body: JSON.stringify(allowedPatch),
          }).catch(() => {
            // Optimistic edits remain visible if the sync fails.
          });
        }
      }
    },
    [session],
  );

  const removeEvent = useCallback(
    (id: string) => {
      const event = events.find((item) => item.id === id) ?? null;
      setEvents((current) => current.filter((item) => item.id !== id));
      setSelectedEventId((current) => (current === id ? null : current));
      if (session) {
        void apiRequest(`/api/calendar-events/${id}`, { method: "DELETE" }).catch(() => {
          // Undo remains available in the UI.
        });
      }
      return event;
    },
    [events, session],
  );

  const restoreEvent = useCallback(
    (event: CalendarEvent) => {
      setEvents((current) => [...current, event]);
      persistNewEvent(event, {
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        categoryId: event.categoryId,
        location: event.location,
        notes: event.notes,
      });
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
      setCategories((current) => [...current, category]);
      if (session) {
        void apiRequest("/api/calendar-categories", {
          method: "POST",
          body: JSON.stringify(category),
        }).catch(() => {
          // The optimistic category remains available locally.
        });
      }
      return category;
    },
    [categories, session],
  );

  const updateCategory = useCallback(
    (
      id: string,
      patch: Partial<Pick<CalendarCategory, "name" | "color" | "position">>,
    ) => {
      setCategories((current) =>
        current.map((category) =>
          category.id === id ? { ...category, ...patch } : category,
        ),
      );
      if (session && Object.keys(patch).length > 0) {
        void apiRequest(`/api/calendar-categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }).catch(() => {
          // Optimistic edits remain visible if sync fails.
        });
      }
    },
    [session],
  );

  const removeCategory = useCallback(
    (id: string) => {
      if (categories.length <= 1) return false;
      const replacement = categories.find((category) => category.id !== id);
      if (!replacement || !categories.some((category) => category.id === id)) {
        return false;
      }

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
        void apiRequest(`/api/calendar-categories/${id}`, {
          method: "DELETE",
        }).catch(() => {
          // The local category organization remains usable if sync fails.
        });
      }
      return true;
    },
    [categories, session],
  );

  const value = useMemo(
    () => ({
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
