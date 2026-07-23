import { formatDurationMinutes } from "@/features/calendar/lib/dates";
import {
  defaultCalendarCategory,
  getCalendarCategoryStyle,
} from "@/features/calendar/lib/categories";
import type { CalendarCategory } from "@/features/calendar/model/types";
import { cn } from "@/lib/cn";

type CalendarEventDraftProps = {
  category?: CalendarCategory;
  continuesAfter?: boolean;
  continuesBefore?: boolean;
  durationMinutes?: number;
  endLabel: string;
  height: number;
  startLabel: string;
  title?: string;
  top: number;
};

export function CalendarEventDraft({
  category = defaultCalendarCategory,
  continuesAfter,
  continuesBefore,
  durationMinutes,
  endLabel,
  height,
  startLabel,
  title,
  top,
}: CalendarEventDraftProps) {
  const compact = height < 22;
  const compactTitle = title !== undefined && height < 18;
  const titleContent = (
    <>
      <span className="min-w-0 flex-1 truncate text-[11px] leading-4 font-semibold tracking-[-0.005em]">
        {title || "New event"}
      </span>
      {durationMinutes !== undefined ? (
        <span className="shrink-0 text-[9px] leading-4 font-medium tabular-nums opacity-55">
          {formatDurationMinutes(durationMinutes)}
        </span>
      ) : null}
    </>
  );

  return (
    <div
      data-calendar-event-draft
      className={cn(
        "pointer-events-none absolute right-1 left-1 z-[6] rounded-md border-2 border-[var(--category-border)] bg-[var(--category-surface)] px-1.5 py-0.5 text-[var(--category-text)] ring-1 ring-[var(--category-color)]",
        title !== undefined && !compactTitle && "overflow-hidden",
        continuesBefore && "rounded-t-none border-t-0",
        continuesAfter && "rounded-b-none border-b-0",
      )}
      style={{ ...getCalendarCategoryStyle(category), top, height }}
      aria-hidden="true"
    >
      {compactTitle ? (
        <span
          className="absolute top-0 left-0 flex max-w-full min-w-[92px] -translate-y-[calc(100%+3px)] items-center gap-1.5 rounded-md border border-[var(--category-border)] bg-[var(--category-surface)] px-1.5 py-0.5 shadow-sm"
        >
          {titleContent}
        </span>
      ) : title !== undefined ? (
        <span className="flex w-full min-w-0 items-center gap-1.5">
          {titleContent}
        </span>
      ) : null}
      <span
        className={cn(
          "whitespace-nowrap text-[10px] leading-4 font-semibold tabular-nums",
          title !== undefined && !compactTitle && "block w-full truncate opacity-70",
          compactTitle && "hidden",
          title === undefined && "absolute left-1.5",
          title === undefined && compact
            ? "top-0 -translate-y-[calc(100%+3px)] rounded-md border border-[var(--category-border)] bg-[var(--category-surface)] px-1.5 py-0.5 shadow-sm"
            : title === undefined
              ? "top-0.5"
              : height < 32
                ? "hidden"
                : "",
        )}
      >
        {startLabel}–{endLabel}
      </span>
    </div>
  );
}
