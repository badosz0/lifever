import { format, isValid, parse } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatUserDate,
  type DateFormatPreference,
} from "@/lib/date-time-format";
import { cn } from "@/lib/cn";

type DatePickerProps = {
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  dateFormat: DateFormatPreference;
  disabled?: boolean;
  id?: string;
  onValueChange: (value: string) => void;
  value: string;
};

const parseDateValue = (value: string) => {
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : null;
};

export function DatePicker({
  ariaLabel,
  className,
  compact,
  dateFormat,
  disabled,
  id,
  onValueChange,
  value,
}: DatePickerProps) {
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? new Date(),
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setVisibleMonth(selectedDate ?? new Date());
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "inline-flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-left text-[12px] font-medium text-foreground shadow-xs outline-none transition-[border-color,box-shadow,transform] duration-150 hover:border-foreground/25 active:scale-[.98] focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
            compact && "gap-1 px-1.5 text-[10px]",
            className,
          )}
        >
          <CalendarDays
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate tabular-nums">
            {selectedDate
              ? formatUserDate(selectedDate, dateFormat, {
                  includeYear: true,
                })
              : "Choose date"}
          </span>
          {!compact ? (
            <ChevronDown
              className="size-3 shrink-0 text-muted-foreground/70"
              aria-hidden="true"
            />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          selected={selectedDate ?? undefined}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
          onSelect={(day) => {
            if (!day) return;
            onValueChange(format(day, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
