import { Circle, Star } from "lucide-react";
import { useMemo } from "react";

import {
  formatReminderDate,
  isBeforeToday,
  isSameLocalDay,
} from "@/features/reminders/lib/dates";
import { useReminders } from "@/features/reminders/model/reminders-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";

export function RemindersHomeWidget() {
  const { isReady, reminders } = useReminders();
  const preferences = useUserPreferences();
  const pending = useMemo(
    () =>
      reminders
        .filter((reminder) => !reminder.completedAt)
        .sort((left, right) => {
          if (left.important !== right.important) {
            return Number(right.important) - Number(left.important);
          }
          if (!left.dueAt) return 1;
          if (!right.dueAt) return -1;
          return left.dueAt.localeCompare(right.dueAt);
        }),
    [reminders],
  );
  const dueToday = pending.filter((reminder) =>
    isSameLocalDay(reminder.dueAt),
  ).length;
  const overdue = pending.filter((reminder) =>
    isBeforeToday(reminder.dueAt),
  ).length;

  if (!isReady) {
    return <p className="text-xs text-muted-foreground">Loading reminders…</p>;
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <strong className="text-[28px] leading-none font-bold tracking-[-0.04em]">
          {pending.length}
        </strong>
        <span className="pb-0.5 text-[11px] text-muted-foreground">
          open · {dueToday} today{overdue ? ` · ${overdue} overdue` : ""}
        </span>
      </div>

      <div className="mt-5 space-y-1">
        {pending.slice(0, 3).map((reminder) => (
          <div
            key={reminder.id}
            className="flex min-h-8 items-center gap-2 rounded-lg px-1"
          >
            <Circle className="size-3.5 shrink-0 text-muted-foreground/45" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
              {reminder.title}
            </span>
            {reminder.important ? (
              <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
            ) : null}
            {reminder.dueAt ? (
              <span className="shrink-0 text-[9px] text-muted-foreground">
                {formatReminderDate(reminder.dueAt, preferences)}
              </span>
            ) : null}
          </div>
        ))}
        {!pending.length ? (
          <p className="py-4 text-[12px] text-muted-foreground">
            Everything is complete.
          </p>
        ) : null}
      </div>
    </div>
  );
}
