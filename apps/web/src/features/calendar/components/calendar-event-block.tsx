import { MapPin } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { CalendarEventResizeHandle } from "@/features/calendar/components/calendar-event-resize-handle";
import { CalendarEventContextMenu } from "@/features/calendar/components/calendar-event-context-menu";
import {
  addDays,
  addMinutes,
  durationInMinutes,
  formatDurationMinutes,
  formatEventRange,
  formatTime,
  HOUR_END,
  HOUR_START,
  isSameLocalDay,
  minutesIntoDay,
  SNAP_MINUTES,
  toCalendarDate,
} from "@/features/calendar/lib/dates";
import {
  getCalendarEventCategory,
  getCalendarCategoryStyle,
} from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type { CalendarEvent } from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type PointerMode = "move" | "resize-start" | "resize-end";

type DragPreview = {
  active: boolean;
  columnWidth: number;
  dayDelta: number;
  endMinuteDelta: number;
  mode: PointerMode | null;
  startMinuteDelta: number;
};

type CalendarEventBlockProps = {
  continuesAfter: boolean;
  continuesBefore: boolean;
  displayEnd: Date;
  displayStart: Date;
  event: CalendarEvent;
  dayIndex: number;
  dayCount: number;
  leftPercent: number;
  overlapping: boolean;
  widthPercent: number;
  hourHeight: number;
  selected: boolean;
  onInteractionCommit: () => void;
  onSelect: (id: string) => void;
  onMove: (id: string, startAt: string, endAt: string) => void;
};

const EMPTY_PREVIEW: DragPreview = {
  active: false,
  columnWidth: 0,
  dayDelta: 0,
  endMinuteDelta: 0,
  mode: null,
  startMinuteDelta: 0,
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function CalendarEventBlock({
  continuesAfter,
  continuesBefore,
  displayEnd,
  displayStart,
  event,
  dayIndex,
  dayCount,
  leftPercent,
  overlapping,
  widthPercent,
  hourHeight,
  selected,
  onInteractionCommit,
  onSelect,
  onMove,
}: CalendarEventBlockProps) {
  const { categories } = useCalendar();
  const { timeFormat } = useUserPreferences();
  const category = getCalendarEventCategory(categories, event);
  const pointer = useRef<{
    id: number;
    startX: number;
    startY: number;
    columnWidth: number;
    mode: PointerMode;
    moved: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<DragPreview>(EMPTY_PREVIEW);
  const start = toCalendarDate(event.startAt);
  const end = toCalendarDate(event.endAt);
  const startMinute = minutesIntoDay(start);
  const endMinute = isSameLocalDay(end, displayStart)
    ? minutesIntoDay(end)
    : HOUR_END * 60;
  const displayStartMinute = continuesBefore
    ? HOUR_START * 60
    : minutesIntoDay(displayStart);
  const displayEndMinute =
    continuesAfter || !isSameLocalDay(displayStart, displayEnd)
    ? HOUR_END * 60
    : minutesIntoDay(displayEnd);
  const durationMinutes = Math.max(15, durationInMinutes(start, end));
  const displayDurationMinutes = Math.max(
    15,
    displayEndMinute - displayStartMinute,
  );
  const top =
    ((displayStartMinute - HOUR_START * 60) / 60) * hourHeight;
  const visibleStartDelta = preview.active ? preview.startMinuteDelta : 0;
  const visibleEndDelta = preview.active ? preview.endMinuteDelta : 0;
  const visibleDuration =
    displayDurationMinutes + visibleEndDelta - visibleStartDelta;
  const visibleEventDuration =
    durationMinutes + visibleEndDelta - visibleStartDelta;
  const visibleTop = top + (visibleStartDelta / 60) * hourHeight;
  const visibleHeight = Math.max(
    24,
    (visibleDuration / 60) * hourHeight - 2,
  );
  const durationLabel = formatDurationMinutes(visibleEventDuration);

  const previewRange = useMemo(() => {
    const movedStart = addMinutes(
      addDays(start, preview.dayDelta),
      preview.startMinuteDelta,
    );
    const movedEnd = addMinutes(
      addDays(end, preview.dayDelta),
      preview.endMinuteDelta,
    );
    return formatEventRange(
      movedStart.toISOString(),
      movedEnd.toISOString(),
      timeFormat,
    );
  }, [
    end,
    preview.dayDelta,
    preview.endMinuteDelta,
    preview.startMinuteDelta,
    start,
    timeFormat,
  ]);
  const segmentRangeLabel =
    continuesBefore && continuesAfter
      ? "Continues all day"
      : continuesBefore
        ? `Until ${formatTime(end, timeFormat)}`
        : continuesAfter
          ? `From ${formatTime(start, timeFormat)} · continues`
          : formatEventRange(event.startAt, event.endAt, timeFormat);
  const resizeInstruction =
    !continuesBefore || !continuesAfter
      ? ", drag the first or last edge to resize"
      : "";

  const getDeltas = (clientX: number, clientY: number) => {
    const activePointer = pointer.current;
    if (!activePointer) {
      return { dayDelta: 0, endMinuteDelta: 0, startMinuteDelta: 0 };
    }

    const rawMinuteDelta =
      ((clientY - activePointer.startY) / hourHeight) * 60;
    const snappedMinuteDelta =
      Math.round(rawMinuteDelta / SNAP_MINUTES) * SNAP_MINUTES;

    if (activePointer.mode === "resize-start") {
      return {
        dayDelta: 0,
        endMinuteDelta: 0,
        startMinuteDelta: clamp(
          snappedMinuteDelta,
          HOUR_START * 60 - startMinute,
          durationMinutes - SNAP_MINUTES,
        ),
      };
    }

    if (activePointer.mode === "resize-end") {
      return {
        dayDelta: 0,
        endMinuteDelta: clamp(
          snappedMinuteDelta,
          SNAP_MINUTES - durationMinutes,
          HOUR_END * 60 - endMinute,
        ),
        startMinuteDelta: 0,
      };
    }

    const rawDayDelta = Math.round(
      (clientX - activePointer.startX) / activePointer.columnWidth,
    );
    const dayDelta = Math.min(
      dayCount - 1 - dayIndex,
      Math.max(-dayIndex, rawDayDelta),
    );
    const minDelta = HOUR_START * 60 - displayStartMinute;
    const maxDelta = HOUR_END * 60 - displayEndMinute;
    const minuteDelta =
      continuesBefore || continuesAfter
        ? snappedMinuteDelta
        : clamp(snappedMinuteDelta, minDelta, maxDelta);
    return {
      dayDelta,
      endMinuteDelta: minuteDelta,
      startMinuteDelta: minuteDelta,
    };
  };

  const handlePointerDown = (
    pointerEvent: PointerEvent<HTMLElement>,
    mode: PointerMode,
  ) => {
    if (event.readOnly || pointer.current || pointerEvent.button !== 0) return;
    const columnWidth = pointerEvent.currentTarget
      .closest('[role="gridcell"]')
      ?.getBoundingClientRect().width;
    if (!columnWidth) return;
    pointer.current = {
      id: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      columnWidth,
      mode,
      moved: false,
    };
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    setPreview({ ...EMPTY_PREVIEW, columnWidth, mode });
  };

  const handlePointerMove = (pointerEvent: PointerEvent<HTMLElement>) => {
    const activePointer = pointer.current;
    if (!activePointer || activePointer.id !== pointerEvent.pointerId) return;
    const distance = Math.hypot(
      pointerEvent.clientX - activePointer.startX,
      pointerEvent.clientY - activePointer.startY,
    );
    activePointer.moved ||= distance > 6;
    const deltas = getDeltas(pointerEvent.clientX, pointerEvent.clientY);
    setPreview({
      ...deltas,
      columnWidth: activePointer.columnWidth,
      mode: activePointer.mode,
      active: activePointer.moved,
    });
  };

  const finishPointer = (pointerEvent: PointerEvent<HTMLElement>) => {
    const activePointer = pointer.current;
    if (!activePointer || activePointer.id !== pointerEvent.pointerId) return;
    const deltas = getDeltas(pointerEvent.clientX, pointerEvent.clientY);
    const moved =
      activePointer.moved ||
      Math.hypot(
        pointerEvent.clientX - activePointer.startX,
        pointerEvent.clientY - activePointer.startY,
      ) > 6;
    pointer.current = null;
    setPreview(EMPTY_PREVIEW);

    if (moved) {
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      onInteractionCommit();
      const movedStart = addMinutes(
        addDays(start, deltas.dayDelta),
        deltas.startMinuteDelta,
      );
      const movedEnd = addMinutes(
        addDays(end, deltas.dayDelta),
        deltas.endMinuteDelta,
      );
      onMove(event.id, movedStart.toISOString(), movedEnd.toISOString());
    }
    onSelect(event.id);
  };

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLButtonElement>) => {
    if (event.readOnly || !keyboardEvent.altKey) return;

    if (
      keyboardEvent.shiftKey &&
      (keyboardEvent.key === "ArrowUp" ||
        keyboardEvent.key === "ArrowDown")
    ) {
      keyboardEvent.preventDefault();
      if (continuesAfter) return;
      const endDelta =
        keyboardEvent.key === "ArrowUp" ? -SNAP_MINUTES : SNAP_MINUTES;
      const nextDuration = durationMinutes + endDelta;
      if (nextDuration < SNAP_MINUTES) {
        return;
      }
      if (
        endDelta > 0 &&
        minutesIntoDay(end) + endDelta > HOUR_END * 60
      ) {
        return;
      }
      onMove(
        event.id,
        start.toISOString(),
        addMinutes(end, endDelta).toISOString(),
      );
      onSelect(event.id);
      return;
    }

    let dayDelta = 0;
    let minuteDelta = 0;
    if (keyboardEvent.key === "ArrowUp") minuteDelta = -SNAP_MINUTES;
    if (keyboardEvent.key === "ArrowDown") minuteDelta = SNAP_MINUTES;
    if (keyboardEvent.key === "ArrowLeft") dayDelta = -1;
    if (keyboardEvent.key === "ArrowRight") dayDelta = 1;
    if (dayDelta === 0 && minuteDelta === 0) return;

    keyboardEvent.preventDefault();
    const movedStart = addMinutes(addDays(start, dayDelta), minuteDelta);
    const movedEnd = addMinutes(addDays(end, dayDelta), minuteDelta);
    const movedDisplayStartMinute = displayStartMinute + minuteDelta;
    const movedDisplayEndMinute = displayEndMinute + minuteDelta;
    if (
      (!(continuesBefore || continuesAfter) &&
        (movedDisplayStartMinute < HOUR_START * 60 ||
          movedDisplayEndMinute > HOUR_END * 60)) ||
      dayIndex + dayDelta < 0 ||
      dayIndex + dayDelta >= dayCount
    ) {
      return;
    }
    onMove(event.id, movedStart.toISOString(), movedEnd.toISOString());
    onSelect(event.id);
  };

  return (
    <CalendarEventContextMenu event={event}>
      <button
        type="button"
        onPointerDown={(pointerEvent) =>
          handlePointerDown(pointerEvent, "move")
        }
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={() => {
          pointer.current = null;
          setPreview(EMPTY_PREVIEW);
        }}
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onSelect(event.id);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "group absolute z-[2] flex cursor-pointer flex-col items-start justify-start overflow-hidden rounded-md border border-[var(--category-border)] bg-[var(--category-surface)] px-1.5 py-0.5 text-left text-[var(--category-text)] outline-none transition-[box-shadow,filter] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--category-color)] focus-visible:ring-offset-1 motion-reduce:transition-none",
          selected && "z-[5] ring-2",
          selected && "ring-[var(--category-color)] shadow-[0_5px_18px_var(--category-highlight)]",
          overlapping &&
            !selected &&
            "shadow-[0_2px_7px_rgb(0_0_0/.1)]",
          overlapping && "hover:z-[4] focus:z-[6]",
          preview.active &&
            "z-20 shadow-[0_14px_34px_rgb(0_0_0/.2)] brightness-[1.03]",
          preview.active && preview.mode === "move" && "cursor-grabbing",
          preview.active && preview.mode !== "move" && "cursor-ns-resize",
          continuesBefore && "rounded-t-none border-t-0",
          continuesAfter && "rounded-b-none border-b-0",
        )}
        style={{
          ...getCalendarCategoryStyle(category),
          top: visibleTop,
          height: visibleHeight,
          left: `calc(${leftPercent}% + 4px)`,
          width: `calc(${widthPercent}% - 6px)`,
          minHeight: 24,
          touchAction: "none",
          transform: preview.active
            ? `translate3d(${preview.dayDelta * preview.columnWidth}px, 0, 0)`
            : undefined,
          willChange: preview.active ? "transform, top, height" : undefined,
        }}
        aria-label={`${event.title}, ${preview.active ? previewRange : formatEventRange(event.startAt, event.endAt, timeFormat)}${continuesBefore ? ", continues from the previous day" : ""}${continuesAfter ? ", continues into the next day" : ""}.${event.readOnly ? " Read only." : ` Drag to reschedule${resizeInstruction}, or use Alt and arrow keys.`}`}
        aria-pressed={selected}
      >
      {!event.readOnly && !continuesBefore ? (
        <CalendarEventResizeHandle
          edge="start"
          onPointerDown={(pointerEvent) => {
            pointerEvent.stopPropagation();
            handlePointerDown(pointerEvent, "resize-start");
          }}
          onPointerMove={(pointerEvent) => {
            pointerEvent.stopPropagation();
            handlePointerMove(pointerEvent);
          }}
          onPointerUp={(pointerEvent) => {
            pointerEvent.stopPropagation();
            finishPointer(pointerEvent);
          }}
          onPointerCancel={(pointerEvent) => {
            pointerEvent.stopPropagation();
            pointer.current = null;
            setPreview(EMPTY_PREVIEW);
          }}
        />
      ) : null}
      <span className="flex w-full min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[11px] leading-4 font-semibold tracking-[-0.005em]">
          {event.title}
        </span>
        <span className="shrink-0 text-[9px] leading-4 font-medium tabular-nums opacity-55">
          {durationLabel}
        </span>
      </span>
      {visibleHeight >= 32 ? (
        <span className="block w-full truncate text-[9px] leading-3 font-medium opacity-70">
          {preview.active
            ? previewRange
            : segmentRangeLabel}
        </span>
      ) : null}
      {visibleHeight >= 48 && event.location ? (
        <span className="mt-0.5 flex w-full items-center gap-1 truncate text-[9px] leading-3 opacity-65">
          <MapPin className="size-2.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </span>
      ) : null}
      {!event.readOnly && !continuesAfter ? (
        <CalendarEventResizeHandle
          edge="end"
          onPointerDown={(pointerEvent) => {
            pointerEvent.stopPropagation();
            handlePointerDown(pointerEvent, "resize-end");
          }}
          onPointerMove={(pointerEvent) => {
            pointerEvent.stopPropagation();
            handlePointerMove(pointerEvent);
          }}
          onPointerUp={(pointerEvent) => {
            pointerEvent.stopPropagation();
            finishPointer(pointerEvent);
          }}
          onPointerCancel={(pointerEvent) => {
            pointerEvent.stopPropagation();
            pointer.current = null;
            setPreview(EMPTY_PREVIEW);
          }}
        />
      ) : null}
      </button>
    </CalendarEventContextMenu>
  );
}
