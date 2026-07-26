import { MapPin } from "lucide-react";
import { useMemo } from "react";

import { getCalendarCategory } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { formatUserTime } from "@/lib/date-time-format";

export function CalendarHomeWidget() {
  const { categories, events, isReady } = useCalendar();
  const { timeFormat } = useUserPreferences();
  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.endAt).getTime() >= now)
      .sort((left, right) => left.startAt.localeCompare(right.startAt))
      .slice(0, 3);
  }, [events]);

  if (!isReady) {
    return <p className="text-xs text-muted-foreground">Loading calendar…</p>;
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <strong className="text-[28px] leading-none font-bold tracking-[-0.04em]">
          {upcoming.length ? formatUserTime(upcoming[0]!.startAt, timeFormat) : "Clear"}
        </strong>
        <span className="pb-0.5 text-[11px] text-muted-foreground">
          {upcoming.length ? "next event" : "nothing ahead"}
        </span>
      </div>

      <div className="mt-5 space-y-1">
        {upcoming.map((event) => {
          const category = getCalendarCategory(categories, event.categoryId);
          return (
            <div
              key={event.id}
              className="flex min-h-8 items-center gap-2 rounded-lg px-1"
            >
              <span
                className="h-5 w-[3px] shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{event.title}</p>
                {event.location ? (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-muted-foreground">
                    <MapPin className="size-2.5 shrink-0" />
                    {event.location}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-[9px] text-muted-foreground">
                {formatUserTime(event.startAt, timeFormat)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
