import {
  ArrowRight,
  CalendarPlus,
  CalendarRange,
  Clock3,
  MapPin,
} from "lucide-react";
import { type FormEvent, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { CalendarCategorySelect } from "@/features/calendar/components/calendar-category-select";
import {
  dateKey,
  getEventRangeFromInputs,
  timeInputValue,
} from "@/features/calendar/lib/dates";
import { getCalendarCategory } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type { CalendarEventPreview } from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type NewCalendarEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: CalendarEventPreview | null) => void;
  initialStart: Date;
  initialEnd: Date;
};

export function NewCalendarEventDialog({
  open,
  onOpenChange,
  onDraftChange,
  initialStart,
  initialEnd,
}: NewCalendarEventDialogProps) {
  const { addEvent, categories } = useCalendar();
  const { dateFormat, timeFormat } = useUserPreferences();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(dateKey(initialStart));
  const [startTime, setStartTime] = useState(timeInputValue(initialStart));
  const [endDate, setEndDate] = useState(dateKey(initialEnd));
  const [endTime, setEndTime] = useState(timeInputValue(initialEnd));
  const [categoryId, setCategoryId] = useState(
    getCalendarCategory(categories, null).id,
  );
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const titleId = useId();
  const startDateId = useId();
  const startId = useId();
  const endDateId = useId();
  const endId = useId();
  const locationId = useId();
  const notesId = useId();

  const range = useMemo(() => {
    return getEventRangeFromInputs(
      startDate,
      startTime,
      endDate,
      endTime,
    );
  }, [endDate, endTime, startDate, startTime]);

  useEffect(() => {
    if (!open) return;
    setStartDate(dateKey(initialStart));
    setStartTime(timeInputValue(initialStart));
    setEndDate(dateKey(initialEnd));
    setEndTime(timeInputValue(initialEnd));
  }, [initialEnd, initialStart, open]);

  useEffect(() => {
    if (!open) return;
    onDraftChange(
      range.valid
        ? {
            categoryId,
            end: range.end,
            start: range.start,
            title: title.trim(),
          }
        : null,
    );
  }, [categoryId, onDraftChange, open, range, title]);

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !range.valid) return;
    const event = addEvent({
      title: cleanTitle,
      startAt: range.start.toISOString(),
      endAt: range.end.toISOString(),
      categoryId,
      location: location.trim(),
      notes: notes.trim(),
    });
    onOpenChange(false);
    toast.success("Event added", { description: event.title });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] overflow-visible p-0">
        <div className="border-b border-border/60 px-5 pt-5 pb-4">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <CalendarPlus className="size-[18px]" />
          </div>
          <DialogTitle>New event</DialogTitle>
          <DialogDescription className="mt-1">
            Make time for what matters.
          </DialogDescription>
        </div>

        <form onSubmit={submit} className="max-h-[min(72vh,620px)] overflow-y-auto px-5 pt-4 pb-5">
          <div>
            <label htmlFor={titleId} className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Event name
            </label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What’s happening?"
              autoFocus
              maxLength={160}
              className="h-10"
            />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2">
              <div className="rounded-lg border border-border/70 bg-card p-2.5">
                <p className="mb-2 text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                  Starts
                </p>
                <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                  <div>
                    <label htmlFor={startDateId} className="sr-only">
                      Start date
                    </label>
                    <DatePicker
                      id={startDateId}
                      value={startDate}
                      onValueChange={setStartDate}
                      dateFormat={dateFormat}
                      ariaLabel="Event start date"
                      compact
                      className="text-[11px]"
                    />
                  </div>
                  <div>
                    <label htmlFor={startId} className="sr-only">
                      Start time
                    </label>
                    <TimePicker
                      timeFormat={timeFormat}
                      id={startId}
                      value={startTime}
                      onValueChange={setStartTime}
                      ariaLabel="Event start time"
                      minuteStep={15}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-right text-[11px] text-foreground shadow-xs focus:ring-2"
                    />
                  </div>
                </div>
              </div>

              <ArrowRight
                className="size-4 justify-self-center text-muted-foreground/70"
                aria-hidden="true"
              />

              <div
                className={cn(
                  "rounded-lg border bg-card p-2.5",
                  range.multiDay
                    ? "border-primary/35 ring-1 ring-primary/10"
                    : "border-border/70",
                )}
              >
                <p className="mb-2 text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                  Ends
                </p>
                <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                  <div>
                    <label htmlFor={endDateId} className="sr-only">
                      End date
                    </label>
                    <DatePicker
                      id={endDateId}
                      value={endDate}
                      onValueChange={setEndDate}
                      dateFormat={dateFormat}
                      ariaLabel="Event end date"
                      compact
                      className="text-[11px]"
                    />
                  </div>
                  <div>
                    <label htmlFor={endId} className="sr-only">
                      End time
                    </label>
                    <TimePicker
                      timeFormat={timeFormat}
                      id={endId}
                      value={endTime}
                      onValueChange={setEndTime}
                      ariaLabel="Event end time"
                      minuteStep={15}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-right text-[11px] text-foreground shadow-xs focus:ring-2"
                    />
                  </div>
                </div>
              </div>
            </div>
            {!range.valid ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive">
                <Clock3 className="size-3" /> End must be after start.
              </p>
            ) : range.multiDay ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 text-[11px] font-medium text-foreground">
                <CalendarRange className="size-3.5 text-primary" />
                Spans {range.dayCount} days
                <span className="text-muted-foreground">
                  · each day stays connected in the calendar
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <CalendarCategorySelect
              value={categoryId}
              onValueChange={setCategoryId}
              ariaLabel="New event category"
            />
          </div>

          <div className="mt-4">
            <label htmlFor={locationId} className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Location <span className="font-normal text-muted-foreground/65">optional</span>
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input id={locationId} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Add location or call link" className="pl-9" />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor={notesId} className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Notes <span className="font-normal text-muted-foreground/65">optional</span>
            </label>
            <Textarea id={notesId} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context" className="min-h-20" />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !range.valid}>
              Add event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
