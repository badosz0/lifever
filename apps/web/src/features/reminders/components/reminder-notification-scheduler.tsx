import { useEffect } from "react";

import { syncNotificationScope } from "@/features/notifications/notification-service";

import { useReminders } from "../model/reminders-provider";

const REMINDER_NOTIFICATION_SYNC_DELAY = 400;

export function ReminderNotificationScheduler() {
  const { reminders } = useReminders();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const scheduled = reminders.flatMap((reminder) => {
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
      });

      void syncNotificationScope("reminders", scheduled).catch((error) => {
        console.warn("Could not sync reminder notifications", error);
      });
    }, REMINDER_NOTIFICATION_SYNC_DELAY);

    return () => window.clearTimeout(timeout);
  }, [reminders]);

  return null;
}
