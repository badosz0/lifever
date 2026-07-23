import {
  addDays as addDateFnsDays,
  addMinutes as addDateFnsMinutes,
  addMonths as addDateFnsMonths,
  addYears as addDateFnsYears,
  compareAsc,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  getMinutes,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isSameYear,
  parse,
  parseISO,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfDay,
  startOfMonth,
  startOfYear,
  startOfWeek as startOfDateFnsWeek,
  subDays as subDateFnsDays,
} from "date-fns";

import {
  formatUserDate,
  formatUserDateRange,
  formatUserMonthYear,
  formatUserTime,
  type DateFormatPreference,
  type TimeFormatPreference,
} from "@/lib/date-time-format";

export const HOUR_START = 0;
export const HOUR_END = 24;
export const MIN_HOUR_HEIGHT = 24;
export const SNAP_MINUTES = 15;

export type CalendarDateInput = Date | string;

export const toCalendarDate = (value: CalendarDateInput) =>
  typeof value === "string" ? parseISO(value) : value;

export const addDays = (date: Date, amount: number) => addDateFnsDays(date, amount);
export const addMinutes = (date: Date, amount: number) =>
  addDateFnsMinutes(date, amount);
export const addMonths = (date: Date, amount: number) =>
  addDateFnsMonths(date, amount);
export const addYears = (date: Date, amount: number) =>
  addDateFnsYears(date, amount);
export const subDays = (date: Date, amount: number) => subDateFnsDays(date, amount);
export const startOfLocalDay = (date: Date) => startOfDay(date);
export const startOfLocalMonth = (date: Date) => startOfMonth(date);
export const startOfLocalYear = (date: Date) => startOfYear(date);
export const startOfWeek = (date: Date) =>
  startOfDateFnsWeek(date, { weekStartsOn: 1 });

export const isSameLocalDay = (left: CalendarDateInput, right: CalendarDateInput) =>
  isSameDay(toCalendarDate(left), toCalendarDate(right));

export const isSameLocalMonth = (
  left: CalendarDateInput,
  right: CalendarDateInput,
) => isSameMonth(toCalendarDate(left), toCalendarDate(right));

export const isSameLocalYear = (
  left: CalendarDateInput,
  right: CalendarDateInput,
) => isSameYear(toCalendarDate(left), toCalendarDate(right));

export const isBeforeDate = (left: CalendarDateInput, right: CalendarDateInput) =>
  isBefore(toCalendarDate(left), toCalendarDate(right));

export const isAfterDate = (left: CalendarDateInput, right: CalendarDateInput) =>
  isAfter(toCalendarDate(left), toCalendarDate(right));

export const compareDates = (left: CalendarDateInput, right: CalendarDateInput) =>
  compareAsc(toCalendarDate(left), toCalendarDate(right));

export const durationInMinutes = (
  start: CalendarDateInput,
  end: CalendarDateInput,
) => differenceInMinutes(toCalendarDate(end), toCalendarDate(start));

export const formatDurationMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const days = Math.floor(safeMinutes / (24 * 60));
  const hours = Math.floor((safeMinutes % (24 * 60)) / 60);
  const remainingMinutes = safeMinutes % 60;
  if (days > 0) {
    return `${days}d${hours ? ` ${hours}h` : remainingMinutes ? ` ${remainingMinutes}m` : ""}`;
  }
  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ""}`;
};

export const daysBetween = (left: Date, right: Date) =>
  differenceInCalendarDays(left, right);

export const dateKey = (date: CalendarDateInput) =>
  format(toCalendarDate(date), "yyyy-MM-dd");

export const timeInputValue = (date: CalendarDateInput) =>
  format(toCalendarDate(date), "HH:mm");

export const combineDateAndTime = (date: string, time: string) =>
  parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());

export const setCalendarTime = (date: Date, hour: number, minute = 0) =>
  setMilliseconds(setSeconds(setMinutes(setHours(date, hour), minute), 0), 0);

export const setMinutesIntoDay = (date: Date, minutes: number) =>
  setMinutes(startOfDay(date), minutes);

export const minutesIntoDay = (date: CalendarDateInput) => {
  const value = toCalendarDate(date);
  return differenceInMinutes(value, startOfDay(value));
};

export const formatTime = (
  date: CalendarDateInput,
  timeFormat: TimeFormatPreference = "system",
) => formatUserTime(toCalendarDate(date), timeFormat);

export const formatHour = (
  hour: number,
  timeFormat: TimeFormatPreference = "system",
) => formatUserTime(setHours(startOfDay(new Date()), hour), timeFormat);

export const formatEventRange = (
  startAt: CalendarDateInput,
  endAt: CalendarDateInput,
  timeFormat: TimeFormatPreference = "system",
) => `${formatTime(startAt, timeFormat)}–${formatTime(endAt, timeFormat)}`;

export const formatFullDay = (
  date: CalendarDateInput,
  dateFormat: DateFormatPreference = "system",
) =>
  formatUserDate(toCalendarDate(date), dateFormat, {
    includeYear: true,
    length: "long",
    weekday: "long",
  });

export const formatWeekday = (date: CalendarDateInput) =>
  format(toCalendarDate(date), "EEEE");

export const formatShortWeekday = (date: CalendarDateInput) =>
  format(toCalendarDate(date), "EEE");

export const formatDayOfMonth = (date: CalendarDateInput) =>
  format(toCalendarDate(date), "d");

export const formatMonthName = (date: CalendarDateInput) =>
  format(toCalendarDate(date), "MMMM");

export const formatCalendarTitle = (
  date: Date,
  mode: "year" | "month" | "week" | "day",
  dateFormat: DateFormatPreference = "system",
) => {
  if (mode === "year") return format(date, "yyyy");
  if (mode === "month") return formatUserMonthYear(date, dateFormat);
  if (mode === "day") return formatFullDay(date, dateFormat);

  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return formatUserDateRange(
    start,
    end,
    dateFormat,
    true,
  );
};

export const getEventRangeFromInputs = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
) => {
  const start = combineDateAndTime(startDate, startTime);
  const end = combineDateAndTime(endDate, endTime);
  const dayCount =
    Math.max(
      0,
      differenceInCalendarDays(startOfDay(end), startOfDay(start)),
    ) + 1;

  return {
    start,
    end,
    dayCount,
    multiDay: !isSameDay(start, end),
    valid: isAfter(end, start),
  };
};

export const getDefaultEventRange = (date = new Date()) => {
  let start = setMilliseconds(setSeconds(date, 0), 0);
  start = setMinutes(start, Math.ceil(getMinutes(start) / 30) * 30);
  return { start, end: addMinutes(start, 60) };
};
