import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CalendarCurrentTimeLine } from "@/features/calendar/components/calendar-current-time-line";
import { CalendarEventBlock } from "@/features/calendar/components/calendar-event-block";
import { CalendarEventContextMenu } from "@/features/calendar/components/calendar-event-context-menu";
import { CalendarEventDraft } from "@/features/calendar/components/calendar-event-draft";
import {
  dateKey,
  DEFAULT_HOUR_HEIGHT,
  durationInMinutes,
  formatDayOfMonth,
  formatFullDay,
  formatHour,
  formatShortWeekday,
  formatTime,
  HOUR_END,
  HOUR_START,
  isSameLocalDay,
  minutesIntoDay,
  setMinutesIntoDay,
  SNAP_MINUTES,
} from "@/features/calendar/lib/dates";
import {
  getCalendarEventSegment,
  getCalendarIntervalSegment,
} from "@/features/calendar/lib/event-segments";
import {
  getCalendarDraftRange,
  minuteAtCalendarPosition,
} from "@/features/calendar/lib/draft-range";
import { layoutOverlappingEvents } from "@/features/calendar/lib/layout-events";
import {
  getCalendarCategory,
  getCalendarCategoryStyle,
  getCalendarEventCategory,
  getCalendarPreviewCategory,
} from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type {
  CalendarEvent,
  CalendarEventPreview,
} from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { useCurrentTime } from "@/hooks/use-current-time";
import { cn } from "@/lib/cn";

type CalendarGridProps = {
  days: Date[];
  events: CalendarEvent[];
  newEventPreview: CalendarEventPreview | null;
  selectedEventId: string | null;
  clickToCreateEnabled: boolean;
  onClearSelection: () => void;
  onSelectEvent: (id: string) => void;
  onMoveEvent: (id: string, startAt: string, endAt: string) => void;
  onCreateAt: (start: Date, end: Date) => void;
  onSelectDay?: (day: Date) => void;
};

const hours = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, index) => HOUR_START + index,
);
const DAY_HEADER_HEIGHT = 54;
const ALL_DAY_EVENT_HEIGHT = 20;
const ALL_DAY_EVENT_GAP = 2;
const MAX_ALL_DAY_ROWS = 3;
const HOUR_COUNT = HOUR_END - HOUR_START;
const DEFAULT_VISIBLE_START_HOUR = 8;
const DEFAULT_VISIBLE_END_HOUR = 19;
const DEFAULT_VISIBLE_HOUR_COUNT =
  DEFAULT_VISIBLE_END_HOUR - DEFAULT_VISIBLE_START_HOUR;
const CALENDAR_ZOOM_STORAGE_KEY = "lifever-calendar-time-grid-zoom";
const LAYOUT_SAFETY_PX = 2;
const MAX_DEFAULT_EVENT_DURATION_MINUTES = 120;
const MAX_HOUR_HEIGHT = 240;
const MIN_RENDERED_HOUR_HEIGHT = 1;
const SCALE_EPSILON = 0.001;
const WHEEL_LINE_HEIGHT_PX = 16;
const ZOOM_SENSITIVITY = 0.004;
const DRAG_THRESHOLD_PX = 4;
const TRAILING_CLICK_GUARD_MS = 250;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const readStoredZoomScale = () => {
  try {
    const scale = Number(localStorage.getItem(CALENDAR_ZOOM_STORAGE_KEY));
    return Number.isFinite(scale) && scale >= 1 ? scale : null;
  } catch {
    return null;
  }
};

type DraftSelection = {
  anchorMinute: number;
  day: Date;
  dayKey: string;
  dragging: boolean;
  focusMinute: number;
  pointerId: number;
  startClientY: number;
};

type PendingZoom = {
  focalHour: number;
  hourHeight: number;
  viewportY: number;
};

export function CalendarGrid({
  days,
  events,
  newEventPreview,
  selectedEventId,
  clickToCreateEnabled,
  onClearSelection,
  onSelectEvent,
  onMoveEvent,
  onCreateAt,
  onSelectDay,
}: CalendarGridProps) {
  const { activeCalendarId, calendars, categories } = useCalendar();
  const { dateFormat, timeFormat } = useUserPreferences();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const draftSelectionRef = useRef<DraftSelection | null>(null);
  const suppressClickUntilRef = useRef(0);
  const initializedZoomRef = useRef(false);
  const minimumHourHeightRef = useRef(DEFAULT_HOUR_HEIGHT);
  const renderedHourHeightRef = useRef(DEFAULT_HOUR_HEIGHT);
  const targetHourHeightRef = useRef(DEFAULT_HOUR_HEIGHT);
  const pendingZoomRef = useRef<PendingZoom | null>(null);
  const [storedZoomScale] = useState(readStoredZoomScale);
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT);
  const [draftSelection, setDraftSelection] =
    useState<DraftSelection | null>(null);
  const totalHeight = HOUR_COUNT * hourHeight;
  const defaultEventDurationMinutes = clamp(
    Math.round(
      (MAX_DEFAULT_EVENT_DURATION_MINUTES *
        minimumHourHeightRef.current) /
        hourHeight /
        SNAP_MINUTES,
    ) * SNAP_MINUTES,
    SNAP_MINUTES,
    MAX_DEFAULT_EVENT_DURATION_MINUTES,
  );
  const now = useCurrentTime();
  const allDayEventsByDay = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<ReturnType<typeof getCalendarEventSegment>>[]
    >();
    for (const day of days) {
      const segments = events
        .filter((event) => event.allDay)
        .map((event) => getCalendarEventSegment(event, day))
        .filter(
          (
            segment,
          ): segment is NonNullable<
            ReturnType<typeof getCalendarEventSegment>
          > => Boolean(segment),
        );
      if (segments.length) map.set(dateKey(day), segments);
    }
    return map;
  }, [days, events]);
  const allDayRowCount = Math.min(
    MAX_ALL_DAY_ROWS,
    Math.max(0, ...[...allDayEventsByDay.values()].map((items) => items.length)),
  );
  const allDayHeight =
    allDayRowCount > 0
      ? allDayRowCount * ALL_DAY_EVENT_HEIGHT +
        (allDayRowCount - 1) * ALL_DAY_EVENT_GAP +
        8
      : 0;
  const stickyChromeHeight = DAY_HEADER_HEIGHT + allDayHeight;
  const eventSegmentsByDay = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<ReturnType<typeof getCalendarEventSegment>>[]
    >();
    for (const day of days) {
      const segments = events
        .filter((event) => !event.allDay)
        .map((event) => getCalendarEventSegment(event, day))
        .filter(
          (
            segment,
          ): segment is NonNullable<
            ReturnType<typeof getCalendarEventSegment>
          > => Boolean(segment),
        );
      if (segments.length > 0) {
        map.set(dateKey(day), segments);
      }
    }
    return map;
  }, [days, events]);

  const setZoomedHourHeight = useCallback(
    (nextHourHeight: number, viewportY: number) => {
      const scrollArea = scrollAreaRef.current;
      if (
        !scrollArea ||
        Math.abs(targetHourHeightRef.current - nextHourHeight) < SCALE_EPSILON
      ) {
        return;
      }

      const anchoredViewportY = clamp(
        viewportY,
        stickyChromeHeight,
        scrollArea.clientHeight,
      );
      const focalHour = clamp(
        (scrollArea.scrollTop + anchoredViewportY - stickyChromeHeight) /
          renderedHourHeightRef.current,
        0,
        HOUR_COUNT,
      );

      pendingZoomRef.current = {
        focalHour,
        hourHeight: nextHourHeight,
        viewportY: anchoredViewportY,
      };
      targetHourHeightRef.current = nextHourHeight;
      setHourHeight(nextHourHeight);
    },
    [stickyChromeHeight],
  );

  useLayoutEffect(() => {
    renderedHourHeightRef.current = hourHeight;
    const scrollArea = scrollAreaRef.current;
    const pendingZoom = pendingZoomRef.current;
    if (
      !scrollArea ||
      !pendingZoom ||
      Math.abs(pendingZoom.hourHeight - hourHeight) >= SCALE_EPSILON
    ) {
      return;
    }

    const nextScrollTop =
      pendingZoom.focalHour * hourHeight +
      stickyChromeHeight -
      pendingZoom.viewportY;
    scrollArea.scrollTop = clamp(
      nextScrollTop,
      0,
      Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight),
    );
    pendingZoomRef.current = null;
  }, [hourHeight, stickyChromeHeight]);

  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const updateMinimumScale = () => {
      const previousMinimum = minimumHourHeightRef.current;
      const nextMinimum = Math.max(
        MIN_RENDERED_HOUR_HEIGHT,
        (scrollArea.clientHeight - stickyChromeHeight - LAYOUT_SAFETY_PX) /
          HOUR_COUNT,
      );
      const maximum = Math.max(nextMinimum, MAX_HOUR_HEIGHT);

      if (!initializedZoomRef.current) {
        initializedZoomRef.current = true;
        minimumHourHeightRef.current = nextMinimum;
        const initialScale =
          storedZoomScale ?? HOUR_COUNT / DEFAULT_VISIBLE_HOUR_COUNT;
        const initialHourHeight = clamp(
          nextMinimum * initialScale,
          nextMinimum,
          maximum,
        );
        const initialFocalHour = DEFAULT_VISIBLE_START_HOUR - HOUR_START;

        targetHourHeightRef.current = initialHourHeight;
        if (
          Math.abs(renderedHourHeightRef.current - initialHourHeight) <
          SCALE_EPSILON
        ) {
          scrollArea.scrollTop = initialFocalHour * initialHourHeight;
        } else {
          pendingZoomRef.current = {
            focalHour: initialFocalHour,
            hourHeight: initialHourHeight,
            viewportY: stickyChromeHeight,
          };
          setHourHeight(initialHourHeight);
        }
        return;
      }

      const currentScale =
        targetHourHeightRef.current / previousMinimum;
      const nextTarget = clamp(
        nextMinimum * currentScale,
        nextMinimum,
        maximum,
      );

      minimumHourHeightRef.current = nextMinimum;
      setZoomedHourHeight(nextTarget, scrollArea.clientHeight / 2);
    };

    updateMinimumScale();
    const observer = new ResizeObserver(updateMinimumScale);
    observer.observe(scrollArea);
    return () => observer.disconnect();
  }, [setZoomedHourHeight, stickyChromeHeight, storedZoomScale]);

  useEffect(() => {
    if (
      !initializedZoomRef.current ||
      Math.abs(targetHourHeightRef.current - hourHeight) >= SCALE_EPSILON
    ) {
      return;
    }

    try {
      const zoomScale = hourHeight / minimumHourHeightRef.current;
      localStorage.setItem(CALENDAR_ZOOM_STORAGE_KEY, String(zoomScale));
    } catch {
      // Keep zoom available for the current calendar session.
    }
  }, [hourHeight]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();

      const deltaPixels =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * WHEEL_LINE_HEIGHT_PX
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? event.deltaY * scrollArea.clientHeight
            : event.deltaY;
      const minimum = minimumHourHeightRef.current;
      const maximum = Math.max(minimum, MAX_HOUR_HEIGHT);
      const nextHourHeight = clamp(
        targetHourHeightRef.current *
          Math.exp(-deltaPixels * ZOOM_SENSITIVITY),
        minimum,
        maximum,
      );
      const rect = scrollArea.getBoundingClientRect();
      setZoomedHourHeight(nextHourHeight, event.clientY - rect.top);
    };

    scrollArea.addEventListener("wheel", handleWheel, { passive: false });
    return () => scrollArea.removeEventListener("wheel", handleWheel);
  }, [setZoomedHourHeight]);

  const beginDraftSelection = (
    pointerEvent: PointerEvent<HTMLDivElement>,
    day: Date,
  ) => {
    if (
      selectedEventId ||
      pointerEvent.target !== pointerEvent.currentTarget ||
      pointerEvent.button !== 0 ||
      pointerEvent.pointerType === "touch"
    ) {
      return;
    }

    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    const anchorMinute = minuteAtCalendarPosition(
      pointerEvent.clientY - rect.top,
      hourHeight,
      { rounding: "floor" },
    );
    const selection: DraftSelection = {
      anchorMinute,
      day,
      dayKey: dateKey(day),
      dragging: false,
      focusMinute: anchorMinute,
      pointerId: pointerEvent.pointerId,
      startClientY: pointerEvent.clientY,
    };

    draftSelectionRef.current = selection;
    setDraftSelection(clickToCreateEnabled ? selection : null);
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  };

  const updateDraftSelection = (
    pointerEvent: PointerEvent<HTMLDivElement>,
  ) => {
    const selection = draftSelectionRef.current;
    if (!selection || selection.pointerId !== pointerEvent.pointerId) return;

    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    const nextSelection = {
      ...selection,
      dragging:
        selection.dragging ||
        Math.abs(pointerEvent.clientY - selection.startClientY) >=
          DRAG_THRESHOLD_PX,
      focusMinute: minuteAtCalendarPosition(
        pointerEvent.clientY - rect.top,
        hourHeight,
        { includeDayEnd: true },
      ),
    };

    draftSelectionRef.current = nextSelection;
    setDraftSelection(
      clickToCreateEnabled || nextSelection.dragging ? nextSelection : null,
    );
    if (nextSelection.dragging) pointerEvent.preventDefault();
  };

  const clearDraftSelection = () => {
    draftSelectionRef.current = null;
    setDraftSelection(null);
  };

  const guardAgainstTrailingClick = () => {
    suppressClickUntilRef.current = Date.now() + TRAILING_CLICK_GUARD_MS;
  };

  const finishDraftSelection = (
    pointerEvent: PointerEvent<HTMLDivElement>,
  ) => {
    const selection = draftSelectionRef.current;
    if (!selection || selection.pointerId !== pointerEvent.pointerId) return;

    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    const finalSelection = {
      ...selection,
      dragging:
        selection.dragging ||
        Math.abs(pointerEvent.clientY - selection.startClientY) >=
          DRAG_THRESHOLD_PX,
      focusMinute: minuteAtCalendarPosition(
        pointerEvent.clientY - rect.top,
        hourHeight,
        { includeDayEnd: true },
      ),
    };

    clearDraftSelection();
    if (!finalSelection.dragging) return;

    pointerEvent.preventDefault();
    const range = getCalendarDraftRange(
      finalSelection.anchorMinute,
      finalSelection.focusMinute,
      true,
    );
    guardAgainstTrailingClick();
    onCreateAt(
      setMinutesIntoDay(finalSelection.day, range.startMinute),
      setMinutesIntoDay(finalSelection.day, range.endMinute),
    );
  };

  const createDefaultEvent = (
    clickEvent: MouseEvent<HTMLDivElement>,
    day: Date,
  ) => {
    if (clickEvent.target !== clickEvent.currentTarget) return;
    if (Date.now() < suppressClickUntilRef.current) return;
    if (selectedEventId) {
      onClearSelection();
      return;
    }
    if (!clickToCreateEnabled) return;

    const rect = clickEvent.currentTarget.getBoundingClientRect();
    const anchorMinute = minuteAtCalendarPosition(
      clickEvent.clientY - rect.top,
      hourHeight,
      { rounding: "floor" },
    );
    const range = getCalendarDraftRange(
      anchorMinute,
      anchorMinute,
      false,
      defaultEventDurationMinutes,
    );
    onCreateAt(
      setMinutesIntoDay(day, range.startMinute),
      setMinutesIntoDay(day, range.endMinute),
    );
  };

  const gridColumns = `56px repeat(${days.length}, minmax(${days.length === 1 ? "260px" : "108px"}, 1fr))`;

  return (
    <div
      ref={scrollAreaRef}
      className="calendar-scroll min-h-0 flex-1 overflow-auto overscroll-none bg-background"
    >
      <div
        className="sticky top-0 z-30 grid min-w-max border-b border-border/70 bg-background/91 backdrop-blur-xl"
        style={{ gridTemplateColumns: gridColumns }}
      >
        <div className="sticky left-0 z-20 bg-background/91" />
        {days.map((day) => {
          const today = isSameLocalDay(day, now);
          return (
              <button
                type="button"
                key={dateKey(day)}
                onClick={() => onSelectDay?.(day)}
                className="flex h-[54px] min-w-0 flex-col items-center justify-center border-l border-border/60 outline-none transition-colors duration-150 hover:bg-muted/35 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label={`Show ${formatFullDay(day, dateFormat)}`}
              >
              <span className="text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                {formatShortWeekday(day)}
              </span>
              <span
                className={cn(
                  "mt-1 flex size-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                  today && "bg-primary text-primary-foreground shadow-sm",
                )}
              >
                {formatDayOfMonth(day)}
              </span>
              </button>
          );
        })}
      </div>

      {allDayHeight > 0 ? (
        <div
          className="sticky z-[29] grid min-w-max border-b border-border/70 bg-background/96 backdrop-blur-xl"
          style={{
            gridTemplateColumns: gridColumns,
            height: allDayHeight,
            top: DAY_HEADER_HEIGHT,
          }}
        >
          <div className="sticky left-0 z-20 flex items-start justify-end bg-background/96 px-2 pt-1.5 text-[8px] font-medium text-muted-foreground">
            all-day
          </div>
          {days.map((day) => {
            const items = allDayEventsByDay.get(dateKey(day)) ?? [];
            const visible =
              items.length > MAX_ALL_DAY_ROWS
                ? items.slice(0, MAX_ALL_DAY_ROWS - 1)
                : items;
            const hiddenCount = items.length - visible.length;
            return (
              <div
                key={dateKey(day)}
                className="min-w-0 space-y-0.5 border-l border-border/60 px-1 py-1"
              >
                {visible.map((segment) => {
                  const category = getCalendarEventCategory(
                    categories,
                    segment.event,
                  );
                  return (
                    <CalendarEventContextMenu
                      key={segment.event.id}
                      event={segment.event}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectEvent(segment.event.id)}
                        className="flex h-5 w-full min-w-0 items-center gap-1 rounded border border-[var(--category-border)] bg-[var(--category-surface)] px-1 text-left text-[9px] font-semibold text-[var(--category-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--category-color)]"
                        style={getCalendarCategoryStyle(category)}
                      >
                        {segment.continuesBefore ? (
                          <ChevronLeft className="size-2.5 shrink-0 opacity-65" />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate">
                          {segment.event.title}
                        </span>
                        {segment.continuesAfter ? (
                          <ChevronRight className="size-2.5 shrink-0 opacity-65" />
                        ) : null}
                      </button>
                    </CalendarEventContextMenu>
                  );
                })}
                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDay?.(day)}
                    className="block h-5 w-full truncate px-1 text-left text-[9px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    +{hiddenCount} more
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div
        data-calendar-grid
        className="relative grid min-w-max overflow-clip"
        style={{ gridTemplateColumns: gridColumns, height: totalHeight }}
      >
        <div className="sticky left-0 z-10 bg-background" style={{ height: totalHeight }}>
          {hours.map((hour) => (
            <span
              key={hour}
              className={cn(
                "absolute right-2 text-[9px] font-medium tabular-nums text-muted-foreground/70",
                hour === HOUR_START
                  ? "translate-y-0"
                  : hour === HOUR_END
                    ? "-translate-y-full"
                    : "-translate-y-1/2",
              )}
              style={{ top: (hour - HOUR_START) * hourHeight }}
            >
              {formatHour(hour, timeFormat)}
            </span>
          ))}
        </div>

        {days.map((day, dayIndex) => {
          const dayKeyValue = dateKey(day);
          const dayEvents = layoutOverlappingEvents(
            eventSegmentsByDay.get(dayKeyValue) ?? [],
          );
          const today = isSameLocalDay(day, now);
          const currentMinute = minutesIntoDay(now);
          const currentTop = ((currentMinute - HOUR_START * 60) / 60) * hourHeight;
          const activeDraft =
            draftSelection?.dayKey === dayKeyValue ? draftSelection : null;
          const draftRange = activeDraft
            ? getCalendarDraftRange(
                activeDraft.anchorMinute,
                activeDraft.focusMinute,
                activeDraft.dragging,
                defaultEventDurationMinutes,
              )
            : null;
          const composerSegment = newEventPreview
            ? getCalendarIntervalSegment(
                newEventPreview.start,
                newEventPreview.end,
                day,
              )
            : null;
          const composerStartMinute = composerSegment
            ? composerSegment.continuesBefore
              ? HOUR_START * 60
              : minutesIntoDay(composerSegment.start)
            : 0;
          const composerDuration = newEventPreview
            ? Math.max(
                15,
                durationInMinutes(
                  newEventPreview.start,
                  newEventPreview.end,
                ),
              )
            : 0;
          const composerEndMinute = composerSegment
            ? composerSegment.continuesAfter ||
              !isSameLocalDay(composerSegment.start, composerSegment.end)
              ? HOUR_END * 60
              : minutesIntoDay(composerSegment.end)
            : 0;

          return (
            <div
              key={dayKeyValue}
              className={cn(
                "relative border-l border-b border-border/60 select-none",
                today && "bg-primary/[.018]",
              )}
              style={{ height: totalHeight }}
              onClick={(clickEvent) => createDefaultEvent(clickEvent, day)}
              onPointerDown={(pointerEvent) =>
                beginDraftSelection(pointerEvent, day)
              }
              onPointerMove={updateDraftSelection}
              onPointerUp={finishDraftSelection}
              onPointerCancel={clearDraftSelection}
              onLostPointerCapture={(pointerEvent) => {
                if (
                  draftSelectionRef.current?.pointerId ===
                  pointerEvent.pointerId
                ) {
                  clearDraftSelection();
                }
              }}
              role="gridcell"
              aria-label={`Schedule for ${formatFullDay(day, dateFormat)}`}
            >
              {hours.slice(0, -1).map((hour) => (
                <span
                  key={hour}
                  className="pointer-events-none absolute right-0 left-0 border-t border-border/45"
                  style={{ top: (hour - HOUR_START) * hourHeight }}
                  aria-hidden="true"
                >
                  <span
                    className="absolute right-0 left-0 border-t border-dashed border-border/22"
                    style={{ top: hourHeight / 4 }}
                  />
                  <span
                    className="absolute right-0 left-0 border-t border-border/20"
                    style={{ top: hourHeight / 2 }}
                  />
                  <span
                    className="absolute right-0 left-0 border-t border-dashed border-border/22"
                    style={{ top: (hourHeight * 3) / 4 }}
                  />
                </span>
              ))}

              {today && currentTop >= 0 && currentTop <= totalHeight ? (
                <CalendarCurrentTimeLine
                  label={formatTime(now, timeFormat)}
                  top={currentTop}
                />
              ) : null}

              {draftRange ? (
                <CalendarEventDraft
                  category={getCalendarPreviewCategory(
                    categories,
                    calendars,
                    {
                      calendarId:
                        activeCalendarId ??
                        calendars.find((calendar) => calendar.writable)?.id ??
                        "",
                      categoryId: getCalendarCategory(
                        categories,
                        null,
                        activeCalendarId ??
                          calendars.find((calendar) => calendar.writable)?.id,
                      ).id,
                    },
                  )}
                  title=""
                  durationMinutes={
                    draftRange.endMinute - draftRange.startMinute
                  }
                  startLabel={formatTime(
                    setMinutesIntoDay(day, draftRange.startMinute),
                    timeFormat,
                  )}
                  endLabel={formatTime(
                    setMinutesIntoDay(day, draftRange.endMinute),
                    timeFormat,
                  )}
                  top={
                    ((draftRange.startMinute - HOUR_START * 60) / 60) *
                    hourHeight
                  }
                  height={
                    ((draftRange.endMinute - draftRange.startMinute) / 60) *
                    hourHeight
                  }
                />
              ) : null}

              {newEventPreview && composerSegment ? (
                <CalendarEventDraft
                  title={newEventPreview.title}
                  category={getCalendarPreviewCategory(
                    categories,
                    calendars,
                    newEventPreview,
                  )}
                  continuesBefore={composerSegment.continuesBefore}
                  continuesAfter={composerSegment.continuesAfter}
                  durationMinutes={composerDuration}
                  startLabel={
                    composerSegment.continuesBefore
                      ? "Continues"
                      : formatTime(newEventPreview.start, timeFormat)
                  }
                  endLabel={
                    composerSegment.continuesAfter
                      ? "next day"
                      : formatTime(newEventPreview.end, timeFormat)
                  }
                  top={
                    ((composerStartMinute - HOUR_START * 60) / 60) *
                    hourHeight
                  }
                  height={
                    ((composerEndMinute - composerStartMinute) / 60) *
                    hourHeight
                  }
                />
              ) : null}

              {dayEvents.map(
                ({
                  event: segment,
                  laneCount,
                  leftPercent,
                  widthPercent,
                }) => (
                <CalendarEventBlock
                  key={segment.event.id}
                  event={segment.event}
                  displayStart={segment.start}
                  displayEnd={segment.end}
                  continuesBefore={segment.continuesBefore}
                  continuesAfter={segment.continuesAfter}
                  dayIndex={dayIndex}
                  dayCount={days.length}
                  leftPercent={leftPercent}
                  widthPercent={widthPercent}
                  overlapping={laneCount > 1}
                  hourHeight={hourHeight}
                  selected={selectedEventId === segment.event.id}
                  onInteractionCommit={guardAgainstTrailingClick}
                  onSelect={onSelectEvent}
                  onMove={onMoveEvent}
                />
                ),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
