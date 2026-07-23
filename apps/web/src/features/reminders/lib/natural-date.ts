import {
  formatUserDate,
  formatUserTime,
  type UserFormatPreferences,
} from "@/lib/date-time-format";

export type NaturalDateSuggestion = {
  index: number;
  text: string;
  dueAt: string;
  hasDate: boolean;
  hasTime: boolean;
  label: string;
  key: string;
};

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatDay = (
  date: Date,
  reference: Date,
  preferences: UserFormatPreferences,
) => {
  if (isSameLocalDay(date, reference)) return "Today";

  const tomorrow = new Date(reference);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameLocalDay(date, tomorrow)) return "Tomorrow";

  return formatUserDate(date, preferences.dateFormat, {
    includeYear: true,
    length: "long",
    weekday: "short",
  });
};

export async function parseNaturalDate(
  input: string,
  preferences: UserFormatPreferences,
  reference = new Date(),
): Promise<NaturalDateSuggestion | null> {
  const chrono = await import("chrono-node/en");
  const result = chrono.casual.parse(input, reference, { forwardDate: true })[0];
  if (!result) return null;

  const hasTime = result.start.isCertain("hour");
  const hasDate = (["year", "month", "day", "weekday"] as const).some((part) =>
    result.start.isCertain(part),
  );

  const date = result.start.date();
  if (!hasTime) date.setHours(9, 0, 0, 0);
  else date.setSeconds(0, 0);

  const label = hasTime
    ? `${formatDay(date, reference, preferences)} at ${formatUserTime(date, preferences.timeFormat)}`
    : formatDay(date, reference, preferences);
  const dueAt = date.toISOString();

  return {
    index: result.index,
    text: result.text,
    dueAt,
    hasDate,
    hasTime,
    label,
    key: `${result.index}:${result.text}:${dueAt}`,
  };
}

export function removeNaturalDate(
  input: string,
  suggestion: NaturalDateSuggestion,
) {
  const before = input
    .slice(0, suggestion.index)
    .replace(/\b(?:by|for)\s*$/i, "");
  const after = input.slice(suggestion.index + suggestion.text.length);

  return `${before}${after}`
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[\s,.;:!?–—-]+|[\s,.;:!?–—-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
