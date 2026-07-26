import {
  CalendarClock,
  CalendarRange,
  Clock3,
  Copy,
  ExternalLink,
  MapPin,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { CalendarCategorySelect } from "@/features/calendar/components/calendar-category-select";
import { CalendarEventAlertToggle } from "@/features/calendar/components/calendar-event-alert-toggle";
import {
  addDays,
  addMinutes,
  combineDateAndTime,
  dateKey,
  daysBetween,
  durationInMinutes,
  formatDurationMinutes,
  formatEventRange,
  isAfterDate,
  isSameLocalDay,
  startOfLocalDay,
  timeInputValue,
} from "@/features/calendar/lib/dates";
import { getCalendarEventCategory } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type CalendarInspectorProps = {
  className?: string;
};

export function CalendarInspector({ className }: CalendarInspectorProps) {
  const { dateFormat, timeFormat } = useUserPreferences();
  const {
    duplicateEvent,
    calendars,
    categories,
    events,
    removeEvent,
    restoreEvent,
    selectedEventId,
    setSelectedEventId,
    updateEvent,
  } = useCalendar();
  const calendarEvent = events.find((event) => event.id === selectedEventId);
  const calendar = calendars.find(
    (item) => item.id === calendarEvent?.calendarId,
  );
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (!calendarEvent) return;
    setTitle(calendarEvent.title);
    setLocation(calendarEvent.location);
    setNotes(calendarEvent.notes);
    setStartDate(dateKey(calendarEvent.startAt));
    setStartTime(timeInputValue(calendarEvent.startAt));
    setEndDate(
      dateKey(
        calendarEvent.allDay
          ? addMinutes(new Date(calendarEvent.endAt), -1)
          : calendarEvent.endAt,
      ),
    );
    setEndTime(timeInputValue(calendarEvent.endAt));
  }, [calendarEvent]);

  if (!calendarEvent) {
    return (
      <aside
        className={cn(
          "flex h-full w-[360px] shrink-0 items-center justify-center border-l border-border bg-card px-8 text-center",
          className,
        )}
      >
        <div>
          <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <CalendarClock className="size-[19px]" />
          </div>
          <p className="mt-3 text-sm font-medium">Select an event</p>
          <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
            Edit its time, color, location, and notes without leaving your schedule.
          </p>
        </div>
      </aside>
    );
  }

  const category = getCalendarEventCategory(categories, calendarEvent);
  const durationMinutes = durationInMinutes(
    calendarEvent.startAt,
    calendarEvent.endAt,
  );
  const calendarDayDistance = daysBetween(
    startOfLocalDay(new Date(calendarEvent.endAt)),
    startOfLocalDay(new Date(calendarEvent.startAt)),
  );
  const dayCount = calendarEvent.allDay
    ? Math.max(1, calendarDayDistance)
    : calendarDayDistance + 1;
  const multiDay = calendarEvent.allDay
    ? dayCount > 1
    : !isSameLocalDay(calendarEvent.startAt, calendarEvent.endAt);
  const durationLabel = calendarEvent.allDay
    ? `${dayCount} ${dayCount === 1 ? "day" : "days"}`
    : formatDurationMinutes(durationMinutes);

  const commitText = (field: "title" | "location" | "notes", value: string) => {
    const cleanValue = value.trim();
    if (field === "title" && !cleanValue) {
      setTitle(calendarEvent.title);
      return;
    }
    if (cleanValue !== calendarEvent[field]) {
      updateEvent(calendarEvent.id, { [field]: cleanValue });
    }
  };

  const changeStart = (nextDate: string, nextTime: string) => {
    const start = combineDateAndTime(nextDate, nextTime);
    const end = addMinutes(start, Math.max(30, durationMinutes));
    setStartDate(nextDate);
    setStartTime(nextTime);
    setEndDate(
      dateKey(calendarEvent.allDay ? addMinutes(end, -1) : end),
    );
    setEndTime(timeInputValue(end));
    updateEvent(calendarEvent.id, {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  };

  const changeEnd = (nextDate: string, nextTime: string) => {
    const start = combineDateAndTime(startDate, startTime);
    const end = calendarEvent.allDay
      ? addDays(combineDateAndTime(nextDate, "00:00"), 1)
      : combineDateAndTime(nextDate, nextTime);
    if (!isAfterDate(end, start)) return;
    setEndDate(nextDate);
    setEndTime(nextTime);
    updateEvent(calendarEvent.id, { endAt: end.toISOString() });
  };

  const deleteEvent = () => {
    const removed = removeEvent(calendarEvent.id);
    if (!removed) return;
    toast("Event deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreEvent(removed);
          setSelectedEventId(removed.id);
        },
      },
    });
  };

  const duplicate = () => {
    const sourceId = calendarEvent.id;
    const copy = duplicateEvent(sourceId);
    if (!copy) return;
    toast.success("Event duplicated", {
      description: `${formatEventRange(copy.startAt, copy.endAt, timeFormat)}`,
      action: {
        label: "Undo",
        onClick: () => {
          removeEvent(copy.id);
          setSelectedEventId(sourceId);
        },
      },
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full w-[360px] shrink-0 flex-col overflow-hidden border-l border-border bg-card",
        className,
      )}
      aria-label="Event details"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <h2 className="text-sm font-semibold">Event details</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setSelectedEventId(null)}
          aria-label="Close event details"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 size-3 shrink-0 rounded-full shadow-sm"
            style={{ backgroundColor: category.color }}
          />
          <Textarea
            value={title}
            rows={2}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={(event) => commitText("title", event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            className="min-h-14 border-0 bg-transparent px-0 py-0 text-[18px] leading-6 font-semibold tracking-[-0.02em] shadow-none focus:ring-0"
            aria-label="Event name"
            readOnly={calendarEvent.readOnly}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 px-0.5">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: calendar?.color ?? category.color }}
          />
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
            {calendar?.name ?? calendarEvent.calendarName ?? "Calendar"}
          </span>
          <span className="text-[10px] capitalize text-muted-foreground">
            {calendarEvent.source === "app"
              ? "Read only"
              : calendarEvent.source === "google" && calendarEvent.readOnly
                ? "Google · read only"
              : calendarEvent.source}
          </span>
          {calendarEvent.htmlLink ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 text-muted-foreground"
              onClick={() =>
                window.open(calendarEvent.htmlLink ?? undefined, "_blank")
              }
              aria-label="Open original event"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          ) : null}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border/65 bg-background">
          <div className="flex items-center gap-3 border-b border-border/55 px-3 py-2.5">
            <Clock3 className="size-4 shrink-0 text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">Duration</p>
              <p className="mt-0.5 text-[13px] font-semibold">{durationLabel}</p>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {calendarEvent.allDay ? (
                "All day"
              ) : multiDay ? (
                <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-foreground">
                  <CalendarRange className="size-3 text-primary" />
                  {dayCount} days
                </span>
              ) : (
                formatEventRange(
                  calendarEvent.startAt,
                  calendarEvent.endAt,
                  timeFormat,
                )
              )}
            </span>
          </div>

          <div
            className={cn(
              "grid items-center gap-2 px-3 py-2.5",
              calendarEvent.allDay
                ? "grid-cols-[48px_1fr]"
                : "grid-cols-[48px_1fr_90px]",
            )}
          >
            <span className="text-[11px] font-medium text-muted-foreground">Starts</span>
            <DatePicker
              value={startDate}
              onValueChange={(value) => changeStart(value, startTime)}
              dateFormat={dateFormat}
              className="h-8 px-2 text-[11px]"
              ariaLabel="Start date"
              disabled={calendarEvent.readOnly}
            />
            {!calendarEvent.allDay ? (
              <TimePicker
                timeFormat={timeFormat}
                value={startTime}
                onValueChange={(value) => changeStart(startDate, value)}
                minuteStep={15}
                className="h-8 w-[90px] rounded-md border border-input bg-transparent px-2 text-right text-[11px] text-foreground shadow-xs focus:ring-2"
                ariaLabel="Start time"
                disabled={calendarEvent.readOnly}
              />
            ) : null}
          </div>
          <div
            className={cn(
              "grid items-center gap-2 border-t border-border/45 px-3 py-2.5",
              calendarEvent.allDay
                ? "grid-cols-[48px_1fr]"
                : "grid-cols-[48px_1fr_90px]",
            )}
          >
            <span className="text-[11px] font-medium text-muted-foreground">Ends</span>
            <DatePicker
              value={endDate}
              onValueChange={(value) => changeEnd(value, endTime)}
              dateFormat={dateFormat}
              className="h-8 px-2 text-[11px]"
              ariaLabel="End date"
              disabled={calendarEvent.readOnly}
            />
            {!calendarEvent.allDay ? (
              <TimePicker
                timeFormat={timeFormat}
                value={endTime}
                onValueChange={(value) => changeEnd(endDate, value)}
                minuteStep={15}
                className="h-8 w-[90px] rounded-md border border-input bg-transparent px-2 text-right text-[11px] text-foreground shadow-xs focus:ring-2"
                ariaLabel="End time"
                disabled={calendarEvent.readOnly}
              />
            ) : null}
          </div>
        </div>

        {calendarEvent.source === "lifever" ? (
          <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Category
          </label>
          <CalendarCategorySelect
            calendarId={calendarEvent.calendarId}
            value={calendarEvent.categoryId}
            onValueChange={(categoryId) =>
              updateEvent(calendarEvent.id, { categoryId })
            }
          />
          </div>
        ) : null}

        {calendarEvent.source === "lifever" ? (
          <CalendarEventAlertToggle
            checked={calendarEvent.alertsEnabled}
            onCheckedChange={(alertsEnabled) =>
              updateEvent(calendarEvent.id, { alertsEnabled })
            }
            className="mt-4"
          />
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="event-location" className="mb-1.5 block text-xs font-medium text-muted-foreground">Location</label>
            {calendarEvent.readOnly ? (
              <div className="flex min-h-9 items-center gap-2.5 px-1 text-[13px]">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span>{location || "No location"}</span>
              </div>
            ) : (
              <div className="relative">
                <MapPin className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="event-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  onBlur={(event) => commitText("location", event.currentTarget.value)}
                  placeholder="Add a location"
                  className="pl-9 text-[13px]"
                />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="event-notes" className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            {calendarEvent.readOnly ? (
              <p className="min-h-12 whitespace-pre-wrap px-1 text-[13px] leading-5 text-foreground">
                {notes || "No notes"}
              </p>
            ) : (
              <Textarea
                id="event-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={(event) => commitText("notes", event.currentTarget.value)}
                placeholder="Add notes"
                className="min-h-24 text-[13px]"
              />
            )}
          </div>
        </div>
      </div>

      {!calendarEvent.readOnly ? (
        <div className="flex shrink-0 items-center gap-1 border-t border-border/60 px-2 py-1.5">
        <Button variant="ghost" size="sm" className="h-8 flex-1 justify-start rounded-md px-2 text-[12px] font-medium" onClick={duplicate}>
          <Copy className="size-3.5" strokeWidth={1.9} />
          Duplicate
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={deleteEvent}
          aria-label="Delete event"
        >
          <Trash2 className="size-3.5" strokeWidth={1.8} />
        </Button>
        </div>
      ) : null}
    </aside>
  );
}
