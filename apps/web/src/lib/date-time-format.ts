export type TimeFormatPreference = "system" | "12-hour" | "24-hour";
export type DateFormatPreference =
  | "system"
  | "month-day-year"
  | "day-month-year"
  | "year-month-day";

export type UserFormatPreferences = {
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
};

type DateLength = "short" | "long";
type WeekdayLength = "short" | "long";

type FormatUserDateOptions = {
  includeYear?: boolean;
  length?: DateLength;
  weekday?: WeekdayLength;
};

const toDate = (value: Date | string) =>
  typeof value === "string" ? new Date(value) : value;

const padNumber = (value: number) => String(value).padStart(2, "0");

const getMonthLabel = (date: Date, length: DateLength) =>
  new Intl.DateTimeFormat(undefined, {
    month: length === "long" ? "long" : "short",
  }).format(date);

const getWeekdayLabel = (date: Date, length: WeekdayLength) =>
  new Intl.DateTimeFormat(undefined, { weekday: length }).format(date);

export const formatUserTime = (
  value: Date | string,
  preference: TimeFormatPreference,
) => {
  const hourOptions =
    preference === "12-hour"
      ? { hourCycle: "h12" as const }
      : preference === "24-hour"
        ? { hourCycle: "h23" as const }
        : {};

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...hourOptions,
  }).format(toDate(value));
};

export const formatUserDate = (
  value: Date | string,
  preference: DateFormatPreference,
  {
    includeYear = true,
    length = "short",
    weekday,
  }: FormatUserDateOptions = {},
) => {
  const date = toDate(value);
  const weekdayLabel = weekday ? getWeekdayLabel(date, weekday) : null;

  if (preference === "system") {
    return new Intl.DateTimeFormat(undefined, {
      day: length === "long" ? "numeric" : "2-digit",
      month: length === "long" ? "long" : "2-digit",
      weekday,
      year: includeYear ? "numeric" : undefined,
    }).format(date);
  }

  const month = getMonthLabel(date, length);
  const day = date.getDate();
  const year = date.getFullYear();
  let formatted: string;

  if (length === "short" && preference === "month-day-year") {
    formatted = `${padNumber(date.getMonth() + 1)}/${padNumber(day)}${includeYear ? `/${year}` : ""}`;
  } else if (length === "short" && preference === "day-month-year") {
    formatted = `${padNumber(day)}/${padNumber(date.getMonth() + 1)}${includeYear ? `/${year}` : ""}`;
  } else if (preference === "month-day-year") {
    formatted = `${month} ${day}${includeYear ? `, ${year}` : ""}`;
  } else if (preference === "day-month-year") {
    formatted = `${day} ${month}${includeYear ? ` ${year}` : ""}`;
  } else {
    const isoDate = `${year}-${padNumber(date.getMonth() + 1)}-${padNumber(day)}`;
    formatted = includeYear ? isoDate : isoDate.slice(5);
  }

  return weekdayLabel ? `${weekdayLabel}, ${formatted}` : formatted;
};

export const formatUserMonthYear = (
  value: Date | string,
  preference: DateFormatPreference,
) => {
  const date = toDate(value);
  if (preference === "year-month-day") {
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
};

export const formatUserDateRange = (
  startValue: Date | string,
  endValue: Date | string,
  preference: DateFormatPreference,
  includeYear: boolean,
) => {
  const start = toDate(startValue);
  const end = toDate(endValue);
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (preference === "system") {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: includeYear ? "numeric" : undefined,
    }).formatRange(start, end);
  }

  if (preference === "year-month-day") {
    const startLabel = formatUserDate(start, preference, { includeYear: true });
    if (sameMonth) return `${startLabel}–${padNumber(end.getDate())}`;
    return `${startLabel}–${formatUserDate(end, preference, { includeYear: true })}`;
  }

  const startMonth = getMonthLabel(start, "short");
  const endMonth = getMonthLabel(end, "short");
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (sameMonth) {
    return preference === "month-day-year"
      ? `${startMonth} ${start.getDate()}–${end.getDate()}${includeYear ? `, ${startYear}` : ""}`
      : `${start.getDate()}–${end.getDate()} ${startMonth}${includeYear ? ` ${startYear}` : ""}`;
  }

  if (preference === "month-day-year") {
    const startLabel = `${startMonth} ${start.getDate()}${includeYear && !sameYear ? `, ${startYear}` : ""}`;
    const endLabel = `${endMonth} ${end.getDate()}${includeYear ? `, ${endYear}` : ""}`;
    return `${startLabel}–${endLabel}`;
  }

  const startLabel = `${start.getDate()} ${startMonth}${includeYear && !sameYear ? ` ${startYear}` : ""}`;
  const endLabel = `${end.getDate()} ${endMonth}${includeYear ? ` ${endYear}` : ""}`;
  return `${startLabel}–${endLabel}`;
};
