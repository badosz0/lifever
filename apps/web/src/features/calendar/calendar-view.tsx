import { CalendarPlus, ChevronLeft, ChevronRight, Menu, PanelLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppSettingsButton } from "@/components/app-shell/app-settings-button";
import { Button } from "@/components/ui/button";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { CalendarGrid } from "@/features/calendar/components/calendar-grid";
import { CalendarMonthGrid } from "@/features/calendar/components/calendar-month-grid";
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
    categories,
    events,
    isReady,
    selectedEventId,
    setSelectedEventId,
    updateEvent,
  } = useCalendar();
  const { dateFormat } = useUserPreferences();
  const [viewMode, setViewMode] = useState<CalendarViewMode>(readViewMode);
  const [selectedDate, setSelectedDate] = useState(() => startOfLocalDay(new Date()));
  const defaultRange = getDefaultEventRange();
  const [draftRange, setDraftRange] = useState(defaultRange);
  const [eventPreview, setEventPreview] =
    useState<CalendarEventPreview | null>(null);
  const [composerSession, setComposerSession] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const days = useMemo(() => {
    if (viewMode === "year" || viewMode === "month") return [];
    if (viewMode === "day") return [startOfLocalDay(selectedDate)];
    const monday = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }, [selectedDate, viewMode]);
  const visibleEventCount = useMemo(() => {
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

    return events.filter((event) =>
      intervalOverlapsRange(
        event.startAt,
        event.endAt,
        rangeStart,
        rangeEnd,
      ),
    ).length;
  }, [events, selectedDate, viewMode]);

  const openComposer = useCallback(
    (start?: Date, end?: Date) => {
      if (!isReady) return;
      let nextRange;
      if (start && end) {
        nextRange = { start, end };
      } else {
        const base = isSameLocalDay(selectedDate, new Date())
          ? new Date()
          : setCalendarTime(selectedDate, 9);
        nextRange = getDefaultEventRange(base);
      }
      setDraftRange(nextRange);
      setEventPreview({
        categoryId: getCalendarCategory(categories, null).id,
        end: nextRange.end,
        start: nextRange.start,
        title: "",
      });
      setComposerSession((current) => current + 1);
      setSelectedEventId(null);
      setComposerOpen(true);
    },
    [categories, isReady, selectedDate, setSelectedEventId],
  );

  useEffect(() => {
    try {
      localStorage.setItem("lifever-calendar-view", viewMode);
    } catch {
      // The view remains available for the current session.
    }
  }, [viewMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']");
      if (
        event.key.toLowerCase() === "n" &&
        !event.altKey &&
        ((event.metaKey || event.ctrlKey) || !isTyping)
      ) {
        event.preventDefault();
        openComposer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openComposer]);

  const navigate = (direction: -1 | 1) => {
    setSelectedDate((current) =>
      viewMode === "year"
        ? addYears(current, direction)
        : viewMode === "month"
        ? addMonths(current, direction)
        : addDays(current, direction * (viewMode === "week" ? 7 : 1)),
    );
    setSelectedEventId(null);
  };

  const showDay = (day: Date) => {
    setSelectedDate(startOfLocalDay(day));
    if (viewMode !== "day") setViewMode("day");
  };

  const showMonth = (month: Date) => {
    setSelectedDate(startOfLocalDay(month));
    setViewMode("month");
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="scroll-edge relative z-40 shrink-0 bg-background/86 px-4 pt-3 pb-3 backdrop-blur-xl sm:px-6 sm:pt-5 sm:pb-4">
        <div className="flex min-h-9 items-center gap-1.5">
          <ShortcutTooltip label="Toggle Sidebar" shortcut={["⌘", "\\"]}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-muted-foreground md:inline-flex"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          </ShortcutTooltip>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground md:hidden"
            onClick={onOpenMobileSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>

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
            {(["year", "month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
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
            ))}
          </div>
          <AppSettingsButton
            label="Calendar settings"
            onClick={() => setSettingsOpen(true)}
            disabled={!isReady}
          />
          <ShortcutTooltip label="New Event" shortcut={["⌘", "N"]}>
            <Button size="icon-sm" className="size-8 rounded-full" onClick={() => openComposer()} disabled={!isReady} aria-label="New event">
              <CalendarPlus className="size-3.5" strokeWidth={2.4} />
            </Button>
          </ShortcutTooltip>
        </div>

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
      </header>

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
          onSelectEvent={setSelectedEventId}
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
          onSelectEvent={setSelectedEventId}
          onMoveEvent={(id, startAt, endAt) =>
            updateEvent(id, { startAt, endAt })
          }
          onCreateAt={(start, end) => openComposer(start, end)}
          onSelectDay={showDay}
        />
      )}

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
