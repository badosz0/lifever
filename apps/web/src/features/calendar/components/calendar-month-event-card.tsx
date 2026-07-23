import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DragEventHandler } from "react";

import {
  durationInMinutes,
  formatDurationMinutes,
  formatEventRange,
} from "@/features/calendar/lib/dates";
import { getCalendarCategoryStyle } from "@/features/calendar/lib/categories";
import type { CalendarCategory } from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type CalendarMonthEventCardProps = {
  category: CalendarCategory;
  continuesAfter?: boolean;
  continuesBefore?: boolean;
  dragging?: boolean;
  endAt: Date | string;
  preview?: boolean;
  selected?: boolean;
  startAt: Date | string;
  title: string;
  onClick?: () => void;
  onDragEnd?: DragEventHandler<HTMLButtonElement>;
  onDragStart?: DragEventHandler<HTMLButtonElement>;
};

export function CalendarMonthEventCard({
  category,
  continuesAfter,
  continuesBefore,
  dragging,
  endAt,
  preview,
  selected,
  startAt,
  title,
  onClick,
  onDragEnd,
  onDragStart,
}: CalendarMonthEventCardProps) {
  const { timeFormat } = useUserPreferences();
  const durationLabel = formatDurationMinutes(
    Math.max(15, durationInMinutes(startAt, endAt)),
  );
  const className = cn(
    "flex h-[18px] w-full min-w-0 items-center gap-1 rounded border border-[var(--category-border)] bg-[var(--category-surface)] px-1 text-left text-[var(--category-text)] outline-none",
    preview && "ring-1 ring-[var(--category-color)]",
    !preview && "focus-visible:ring-2 focus-visible:ring-[var(--category-color)]",
    selected && "z-[2] ring-2",
    selected && "ring-[var(--category-color)] shadow-[0_3px_10px_var(--category-highlight)]",
    dragging && "opacity-55",
    continuesBefore && !continuesAfter &&
      "-ml-1 w-[calc(100%+4px)] rounded-l-none border-l-0 pl-0.5",
    continuesAfter && !continuesBefore &&
      "w-[calc(100%+4px)] rounded-r-none border-r-0 pr-0.5",
    continuesBefore && continuesAfter &&
      "-ml-1 w-[calc(100%+8px)] rounded-none border-x-0 px-0.5",
  );
  const content = (
    <>
      {continuesBefore ? (
        <ChevronLeft
          className="size-2.5 shrink-0 opacity-65"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-[9px] leading-3 font-semibold">
        {title || "New event"}
      </span>
      <span className="shrink-0 text-[7px] leading-3 font-medium tabular-nums opacity-55">
        {durationLabel}
      </span>
      {continuesAfter ? (
        <ChevronRight
          className="size-2.5 shrink-0 opacity-65"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  if (preview) {
    return (
      <div
        className={className}
        style={getCalendarCategoryStyle(category)}
        aria-hidden="true"
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      draggable
      className={cn(className, "cursor-pointer")}
      style={getCalendarCategoryStyle(category)}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`${title}, ${formatEventRange(startAt, endAt, timeFormat)}, ${durationLabel}${continuesBefore ? ", continues from the previous day" : ""}${continuesAfter ? ", continues into the next day" : ""}. Drag to move to another day.`}
      aria-pressed={selected}
    >
      {content}
    </button>
  );
}
