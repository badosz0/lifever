import {
  formatUserDate,
  formatUserTime,
  type UserFormatPreferences,
} from "@/lib/date-time-format";

export const isSameLocalDay = (value: string | null, date = new Date()) => {
  if (!value) return false;
  const candidate = new Date(value);
  return (
    candidate.getFullYear() === date.getFullYear() &&
    candidate.getMonth() === date.getMonth() &&
    candidate.getDate() === date.getDate()
  );
};

export const isBeforeToday = (value: string | null) => {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value).getTime() < today.getTime();
};

export const formatReminderTime = (
  value: string,
  { timeFormat }: UserFormatPreferences,
) => formatUserTime(value, timeFormat);

export const formatReminderDate = (
  value: string,
  preferences: UserFormatPreferences,
) => {
  const date = new Date(value);
  if (isSameLocalDay(value)) {
    return `Today, ${formatReminderTime(value, preferences)}`;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameLocalDay(value, tomorrow)) {
    return `Tomorrow, ${formatReminderTime(value, preferences)}`;
  }

  return formatUserDate(date, preferences.dateFormat, {
    includeYear: true,
    weekday: "short",
  });
};
