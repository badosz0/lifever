import {
  type DragEvent,
  type MouseEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CalendarMonthEventCard } from "@/features/calendar/components/calendar-month-event-card";
import {
  addDays,
  addMinutes,
  compareDates,
  dateKey,
  daysBetween,
  formatDayOfMonth,
  formatFullDay,
  formatShortWeekday,
  isSameLocalDay,
  isSameLocalMonth,
  setCalendarTime,
  startOfLocalDay,
  startOfLocalMonth,
  startOfWeek,
  toCalendarDate,
} from "@/features/calendar/lib/dates";
import {
  getCalendarEventSegment,
  getCalendarIntervalSegment,
} from "@/features/calendar/lib/event-segments";
import {
  getCalendarEventCategory,
  getCalendarPreviewCategory,
} from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type {
  CalendarEvent,
  CalendarEventPreview,
} from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type CalendarMonthGridProps = {
  events: CalendarEvent[];
  month: Date;
  newEventPreview: CalendarEventPreview | null;
  selectedEventId: string | null;
  onClearSelection: () => void;
  onCreateAt: (start: Date, end: Date) => void;
  onMoveEvent: (id: string, startAt: string, endAt: string) => void;
  onSelectDay: (day: Date) => void;
  onSelectEvent: (id: string) => void;
};

const DAYS_IN_MONTH_GRID = 42;
const MONTH_ROW_COUNT = 6;
const DAY_CELL_CHROME_HEIGHT = 30;
const EVENT_CARD_PITCH = 20;
const MORE_ROW_HEIGHT = 14;
const CALENDAR_EVENT_DATA_TYPE = "application/x-lifever-calendar-event";

type MonthDragPayload = {
  eventId: string;
  segmentDayKey: string;
};

export function CalendarMonthGrid({
  events,
  month,
  newEventPreview,
  selectedEventId,
  onClearSelection,
  onCreateAt,
  onMoveEvent,
  onSelectDay,
  onSelectEvent,
}: CalendarMonthGridProps) {
  const { calendars, categories } = useCalendar();
  const { dateFormat } = useUserPreferences();
  const monthGridRef = useRef<HTMLDivElement>(null);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [eventAreaHeight, setEventAreaHeight] = useState(120);
  const days = useMemo(() => {
    const firstDay = startOfWeek(startOfLocalMonth(month));
    return Array.from({ length: DAYS_IN_MONTH_GRID }, (_, index) =>
      addDays(firstDay, index),
    );
  }, [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<ReturnType<typeof getCalendarEventSegment>>[]
    >();
    for (const day of days) {
      const items = events
        .map((event) => getCalendarEventSegment(event, day))
        .filter(
          (
            segment,
          ): segment is NonNullable<
            ReturnType<typeof getCalendarEventSegment>
          > => Boolean(segment),
        );
      if (items.length > 0) map.set(dateKey(day), items);
    }
    for (const items of map.values()) {
      items.sort((left, right) => {
        const leftSpansDays = left.continuesBefore || left.continuesAfter;
        const rightSpansDays = right.continuesBefore || right.continuesAfter;
        return (
          Number(rightSpansDays) - Number(leftSpansDays) ||
          compareDates(left.event.startAt, right.event.startAt)
        );
      });
    }
    return map;
  }, [days, events]);
  const today = new Date();

  useLayoutEffect(() => {
    const monthGrid = monthGridRef.current;
    if (!monthGrid) return;

    const updateEventAreaHeight = () => {
      const nextHeight = Math.max(
        EVENT_CARD_PITCH,
        monthGrid.clientHeight / MONTH_ROW_COUNT - DAY_CELL_CHROME_HEIGHT,
      );
      setEventAreaHeight((current) =>
        Math.abs(current - nextHeight) < 0.5 ? current : nextHeight,
      );
    };

    updateEventAreaHeight();
    const observer = new ResizeObserver(updateEventAreaHeight);
    observer.observe(monthGrid);
    return () => observer.disconnect();
  }, []);

  const createOnDay = (clickEvent: MouseEvent<HTMLDivElement>, day: Date) => {
    if ((clickEvent.target as HTMLElement).closest("button")) return;
    if (selectedEventId) {
      onClearSelection();
      return;
    }
    const start = setCalendarTime(day, 9);
    onCreateAt(start, addMinutes(start, 60));
  };

  const dropOnDay = (dragEvent: DragEvent<HTMLDivElement>, day: Date) => {
    dragEvent.preventDefault();
    setDropTarget(null);
    const rawPayload = dragEvent.dataTransfer.getData(
      CALENDAR_EVENT_DATA_TYPE,
    );
    let payload: MonthDragPayload | null = null;
    try {
      payload = JSON.parse(rawPayload) as MonthDragPayload;
    } catch {
      payload = rawPayload
        ? { eventId: rawPayload, segmentDayKey: rawPayload }
        : null;
    }
    if (!payload) return;
    const eventId = payload.eventId;
    const calendarEvent = events.find((event) => event.id === eventId);
    if (!calendarEvent || calendarEvent.readOnly) return;

    const start = toCalendarDate(calendarEvent.startAt);
    const end = toCalendarDate(calendarEvent.endAt);
    const draggedDay =
      payload.segmentDayKey === eventId
        ? startOfLocalDay(start)
        : startOfLocalDay(toCalendarDate(payload.segmentDayKey));
    const dayDelta = daysBetween(day, draggedDay);
    onMoveEvent(
      calendarEvent.id,
      addDays(start, dayDelta).toISOString(),
      addDays(end, dayDelta).toISOString(),
    );
    onSelectEvent(calendarEvent.id);
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background">
      <div className="flex h-full min-h-[456px] w-full min-w-[620px] flex-col">
        <div className="sticky top-0 z-20 grid h-9 shrink-0 grid-cols-7 border-b border-border/70 bg-background/95 backdrop-blur-xl">
          {days.slice(0, 7).map((day) => (
            <div
              key={dateKey(day)}
              className="flex items-center justify-center border-l border-border/60 text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase first:border-l-0"
            >
              {formatShortWeekday(day)}
            </div>
          ))}
        </div>

        <div
          ref={monthGridRef}
          role="grid"
          className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6"
        >
          {days.map((day) => {
            const dayKeyValue = dateKey(day);
            const dayEvents = eventsByDay.get(dayKeyValue) ?? [];
            const previewSegment = newEventPreview
              ? getCalendarIntervalSegment(
                  newEventPreview.start,
                  newEventPreview.end,
                  day,
                )
              : null;
            const previewCount = previewSegment ? 1 : 0;
            const totalCardCount = dayEvents.length + previewCount;
            const allCardsHeight = Math.max(
              0,
              totalCardCount * EVENT_CARD_PITCH - 2,
            );
            const needsOverflow = allCardsHeight > eventAreaHeight;
            const visibleCardCount = needsOverflow
              ? Math.max(
                  previewCount,
                  Math.floor(
                    (eventAreaHeight - MORE_ROW_HEIGHT) / EVENT_CARD_PITCH,
                  ),
                )
              : totalCardCount;
            const visibleEvents = dayEvents.slice(
              0,
              Math.max(0, visibleCardCount - previewCount),
            );
            const hiddenCount = dayEvents.length - visibleEvents.length;
            const currentMonth = isSameLocalMonth(day, month);
            const isToday = isSameLocalDay(day, today);

            return (
              <div
                key={dayKeyValue}
                role="gridcell"
                aria-label={`Schedule for ${formatFullDay(day, dateFormat)}`}
                className={cn(
                  "relative min-h-0 overflow-hidden border-r border-b border-border/60 p-1 last:border-r-0",
                  !currentMonth && "bg-muted/35",
                  dropTarget === dayKeyValue &&
                    "z-10 ring-2 ring-inset ring-primary/30",
                )}
                onClick={(event) => createOnDay(event, day)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dropTarget !== dayKeyValue) setDropTarget(dayKeyValue);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setDropTarget(null);
                  }
                }}
                onDrop={(event) => dropOnDay(event, day)}
              >
                <div className="mb-0.5 flex h-5 items-center justify-between">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectDay(day);
                    }}
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                      isToday &&
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                      !currentMonth && !isToday && "text-muted-foreground/65",
                    )}
                    aria-label={`Show ${formatFullDay(day, dateFormat)}`}
                  >
                    {formatDayOfMonth(day)}
                  </button>
                </div>

                <div className="space-y-0.5">
                  {newEventPreview && previewSegment ? (
                    <CalendarMonthEventCard
                      preview
                      title={newEventPreview.title}
                      category={getCalendarPreviewCategory(
                        categories,
                        calendars,
                        newEventPreview,
                      )}
                      startAt={newEventPreview.start}
                      endAt={newEventPreview.end}
                      continuesBefore={previewSegment.continuesBefore}
                      continuesAfter={previewSegment.continuesAfter}
                    />
                  ) : null}
                  {visibleEvents.map((segment) => (
                    <CalendarMonthEventCard
                      key={segment.event.id}
                      event={segment.event}
                      title={segment.event.title}
                      category={getCalendarEventCategory(
                        categories,
                        segment.event,
                      )}
                      startAt={segment.event.startAt}
                      endAt={segment.event.endAt}
                      continuesBefore={segment.continuesBefore}
                      continuesAfter={segment.continuesAfter}
                      selected={selectedEventId === segment.event.id}
                      dragging={draggingEventId === segment.event.id}
                      readOnly={segment.event.readOnly}
                      onClick={() => onSelectEvent(segment.event.id)}
                      onDragStart={(dragEvent) => {
                        if (segment.event.readOnly) {
                          dragEvent.preventDefault();
                          return;
                        }
                        dragEvent.stopPropagation();
                        dragEvent.dataTransfer.effectAllowed = "move";
                        dragEvent.dataTransfer.setData(
                          CALENDAR_EVENT_DATA_TYPE,
                          JSON.stringify({
                            eventId: segment.event.id,
                            segmentDayKey: dayKeyValue,
                          } satisfies MonthDragPayload),
                        );
                        setDraggingEventId(segment.event.id);
                      }}
                      onDragEnd={() => {
                        setDraggingEventId(null);
                        setDropTarget(null);
                      }}
                    />
                  ))}
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectDay(day);
                      }}
                      className="block h-3.5 w-full truncate px-1 text-left text-[9px] leading-3 font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      +{hiddenCount} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
