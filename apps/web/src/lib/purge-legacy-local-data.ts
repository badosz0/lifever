import { clearAllScheduledNotifications } from "@/features/notifications/notification-service";

const legacyDataKeys = [
  "lifever-reminders",
  "lifever-notes-v1",
  "lifever-calendar-events",
  "lifever-calendar-categories",
  "lifever-calendars",
  "lifever-kanban-state-v1",
  "lifever-formula1-preferences-v1",
  "lifever-user-preferences",
];

const NOTIFICATION_QUEUE_MIGRATION_KEY =
  "lifever-notification-queue-migration-v1";

export function purgeLegacyLocalData() {
  try {
    for (const key of legacyDataKeys) localStorage.removeItem(key);
  } catch {
    // Account-backed data remains authoritative when device storage is blocked.
  }
}

/**
 * Native notification requests survive app upgrades independently of web
 * storage. Clear the pre-account queue once, then let the current account's
 * schedulers rebuild it from server-backed data.
 */
export async function purgeLegacyNotificationQueue() {
  try {
    if (localStorage.getItem(NOTIFICATION_QUEUE_MIGRATION_KEY) === "complete") {
      return;
    }
  } catch {
    // Still clear the native queue when device storage is unavailable.
  }

  await clearAllScheduledNotifications();

  try {
    localStorage.setItem(NOTIFICATION_QUEUE_MIGRATION_KEY, "complete");
  } catch {
    // A repeated purge is safe and preferable to leaking stale notifications.
  }
}
