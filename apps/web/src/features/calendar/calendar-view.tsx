import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AppHeader,
  AppHeaderToolbar,
} from "@/components/app-shell/app-header";
import { AppSettingsButton } from "@/components/app-shell/app-settings-button";
import { Button } from "@/components/ui/button";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { LiveCursorSurface } from "@/features/collaboration/components/live-cursor-surface";
import { CalendarGrid } from "@/features/calendar/components/calendar-grid";
import { CalendarMonthGrid } from "@/features/calendar/components/calendar-month-grid";
import { CalendarPicker } from "@/features/calendar/components/calendar-picker";
import { CalendarSettingsDialog } from "@/features/calendar/components/calendar-settings-dialog";
import { CalendarYearGrid } from "@/features/calendar/components/calendar-year-grid";
import { NewCalendarEventDialog } from "@/features/calendar/components/new-calendar-event-dialog";
import {
  addDays,
  addMonths,
  addYears,
  formatCalendarTitle,
  formatWeekday,
  getDefaultEventRange,
  isSameLocalDay,
  setCalendarTime,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalYear,
  startOfWeek,
} from "@/features/calendar/lib/dates";
import { getCalendarCategory } from "@/features/calendar/lib/categories";
import { intervalOverlapsRange } from "@/features/calendar/lib/event-segments";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import {
  calendarViews,
  calendarViewShortcuts,
  useCalendarShortcuts,
} from "@/features/calendar/model/use-calendar-shortcuts";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import type {
  CalendarEventPreview,
  CalendarViewMode,
} from "@/features/calendar/model/types";
import { cn } from "@/lib/cn";

type CalendarViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

const readViewMode = (): CalendarViewMode => {
  try {
    const storedMode = localStorage.getItem("lifever-calendar-view");
    return storedMode === "year" || storedMode === "month" || storedMode === "day"
      ? storedMode
      : "week";
  } catch {
    return "week";
  }
};

export function CalendarView({
  onOpenMobileSidebar,
  onToggleSidebar,
}: CalendarViewProps) {
  const {
    activeCalendarId,
    calendars,
    categories,
    events,
    isReady,
    selectedEventId,
    liveCollaborators,
    setSelectedEventId,
    setVisibleEventRange,
    updateLiveCursor,
    updateEvent,
  } = useCalendar();
  const { calendarClickToCreate, dateFormat } = useUserPreferences();
  const [viewMode, setViewMode] = useState<CalendarViewMode>(readViewMode);
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const defaultRange = getDefaultEventRange();
  const [draftRange, setDraftRange] = useState(defaultRange);
  const [eventPreview, setEventPreview] =
    useState<CalendarEventPreview | null>(null);
  const [composerSession, setComposerSession] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const calendarViewRef = useRef<HTMLElement>(null);

  const days = useMemo(() => {
    if (viewMode === "year" || viewMode === "month") return [];
    if (viewMode === "day") return [startOfLocalDay(selectedDate)];
    const monday = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }, [selectedDate, viewMode]);
  const visibleRange = useMemo(() => {
    const rangeStart =
      viewMode === "year"
        ? startOfLocalYear(selectedDate)
        : viewMode === "month"
          ? startOfLocalMonth(selectedDate)
          : viewMode === "week"
            ? startOfWeek(selectedDate)
            : startOfLocalDay(selectedDate);
    const rangeEnd =
      viewMode === "year"
        ? addYears(rangeStart, 1)
        : viewMode === "month"
          ? addMonths(rangeStart, 1)
          : addDays(rangeStart, viewMode === "week" ? 7 : 1);

    return { start: rangeStart, end: rangeEnd };
  }, [selectedDate, viewMode]);
  const visibleEventCount = useMemo(() => {
    return events.filter((event) =>
      intervalOverlapsRange(
        event.startAt,
        event.endAt,
        visibleRange.start,
        visibleRange.end,
      ),
    ).length;
  }, [events, visibleRange]);
  useEffect(() => {
    setVisibleEventRange(visibleRange.start, visibleRange.end);
  }, [setVisibleEventRange, visibleRange]);

  const openComposer = useCallback(
    (start?: Date, end?: Date) => {
      if (!isReady || selectedEventId) return;
      let nextRange;
      if (start && end) {
        nextRange = { start, end };
      } else {
        const base = isSameLocalDay(selectedDate, new Date())
          ? new Date()
          : setCalendarTime(selectedDate, 9);
        nextRange = getDefaultEventRange(base);
      }
      const destinationCalendarId =
        activeCalendarId ??
        calendars.find((calendar) => calendar.writable)?.id ??
        "";
      setDraftRange(nextRange);
      setEventPreview({
        calendarId: destinationCalendarId,
        categoryId: getCalendarCategory(
          categories,
          null,
          destinationCalendarId,
        ).id,
        end: nextRange.end,
        start: nextRange.start,
        title: "",
      });
      setComposerSession((current) => current + 1);
      setSelectedEventId(null);
      setComposerOpen(true);
    },
    [
      activeCalendarId,
      calendars,
      categories,
      isReady,
      selectedDate,
      selectedEventId,
      setSelectedEventId,
    ],
  );

  const navigate = useCallback(
    (direction: -1 | 1) => {
      setSelectedDate((current) =>
        viewMode === "year"
          ? addYears(current, direction)
          : viewMode === "month"
            ? addMonths(current, direction)
            : addDays(current, direction * (viewMode === "week" ? 7 : 1)),
      );
      setSelectedEventId(null);
    },
    [setSelectedEventId, viewMode],
  );

  const { selectEvent } = useCalendarShortcuts({
    calendarViewRef,
    navigate,
    openComposer,
    selectedDate,
    setSelectedDate,
    setViewMode,
    viewMode,
    visibleRange,
  });

  useEffect(() => {
    try {
      localStorage.setItem("lifever-calendar-view", viewMode);
    } catch {
      // The view remains available for the current session.
    }
  }, [viewMode]);

  const showDay = (day: Date) => {
    setSelectedDate(startOfLocalDay(day));
    if (viewMode !== "day") setViewMode("day");
  };

  const showMonth = (month: Date) => {
    setSelectedDate(startOfLocalDay(month));
    setViewMode("month");
  };

  return (
    <main
      ref={calendarViewRef}
      className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background"
    >
      <AppHeader elevated>
        <AppHeaderToolbar
          onOpenMobileSidebar={onOpenMobileSidebar}
          onToggleSidebar={onToggleSidebar}
        >
          <CalendarPicker onManage={() => setSettingsOpen(true)} />
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[12px]" onClick={() => setSelectedDate(startOfLocalDay(new Date()))}>
            Today
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" onClick={() => navigate(-1)} aria-label={`Previous ${viewMode}`}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" onClick={() => navigate(1)} aria-label={`Next ${viewMode}`}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex-1" />
          <div className="flex h-8 items-center rounded-lg bg-muted p-0.5" aria-label="Calendar view">
            {calendarViews.map((mode) => (
              <ShortcutTooltip
                key={mode}
                label={`${mode.charAt(0).toUpperCase()}${mode.slice(1)} view`}
                shortcut={[calendarViewShortcuts[mode]]}
              >
                <button
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[11px] font-semibold capitalize outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                    viewMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={viewMode === mode}
                >
                  {mode}
                </button>
              </ShortcutTooltip>
            ))}
          </div>
          <AppSettingsButton
            label="Calendar settings"
            onClick={() => setSettingsOpen(true)}
            disabled={!isReady}
          />
          <ShortcutTooltip label="New Event" shortcut={["⌘", "N"]}>
            <Button size="icon-sm" className="size-8 rounded-full" onClick={() => openComposer()} disabled={!isReady || Boolean(selectedEventId)} aria-label="New event">
              <CalendarPlus className="size-3.5" strokeWidth={2.4} />
            </Button>
          </ShortcutTooltip>
        </AppHeaderToolbar>

        <div className="mt-5 flex items-end gap-3 px-1 sm:mt-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[27px] leading-[1.1] font-bold tracking-[-0.035em] sm:text-[31px]">
              {formatCalendarTitle(selectedDate, viewMode, dateFormat)}
            </h1>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              {viewMode === "year"
                ? `${visibleEventCount} events · Select a month or day to open it`
                : viewMode === "month"
                ? `${visibleEventCount} events · Drag events between days`
                : viewMode === "week"
                  ? "Drag events across the week to reschedule"
                  : `${visibleEventCount} events · ${isSameLocalDay(selectedDate, new Date()) ? "Today" : formatWeekday(selectedDate)}`}
            </p>
          </div>
        </div>
      </AppHeader>

      <LiveCursorSurface
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        peers={liveCollaborators}
        onCursorChange={updateLiveCursor}
      >
        {viewMode === "year" ? (
          <CalendarYearGrid
            year={selectedDate}
            selectedDate={selectedDate}
            events={events}
            newEventPreview={composerOpen ? eventPreview : null}
            onSelectDay={showDay}
            onSelectMonth={showMonth}
          />
        ) : viewMode === "month" ? (
          <CalendarMonthGrid
            month={selectedDate}
            events={events}
            newEventPreview={composerOpen ? eventPreview : null}
            selectedEventId={selectedEventId}
            onClearSelection={() => setSelectedEventId(null)}
            onSelectEvent={selectEvent}
            onMoveEvent={(id, startAt, endAt) =>
              updateEvent(id, { startAt, endAt })
            }
            onCreateAt={(start, end) => openComposer(start, end)}
            onSelectDay={showDay}
          />
        ) : (
          <CalendarGrid
            days={days}
            events={events}
            newEventPreview={composerOpen ? eventPreview : null}
            selectedEventId={selectedEventId}
            clickToCreateEnabled={calendarClickToCreate}
            onClearSelection={() => setSelectedEventId(null)}
            onSelectEvent={selectEvent}
            onMoveEvent={(id, startAt, endAt) =>
              updateEvent(id, { startAt, endAt })
            }
            onCreateAt={(start, end) => openComposer(start, end)}
            onSelectDay={showDay}
          />
        )}
      </LiveCursorSurface>

      <NewCalendarEventDialog
        key={composerSession}
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) setEventPreview(null);
        }}
        onDraftChange={setEventPreview}
        initialStart={draftRange.start}
        initialEnd={draftRange.end}
      />
      <CalendarSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </main>
  );
}
