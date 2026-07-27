import { useEffect, useMemo, useRef } from "react";

import { syncNotificationScope } from "@/features/notifications/notification-service";
import type { ScheduledAppNotification } from "@/features/notifications/types";

import { useReminders } from "../model/reminders-provider";

const REMINDER_NOTIFICATION_SYNC_DELAY = 400;

export function ReminderNotificationScheduler() {
  const { isReady, reminders } = useReminders();
  const previousKeys = useRef<Set<string> | null>(null);
  const scheduled = useMemo<ScheduledAppNotification[]>(
    () =>
      reminders.flatMap((reminder) => {
        if (!reminder.dueAt || reminder.completedAt) return [];

        return [
          {
            key: reminder.id,
            deliverAt: new Date(reminder.dueAt),
            title: reminder.title.trim() || "Reminder",
            body: reminder.notes.trim() || "Reminder is due",
            group: "reminders",
            sound: "Ping",
            extra: {
              type: "reminder",
              reminderId: reminder.id,
            },
          },
        ];
      }),
    [reminders],
  );

  useEffect(() => {
    if (!isReady) return;

    const nextKeys = new Set(scheduled.map((notification) => notification.key));
    const removedNotification =
      previousKeys.current === null ||
      [...previousKeys.current].some((key) => !nextKeys.has(key));
    previousKeys.current = nextKeys;

    const sync = () => {
      void syncNotificationScope("reminders", scheduled).catch((error) => {
        console.warn("Could not sync reminder notifications", error);
      });
    };

    if (removedNotification) {
      sync();
      return;
    }

    const timeout = window.setTimeout(sync, REMINDER_NOTIFICATION_SYNC_DELAY);
    return () => window.clearTimeout(timeout);
  }, [isReady, scheduled]);

  return null;
}
