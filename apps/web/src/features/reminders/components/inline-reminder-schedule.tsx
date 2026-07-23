import { CalendarDays, Clock3, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { formatReminderDate, isBeforeToday } from "@/features/reminders/lib/dates";
import {
  combineReminderDate,
  combineReminderTime,
  getTimeValue,
} from "@/features/reminders/lib/schedule";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type InlineReminderScheduleProps = {
  value: string | null;
  title: string;
  completed: boolean;
  onSelect: () => void;
  onChange: (value: string | null) => void;
};

export function InlineReminderSchedule({
  value,
  title,
  completed,
  onSelect,
  onChange,
}: InlineReminderScheduleProps) {
  const { dateFormat, timeFormat } = useUserPreferences();
  const dueDate = value ? new Date(value) : null;
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => dueDate ?? new Date());

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onSelect();
          setVisibleMonth(dueDate ?? new Date());
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          style={{ fontSize: 11, fontWeight: 500, lineHeight: "16px" }}
          className={cn(
            "-ml-1 inline-flex h-5 items-center gap-1 rounded-md px-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            value && isBeforeToday(value) && !completed && "text-destructive",
          )}
          aria-label={`Edit date and time for ${title}`}
        >
          <CalendarDays className="size-3" />
          {value ? formatReminderDate(value, { dateFormat, timeFormat }) : "Add date"}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          selected={dueDate ?? undefined}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
          onSelect={(day) => {
            if (day) onChange(combineReminderDate(day, dueDate));
          }}
        />

        <div className="flex min-h-11 items-center gap-3 border-t border-border/70 px-3">
          <Clock3 className="size-4 text-indigo-500" />
          <span className="flex-1 text-[13px] font-medium">Time</span>
          <TimePicker
            timeFormat={timeFormat}
            value={dueDate ? getTimeValue(dueDate) : undefined}
            onValueChange={(time) => {
              onChange(combineReminderTime(dueDate ?? new Date(), time));
            }}
            placeholder="Add time"
          />
        </div>

        {dueDate ? (
          <div className="border-t border-border/70 p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X className="size-3.5" />
              Remove date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
