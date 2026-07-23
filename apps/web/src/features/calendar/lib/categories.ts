import type { CSSProperties } from "react";

import type { CalendarCategory } from "@/features/calendar/model/types";

export type CalendarColorPreset = {
  color: string;
  label: string;
};

export const calendarColorPresets: CalendarColorPreset[] = [
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Violet" },
  { color: "#f97316", label: "Orange" },
  { color: "#10b981", label: "Green" },
  { color: "#ec4899", label: "Pink" },
  { color: "#ef4444", label: "Red" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#14b8a6", label: "Teal" },
  { color: "#eab308", label: "Yellow" },
  { color: "#f43f5e", label: "Rose" },
  { color: "#6366f1", label: "Indigo" },
  { color: "#64748b", label: "Slate" },
];

const defaultCategoryDefinitions = [
  { key: "blue", name: "Work", color: "#3b82f6" },
  { key: "violet", name: "Focus", color: "#8b5cf6" },
  { key: "orange", name: "Personal", color: "#f97316" },
  { key: "green", name: "Health", color: "#10b981" },
  { key: "pink", name: "Planning", color: "#ec4899" },
  { key: "red", name: "Important", color: "#ef4444" },
] as const;

export type LegacyCalendarColor =
  (typeof defaultCategoryDefinitions)[number]["key"];

export const defaultCalendarCategories: CalendarCategory[] =
  defaultCategoryDefinitions.map((category, position) => ({
    id: `calendar-category-${category.key}`,
    name: category.name,
    color: category.color,
    position,
    createdAt: new Date(2026, 0, 1, 0, position).toISOString(),
  }));

export const defaultCalendarCategory = defaultCalendarCategories[0]!;

export const categoryIdForLegacyColor = (color: unknown) => {
  const match = defaultCategoryDefinitions.find(
    (category) => category.key === color,
  );
  return `calendar-category-${match?.key ?? "blue"}`;
};

export const getCalendarCategory = (
  categories: CalendarCategory[],
  categoryId: string | null | undefined,
): CalendarCategory =>
  categories.find((category) => category.id === categoryId) ??
  categories[0] ??
  defaultCalendarCategory;

type CalendarCategoryProperties = CSSProperties & {
  "--category-border": string;
  "--category-color": string;
  "--category-highlight": string;
  "--category-surface": string;
  "--category-text": string;
};

export const getCalendarCategoryStyle = (
  category: Pick<CalendarCategory, "color">,
): CalendarCategoryProperties => ({
  "--category-color": category.color,
  "--category-surface": `color-mix(in srgb, ${category.color} 16%, var(--background))`,
  "--category-border": `color-mix(in srgb, ${category.color} 34%, var(--border))`,
  "--category-text": `color-mix(in srgb, ${category.color} 76%, var(--foreground))`,
  "--category-highlight": `color-mix(in srgb, ${category.color} 35%, transparent)`,
});

export const isCalendarCategoryColor = (value: string) =>
  /^#[0-9a-f]{6}$/i.test(value);
