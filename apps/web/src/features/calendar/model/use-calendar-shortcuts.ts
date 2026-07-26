import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  addDays,
  addMinutes,
  startOfLocalDay,
  toCalendarDate,
} from "@/features/calendar/lib/dates";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { useCalendarEventActions } from "@/features/calendar/model/use-calendar-event-actions";
import type {
  CalendarEvent,
  CalendarViewMode,
} from "@/features/calendar/model/types";

export const calendarViewShortcuts: Record<CalendarViewMode, string> = {
  year: "Y",
  month: "M",
  week: "W",
  day: "D",
};

export const calendarViews: CalendarViewMode[] = [
  "year",
  "month",
  "week",
  "day",
];

type CalendarShortcut =
  | { type: "delete-event" }
  | { type: "deselect-event" }
  | { type: "duplicate-event" }
  | { type: "move-event"; dayDelta: number; minuteDelta: number }
  | { type: "navigate-period"; direction: -1 | 1 }
  | { type: "new-event" }
  | { type: "select-event"; direction: -1 | 1 }
  | { type: "set-view"; viewMode: CalendarViewMode }
  | { type: "undo" };

type KeyboardLayoutMapLike = {
  get: (code: string) => string | undefined;
};

type NavigatorKeyboardLike = {
  getLayoutMap?: () => Promise<KeyboardLayoutMapLike>;
};

type CalendarShortcutsOptions = {
  calendarViewRef: RefObject<HTMLElement | null>;
  navigate: (direction: -1 | 1) => void;
  openComposer: () => void;
  selectedDate: Date;
  setSelectedDate: Dispatch<SetStateAction<Date>>;
  setViewMode: Dispatch<SetStateAction<CalendarViewMode>>;
  viewMode: CalendarViewMode;
  visibleRange: { start: Date; end: Date };
};

// Option can turn these keys into typographic symbols (for example ± and –).
// The layout map recovers the unmodified key when the browser supports it.
const PLUS_KEYS = new Set(["+", "＋", "±"]);
const MINUS_KEYS = new Set(["-", "−", "–", "—", "‑", "﹣", "－"]);

const compareCalendarEvents = (left: CalendarEvent, right: CalendarEvent) =>
  Date.parse(left.startAt) - Date.parse(right.startAt) ||
  Date.parse(left.endAt) - Date.parse(right.endAt) ||
  left.createdAt.localeCompare(right.createdAt) ||
  left.id.localeCompare(right.id);

const isPlusKey = (
  event: KeyboardEvent,
  layoutMap: KeyboardLayoutMapLike | null,
) => {
  if (event.code === "NumpadAdd" || PLUS_KEYS.has(event.key)) return true;
  const layoutKey = layoutMap?.get(event.code);
  return layoutKey === "+" || (layoutKey === "=" && event.shiftKey);
};

const isMinusKey = (
  event: KeyboardEvent,
  layoutMap: KeyboardLayoutMapLike | null,
) => {
  if (event.code === "NumpadSubtract" || MINUS_KEYS.has(event.key)) return true;
  return layoutMap?.get(event.code) === "-";
};

const resolveCalendarShortcut = (
  event: KeyboardEvent,
  {
    isInOverlay,
    isTyping,
    layoutMap,
  }: {
    isInOverlay: boolean;
    isTyping: boolean;
    layoutMap: KeyboardLayoutMapLike | null;
  },
): CalendarShortcut | null => {
  if (event.defaultPrevented || isInOverlay) return null;

  const commandPressed = event.metaKey || event.ctrlKey;
  const key = event.key.toLowerCase();

  if (event.key === "Escape") return { type: "deselect-event" };

  if (
    commandPressed &&
    !event.altKey &&
    !event.shiftKey &&
    key === "n"
  ) {
    return { type: "new-event" };
  }

  if (isTyping) return null;

  if (event.altKey && !commandPressed) {
    if (!event.shiftKey && event.key === "ArrowLeft") {
      return { type: "move-event", dayDelta: -1, minuteDelta: 0 };
    }
    if (!event.shiftKey && event.key === "ArrowRight") {
      return { type: "move-event", dayDelta: 1, minuteDelta: 0 };
    }
    if (!event.shiftKey && event.key === "ArrowUp") {
      return { type: "move-event", dayDelta: 0, minuteDelta: -15 };
    }
    if (!event.shiftKey && event.key === "ArrowDown") {
      return { type: "move-event", dayDelta: 0, minuteDelta: 15 };
    }
    if (isPlusKey(event, layoutMap)) {
      return { type: "move-event", dayDelta: 0, minuteDelta: 1 };
    }
    if (!event.shiftKey && isMinusKey(event, layoutMap)) {
      return { type: "move-event", dayDelta: 0, minuteDelta: -1 };
    }
    return null;
  }

  if (commandPressed) {
    if (event.altKey || event.shiftKey) return null;
    if (key === "d") return { type: "duplicate-event" };
    if (key === "z") return { type: "undo" };
    return null;
  }

  if (!event.shiftKey && event.key === "ArrowLeft") {
    return { type: "navigate-period", direction: -1 };
  }
  if (!event.shiftKey && event.key === "ArrowRight") {
    return { type: "navigate-period", direction: 1 };
  }
  if (!event.shiftKey && event.key === "Backspace") {
    return { type: "delete-event" };
  }
  if (!event.shiftKey && key === "p") {
    return { type: "select-event", direction: -1 };
  }
  if (!event.shiftKey && key === "n") {
    return { type: "select-event", direction: 1 };
  }

  const shortcutView = calendarViews.find(
    (viewMode) => calendarViewShortcuts[viewMode].toLowerCase() === key,
  );
  return shortcutView
    ? { type: "set-view", viewMode: shortcutView }
    : null;
};

export function useCalendarShortcuts({
  calendarViewRef,
  navigate,
  openComposer,
  selectedDate,
  setSelectedDate,
  setViewMode,
  viewMode,
  visibleRange,
}: CalendarShortcutsOptions) {
  const {
    events,
    registerEventUndo,
    selectedEventId,
    setSelectedEventId,
    undoLastEventAction,
    updateEvent,
  } = useCalendar();
  const { deleteCalendarEvent, duplicateCalendarEvent } =
    useCalendarEventActions();
  const keyboardLayoutMapRef = useRef<KeyboardLayoutMapLike | null>(null);
  const lastSelectedEventRef = useRef<CalendarEvent | null>(null);
  const orderedEvents = useMemo(
    () => [...events].sort(compareCalendarEvents),
    [events],
  );

  useEffect(() => {
    let active = true;
    const refreshLayoutMap = () => {
      const keyboard = (
        navigator as Navigator & { keyboard?: NavigatorKeyboardLike }
      ).keyboard;
      if (!keyboard?.getLayoutMap) {
        keyboardLayoutMapRef.current = null;
        return;
      }
      void keyboard
        .getLayoutMap()
        .then((layoutMap) => {
          if (active) keyboardLayoutMapRef.current = layoutMap;
        })
        .catch(() => {
          if (active) keyboardLayoutMapRef.current = null;
        });
    };

    refreshLayoutMap();
    window.addEventListener("focus", refreshLayoutMap);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshLayoutMap);
    };
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    const selectedEvent = events.find((event) => event.id === selectedEventId);
    if (selectedEvent) lastSelectedEventRef.current = selectedEvent;

    const frame = window.requestAnimationFrame(() => {
      const selectedElement = [
        ...(calendarViewRef.current?.querySelectorAll<HTMLElement>(
          "[data-calendar-event-id]",
        ) ?? []),
      ].find(
        (element) => element.dataset.calendarEventId === selectedEventId,
      );
      selectedElement?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [calendarViewRef, events, selectedDate, selectedEventId, viewMode]);

  const selectEvent = useCallback(
    (id: string) => {
      const calendarEvent = events.find((event) => event.id === id);
      if (calendarEvent) lastSelectedEventRef.current = calendarEvent;
      setSelectedEventId(id);
    },
    [events, setSelectedEventId],
  );

  const selectAdjacentEvent = useCallback(
    (direction: -1 | 1) => {
      if (orderedEvents.length === 0) return false;

      const selectedEvent = selectedEventId
        ? orderedEvents.find((event) => event.id === selectedEventId)
        : null;
      const anchor = lastSelectedEventRef.current ?? selectedEvent;
      let nextEvent: CalendarEvent | undefined;

      if (anchor) {
        const anchorIndex = orderedEvents.findIndex(
          (event) => event.id === anchor.id,
        );
        if (anchorIndex >= 0) {
          nextEvent = orderedEvents[anchorIndex + direction];
        } else if (direction === 1) {
          nextEvent = orderedEvents.find(
            (event) => compareCalendarEvents(event, anchor) > 0,
          );
        } else {
          nextEvent = [...orderedEvents]
            .reverse()
            .find((event) => compareCalendarEvents(event, anchor) < 0);
        }
      } else if (direction === 1) {
        nextEvent = orderedEvents.find(
          (event) => Date.parse(event.endAt) > visibleRange.start.getTime(),
        );
      } else {
        nextEvent = [...orderedEvents]
          .reverse()
          .find(
            (event) =>
              Date.parse(event.startAt) < visibleRange.end.getTime(),
          );
      }

      if (!nextEvent) return false;
      lastSelectedEventRef.current = nextEvent;
      setSelectedEventId(nextEvent.id);
      setSelectedDate(startOfLocalDay(toCalendarDate(nextEvent.startAt)));
      return true;
    },
    [
      orderedEvents,
      selectedEventId,
      setSelectedDate,
      setSelectedEventId,
      visibleRange,
    ],
  );

  const moveCalendarEvent = useCallback(
    (calendarEvent: CalendarEvent, dayDelta: number, minuteDelta: number) => {
      if (
        calendarEvent.readOnly ||
        (calendarEvent.allDay && minuteDelta !== 0)
      ) {
        return;
      }

      const previousStartAt = calendarEvent.startAt;
      const previousEndAt = calendarEvent.endAt;
      const nextStart = addMinutes(
        addDays(toCalendarDate(previousStartAt), dayDelta),
        minuteDelta,
      );
      const nextEnd = addMinutes(
        addDays(toCalendarDate(previousEndAt), dayDelta),
        minuteDelta,
      );
      const nextStartAt = nextStart.toISOString();
      const nextEndAt = nextEnd.toISOString();
      const movedEvent = {
        ...calendarEvent,
        startAt: nextStartAt,
        endAt: nextEndAt,
      };

      updateEvent(calendarEvent.id, {
        startAt: nextStartAt,
        endAt: nextEndAt,
      });
      lastSelectedEventRef.current = movedEvent;
      setSelectedDate(startOfLocalDay(nextStart));
      registerEventUndo(() => {
        updateEvent(calendarEvent.id, {
          startAt: previousStartAt,
          endAt: previousEndAt,
        });
        lastSelectedEventRef.current = calendarEvent;
        setSelectedEventId(calendarEvent.id);
        setSelectedDate(startOfLocalDay(toCalendarDate(previousStartAt)));
      });
    },
    [
      registerEventUndo,
      setSelectedDate,
      setSelectedEventId,
      updateEvent,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(
        target?.closest(
          "input, textarea, select, [contenteditable='true']",
        ),
      );
      const isInOverlay = Boolean(
        target?.closest('[role="dialog"], [role="menu"], [role="listbox"]'),
      );
      const shortcut = resolveCalendarShortcut(event, {
        isInOverlay,
        isTyping,
        layoutMap: keyboardLayoutMapRef.current,
      });
      if (!shortcut) return;

      const storedSelectedEvent = events.find(
        (calendarEvent) => calendarEvent.id === selectedEventId,
      );
      const selectedEvent =
        lastSelectedEventRef.current?.id === selectedEventId
          ? lastSelectedEventRef.current
          : storedSelectedEvent;

      switch (shortcut.type) {
        case "deselect-event":
          if (!selectedEventId) return;
          event.preventDefault();
          if (isTyping) target?.blur();
          setSelectedEventId(null);
          return;
        case "move-event":
          if (!selectedEvent) return;
          event.preventDefault();
          moveCalendarEvent(
            selectedEvent,
            shortcut.dayDelta,
            shortcut.minuteDelta,
          );
          return;
        case "navigate-period":
          event.preventDefault();
          navigate(shortcut.direction);
          return;
        case "duplicate-event":
          if (!selectedEvent || selectedEvent.readOnly) return;
          event.preventDefault();
          duplicateCalendarEvent(selectedEvent.id);
          return;
        case "delete-event":
          if (!selectedEvent || selectedEvent.readOnly) return;
          event.preventDefault();
          deleteCalendarEvent(selectedEvent.id);
          return;
        case "undo":
          if (!undoLastEventAction()) return;
          event.preventDefault();
          return;
        case "select-event":
          if (!selectAdjacentEvent(shortcut.direction)) return;
          event.preventDefault();
          return;
        case "set-view":
          event.preventDefault();
          setViewMode(shortcut.viewMode);
          return;
        case "new-event":
          event.preventDefault();
          openComposer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    deleteCalendarEvent,
    duplicateCalendarEvent,
    events,
    moveCalendarEvent,
    navigate,
    openComposer,
    selectAdjacentEvent,
    selectedEventId,
    setSelectedEventId,
    setViewMode,
    undoLastEventAction,
  ]);

  return { selectEvent };
}
