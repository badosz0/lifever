import { isBefore, isToday, parse } from "date-fns";

export const parseKanbanDate = (value: string) =>
  parse(value, "yyyy-MM-dd", new Date());

export const getKanbanDueState = (value: string | null, completed: boolean) => {
  if (!value || completed) return "default" as const;
  const date = parseKanbanDate(value);
  if (isToday(date)) return "today" as const;
  if (isBefore(date, new Date())) return "overdue" as const;
  return "upcoming" as const;
};
