import type { CalendarEvent } from "@/features/calendar/model/types";

import {
  addDays,
  isAfterDate,
  isBeforeDate,
  startOfLocalDay,
  toCalendarDate,
  type CalendarDateInput,
} from "./dates";

export type CalendarIntervalSegment = {
  continuesAfter: boolean;
  continuesBefore: boolean;
  end: Date;
  start: Date;
};

export type CalendarEventDaySegment = CalendarIntervalSegment & {
  event: CalendarEvent;
  endAt: Date;
  startAt: Date;
};

export const getCalendarIntervalSegment = (
  intervalStart: CalendarDateInput,
  intervalEnd: CalendarDateInput,
  day: Date,
): CalendarIntervalSegment | null => {
  const start = toCalendarDate(intervalStart);
  const end = toCalendarDate(intervalEnd);
  const dayStart = startOfLocalDay(day);
  const dayEnd = addDays(dayStart, 1);

  // Calendar intervals are half-open: an event ending at midnight does not
  // occupy the following day.
  if (!isAfterDate(end, dayStart) || !isBeforeDate(start, dayEnd)) {
    return null;
  }

  const continuesBefore = isBeforeDate(start, dayStart);
  const continuesAfter = isAfterDate(end, dayEnd);

  return {
    continuesAfter,
    continuesBefore,
    end: continuesAfter ? dayEnd : end,
    start: continuesBefore ? dayStart : start,
  };
};

export const getCalendarEventSegment = (
  event: CalendarEvent,
  day: Date,
): CalendarEventDaySegment | null => {
  const segment = getCalendarIntervalSegment(event.startAt, event.endAt, day);
  if (!segment) return null;

  return {
    ...segment,
    event,
    endAt: segment.end,
    startAt: segment.start,
  };
};

export const intervalOverlapsRange = (
  intervalStart: CalendarDateInput,
  intervalEnd: CalendarDateInput,
  rangeStart: CalendarDateInput,
  rangeEnd: CalendarDateInput,
) =>
  isAfterDate(intervalEnd, rangeStart) &&
  isBeforeDate(intervalStart, rangeEnd);
