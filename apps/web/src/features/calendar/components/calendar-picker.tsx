import { Check, ChevronDown, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type { CalendarCollection } from "@/features/calendar/model/types";
import { cn } from "@/lib/cn";

type CalendarPickerProps = {
  onManage: () => void;
};

const sourceLabel: Record<CalendarCollection["source"], string> = {
  lifever: "Lifever",
  google: "Google",
  app: "Apps",
};

export function CalendarPicker({ onManage }: CalendarPickerProps) {
  const {
    activeCalendarId,
    calendars,
    setActiveCalendarId,
    setCalendarVisibility,
  } = useCalendar();
  const writable = calendars.filter((calendar) => calendar.writable);
  const active =
    writable.find((calendar) => calendar.id === activeCalendarId) ??
    writable[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 min-w-0 max-w-[210px] justify-start px-2 text-[13px]"
        >
          <span
            className="size-2.5 shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
            style={{ backgroundColor: active?.color }}
          />
          <span className="truncate">{active?.name ?? "Calendars"}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>New events go to</DropdownMenuLabel>
        {writable.map((calendar) => (
          <DropdownMenuItem
            key={calendar.id}
            onSelect={() => setActiveCalendarId(calendar.id)}
          >
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: calendar.color }}
            />
            <span className="min-w-0 flex-1 truncate">{calendar.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {sourceLabel[calendar.source]}
            </span>
            <Check
              className={cn(
                "size-3.5 text-primary",
                calendar.id === activeCalendarId
                  ? "opacity-100"
                  : "opacity-0",
              )}
              strokeWidth={2.6}
            />
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Shown calendars</DropdownMenuLabel>
        {calendars.map((calendar) => (
          <DropdownMenuCheckboxItem
            key={calendar.id}
            checked={calendar.visible}
            indicatorSide="right"
            onCheckedChange={(checked) =>
              setCalendarVisibility(calendar.id, checked === true)
            }
            onSelect={(event) => event.preventDefault()}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: calendar.color }}
              />
              <span className="min-w-0 flex-1 truncate">{calendar.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {sourceLabel[calendar.source]}
              </span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onManage}>
          <Settings2 className="size-3.5" />
          Manage calendars…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
