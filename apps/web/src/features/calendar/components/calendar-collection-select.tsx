import { Cloud, LockKeyhole } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { cn } from "@/lib/cn";

type CalendarCollectionSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  writableOnly?: boolean;
};

export function CalendarCollectionSelect({
  value,
  onValueChange,
  ariaLabel = "Calendar",
  className,
  writableOnly = false,
}: CalendarCollectionSelectProps) {
  const { calendars } = useCalendar();
  const options = calendars.filter(
    (calendar) =>
      calendar.source !== "app" && (!writableOnly || calendar.writable),
  );
  const selected =
    options.find((calendar) => calendar.id === value) ?? options[0];

  if (!selected) return null;

  return (
    <Select value={selected.id} onValueChange={onValueChange}>
      <SelectTrigger aria-label={ariaLabel} className={cn("h-9", className)}>
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
            style={{ backgroundColor: selected.color }}
          />
          <span className="truncate text-[13px] font-medium">
            {selected.name}
          </span>
          {selected.source === "google" ? (
            <Cloud className="size-3 shrink-0 text-muted-foreground" />
          ) : null}
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((calendar) => (
          <SelectItem
            key={calendar.id}
            value={calendar.id}
            disabled={!calendar.writable}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
                style={{ backgroundColor: calendar.color }}
              />
              <span className="truncate">{calendar.name}</span>
              {calendar.source === "google" ? (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                  {calendar.writable ? (
                    "Google"
                  ) : (
                    <>
                      <LockKeyhole className="size-2.5" />
                      Read only
                    </>
                  )}
                </span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
