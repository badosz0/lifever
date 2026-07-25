import {
  HOUR_END,
  HOUR_START,
  SNAP_MINUTES,
} from "@/features/calendar/lib/dates";

export type CalendarDraftRange = {
  endMinute: number;
  startMinute: number;
};

type CalendarPositionOptions = {
  includeDayEnd?: boolean;
  rounding?: "floor" | "nearest";
};

const DAY_START_MINUTE = HOUR_START * 60;
const DAY_END_MINUTE = HOUR_END * 60;
const DEFAULT_EVENT_MINUTES = 60;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const minuteAtCalendarPosition = (
  position: number,
  hourHeight: number,
  {
    includeDayEnd = false,
    rounding = "nearest",
  }: CalendarPositionOptions = {},
) => {
  const rawMinute = DAY_START_MINUTE + (position / hourHeight) * 60;
  const snapMinute = rounding === "floor" ? Math.floor : Math.round;
  const snappedMinute = snapMinute(rawMinute / SNAP_MINUTES) * SNAP_MINUTES;
  return clamp(
    snappedMinute,
    DAY_START_MINUTE,
    includeDayEnd ? DAY_END_MINUTE : DAY_END_MINUTE - SNAP_MINUTES,
  );
};

export const getCalendarDraftRange = (
  anchorMinute: number,
  focusMinute: number,
  dragging: boolean,
  defaultDurationMinutes = DEFAULT_EVENT_MINUTES,
): CalendarDraftRange => {
  if (!dragging) {
    const snappedDuration = clamp(
      Math.round(defaultDurationMinutes / SNAP_MINUTES) * SNAP_MINUTES,
      SNAP_MINUTES,
      DAY_END_MINUTE - DAY_START_MINUTE,
    );
    return {
      startMinute: anchorMinute,
      endMinute: Math.min(DAY_END_MINUTE, anchorMinute + snappedDuration),
    };
  }

  if (focusMinute > anchorMinute) {
    return {
      startMinute: anchorMinute,
      endMinute: Math.max(anchorMinute + SNAP_MINUTES, focusMinute),
    };
  }

  if (focusMinute < anchorMinute) {
    return {
      startMinute: Math.min(anchorMinute - SNAP_MINUTES, focusMinute),
      endMinute: anchorMinute,
    };
  }

  if (anchorMinute + SNAP_MINUTES <= DAY_END_MINUTE) {
    return {
      startMinute: anchorMinute,
      endMinute: anchorMinute + SNAP_MINUTES,
    };
  }

  return {
    startMinute: anchorMinute - SNAP_MINUTES,
    endMinute: anchorMinute,
  };
};
