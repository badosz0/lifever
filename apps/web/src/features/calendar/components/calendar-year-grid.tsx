import { useMemo } from "react";

import {
  addDays,
  addMonths,
  dateKey,
  formatDayOfMonth,
  formatFullDay,
  formatMonthName,
  formatShortWeekday,
  isSameLocalDay,
  isSameLocalMonth,
  startOfLocalMonth,
  startOfLocalYear,
  startOfWeek,
} from "@/features/calendar/lib/dates";
import {
  getCalendarIntervalSegment,
  intervalOverlapsRange,
} from "@/features/calendar/lib/event-segments";
import { getCalendarCategory } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type {
  CalendarEvent,
  CalendarEventPreview,
} from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type CalendarYearGridProps = {
  events: CalendarEvent[];
  newEventPreview: CalendarEventPreview | null;
  selectedDate: Date;
  year: Date;
  onSelectDay: (day: Date) => void;
  onSelectMonth: (month: Date) => void;
};

const DAYS_IN_MONTH_GRID = 42;
const MAX_EVENT_DOTS = 3;

type DayEvents = {
  categoryIds: string[];
  count: number;
};

export function CalendarYearGrid({
  events,
  newEventPreview,
  selectedDate,
  year,
  onSelectDay,
  onSelectMonth,
}: CalendarYearGridProps) {
  const { categories } = useCalendar();
  const { dateFormat } = useUserPreferences();
  const months = useMemo(() => {
    const firstMonth = startOfLocalYear(year);
    return Array.from({ length: 12 }, (_, index) => addMonths(firstMonth, index));
  }, [year]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const month of months) {
      const monthStart = startOfLocalMonth(month);
      const firstGridDay = startOfWeek(monthStart);
      for (let index = 0; index < DAYS_IN_MONTH_GRID; index += 1) {
        const day = addDays(firstGridDay, index);
        if (!isSameLocalMonth(day, month)) continue;
        const items = events.filter((event) =>
          Boolean(
            getCalendarIntervalSegment(event.startAt, event.endAt, day),
          ),
        );
        if (items.length > 0) map.set(dateKey(day), items);
      }
    }
    return map;
  }, [events, months]);
  const today = new Date();

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background p-3 sm:p-4">
      <div className="grid h-full min-h-[500px] min-w-[660px] grid-cols-4 grid-rows-3 border-t border-border/55">
        {months.map((month, monthIndex) => {
          const monthStart = startOfLocalMonth(month);
          const nextMonthStart = addMonths(monthStart, 1);
          const firstGridDay = startOfWeek(monthStart);
          const days = Array.from({ length: DAYS_IN_MONTH_GRID }, (_, index) =>
            addDays(firstGridDay, index),
          );
          const monthEventCount = events.filter((event) =>
            intervalOverlapsRange(
              event.startAt,
              event.endAt,
              monthStart,
              nextMonthStart,
            ),
          ).length;

          return (
            <section
              key={dateKey(month)}
              className={cn(
                "flex min-h-0 flex-col border-b border-border/55 bg-background p-2.5 sm:p-3",
                monthIndex % 4 !== 3 && "border-r",
              )}
              aria-label={`${formatMonthName(month)} calendar`}
            >
              <button
                type="button"
                onClick={() => onSelectMonth(month)}
                className="group -ml-1 flex h-6 shrink-0 items-center justify-between rounded-md px-1 text-left outline-none transition-[color,transform] duration-150 hover:text-primary active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-colors motion-reduce:active:scale-100"
                aria-label={`Show ${formatMonthName(month)} ${month.getFullYear()}`}
              >
                <span className="text-[11px] font-semibold tracking-[-0.01em]">
                  {formatMonthName(month)}
                </span>
                {monthEventCount > 0 ? (
                  <span className="text-[8px] font-medium tabular-nums text-muted-foreground">
                    {monthEventCount}
                  </span>
                ) : null}
              </button>

              <div className="mt-0.5 grid h-4 shrink-0 grid-cols-7" aria-hidden="true">
                {days.slice(0, 7).map((day) => (
                  <div
                    key={dateKey(day)}
                    className="flex items-center justify-center text-[7px] font-semibold tracking-[0.04em] text-muted-foreground/70 uppercase"
                  >
                    {formatShortWeekday(day).slice(0, 1)}
                  </div>
                ))}
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6" role="grid">
                {days.map((day) => {
                  const inMonth = isSameLocalMonth(day, month);
                  if (!inMonth) {
                    return <div key={dateKey(day)} aria-hidden="true" />;
                  }

                  const savedEvents = eventsByDay.get(dateKey(day)) ?? [];
                  const previewOnDay =
                    newEventPreview &&
                    getCalendarIntervalSegment(
                      newEventPreview.start,
                      newEventPreview.end,
                      day,
                    )
                      ? newEventPreview
                      : null;
                  const dayEvents: DayEvents = {
                    categoryIds: [
                      ...(previewOnDay ? [previewOnDay.categoryId] : []),
                      ...savedEvents.map((event) => event.categoryId),
                    ].slice(0, MAX_EVENT_DOTS),
                    count: savedEvents.length + (previewOnDay ? 1 : 0),
                  };
                  const isToday = isSameLocalDay(day, today);
                  const isSelected = isSameLocalDay(day, selectedDate);
                  const eventLabel =
                    dayEvents.count === 0
                      ? "No events"
                      : `${dayEvents.count} ${dayEvents.count === 1 ? "event" : "events"}`;

                  return (
                    <button
                      key={dateKey(day)}
                      type="button"
                      role="gridcell"
                      onClick={() => onSelectDay(day)}
                      className={cn(
                        "group relative flex min-h-0 flex-col items-center justify-center text-[8px] font-medium tabular-nums text-foreground/75 outline-none transition-colors duration-150 hover:text-foreground focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected && !isToday && "text-foreground",
                      )}
                      aria-label={`${formatFullDay(day, dateFormat)}, ${eventLabel}`}
                    >
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded-full transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] group-hover:bg-muted group-active:scale-[0.9] motion-reduce:transition-colors motion-reduce:group-active:scale-100",
                          isSelected && !isToday && "bg-muted font-semibold",
                          isToday && "bg-primary font-bold text-primary-foreground",
                        )}
                      >
                        {formatDayOfMonth(day)}
                      </span>
                      {dayEvents.categoryIds.length > 0 ? (
                        <span className="absolute bottom-0.5 flex items-center gap-px" aria-hidden="true">
                          {dayEvents.categoryIds.map((categoryId, index) => (
                            <span
                              key={`${categoryId}-${index}`}
                              className={cn(
                                "size-1 rounded-full",
                                previewOnDay && index === 0 && "opacity-55",
                              )}
                              style={{
                                backgroundColor: getCalendarCategory(
                                  categories,
                                  categoryId,
                                ).color,
                              }}
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
