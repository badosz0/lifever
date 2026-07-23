import { CalendarDays, Clock3 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { reminderControlValueClassName } from "@/features/reminders/components/reminder-control-styles";
import {
  combineReminderDate,
  combineReminderTime,
  getTimeValue,
} from "@/features/reminders/lib/schedule";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { formatUserDate } from "@/lib/date-time-format";
import { cn } from "@/lib/cn";

type ReminderSchedulePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

export function ReminderSchedulePicker({ value, onChange }: ReminderSchedulePickerProps) {
  const { dateFormat, timeFormat } = useUserPreferences();
  const dueDate = value ? new Date(value) : null;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => dueDate ?? new Date());

  return (
    <>
      <div className="flex min-h-11 items-center gap-3 border-b border-border/70 px-3">
        <CalendarDays className="size-4 text-blue-500" />
        <span className="flex-1 text-[13px] font-medium">Date</span>
        <Popover
          open={calendarOpen}
          onOpenChange={(open) => {
            if (open) setVisibleMonth(dueDate ?? new Date());
            setCalendarOpen(open);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(reminderControlValueClassName, "justify-end")}
            >
              {dueDate
                ? formatUserDate(dueDate, dateFormat, {
                    includeYear: true,
                  })
                : "Add date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dueDate ?? undefined}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              onSelect={(day) => {
                if (!day) return;
                onChange(combineReminderDate(day, dueDate));
                setCalendarOpen(false);
              }}
            />
            {dueDate ? (
              <div className="border-t border-border/70 p-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-muted-foreground"
                  onClick={() => {
                    onChange(null);
                    setCalendarOpen(false);
                  }}
                >
                  Remove date
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-h-11 items-center gap-3 border-b border-border/70 px-3">
        <Clock3 className="size-4 text-indigo-500" />
        <span className="flex-1 text-[13px] font-medium">Time</span>
        <TimePicker
          timeFormat={timeFormat}
          value={dueDate ? getTimeValue(dueDate) : undefined}
          onValueChange={(time) => {
            onChange(combineReminderTime(dueDate ?? new Date(), time));
          }}
          placeholder="Add time"
          className={reminderControlValueClassName}
        />
      </div>
    </>
  );
}
