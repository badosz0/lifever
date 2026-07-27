import {
  clearNativeNotifications,
  syncNativeNotifications,
} from "./native-notification-transport";
import type { ScheduledAppNotification } from "./types";

type StoredNotification = {
  id: string;
  fingerprint: string;
};

type NotificationRegistry = Record<string, Record<string, StoredNotification>>;

const REGISTRY_KEY = "lifever-scheduled-notifications-v2";
const MINIMUM_SCHEDULE_LEAD_MS = 1_000;

let syncQueue: Promise<void> = Promise.resolve();

function readRegistry(): NotificationRegistry {
  try {
    const stored = localStorage.getItem(REGISTRY_KEY);
    return stored ? (JSON.parse(stored) as NotificationRegistry) : {};
  } catch {
    return {};
  }
}

function writeRegistry(registry: NotificationRegistry) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Notification delivery should not make the rest of the app depend on storage.
  }
}

const notificationId = (scope: string, key: string) => `lifever:${scope}:${key}`;

function fingerprint(notification: ScheduledAppNotification) {
  return JSON.stringify({
    deliverAt: notification.deliverAt.toISOString(),
    title: notification.title,
    body: notification.body ?? null,
    group: notification.group ?? null,
    sound: notification.sound ?? null,
    extra: notification.extra ?? null,
  });
}

async function reconcileScope(
  scope: string,
  notifications: ScheduledAppNotification[],
) {
  const cutoff = Date.now() + MINIMUM_SCHEDULE_LEAD_MS;
  const desired = new Map(
    notifications
      .filter(
        (notification) =>
          Number.isFinite(notification.deliverAt.getTime()) &&
          notification.deliverAt.getTime() > cutoff,
      )
      .map((notification) => [notification.key, notification]),
  );
  const registry = readRegistry();
  const current = registry[scope] ?? {};
  const next: Record<string, StoredNotification> = {};
  const cancelledIds: string[] = [];
  const toSchedule: ScheduledAppNotification[] = [];

  for (const [key, stored] of Object.entries(current)) {
    const notification = desired.get(key);
    if (!notification || stored.fingerprint !== fingerprint(notification)) {
      cancelledIds.push(stored.id);
    } else {
      next[key] = stored;
    }
  }

  for (const [key, notification] of desired) {
    if (!next[key]) toSchedule.push(notification);
  }

  if (cancelledIds.length === 0 && toSchedule.length === 0) return;

  const scheduledById = toSchedule.map((notification) => ({
    notification,
    id: notificationId(scope, notification.key),
  }));
  const permissionGranted = await syncNativeNotifications({
    clearAll: false,
    cancelIds: cancelledIds,
    notifications: scheduledById.map(({ notification, id }) => ({
      id,
      title: notification.title,
      body: notification.body,
      deliverAtMs: notification.deliverAt.getTime(),
      threadId: notification.group,
      sound: Boolean(notification.sound),
    })),
  });

  if (permissionGranted === null) return;

  if (permissionGranted) {
    for (const { notification, id } of scheduledById) {
      next[notification.key] = {
        id,
        fingerprint: fingerprint(notification),
      };
    }
  }

  if (Object.keys(next).length > 0) registry[scope] = next;
  else delete registry[scope];
  writeRegistry(registry);
}

/**
 * Reconciles only one notification domain. Other scopes remain untouched, so new
 * Lifever features can share the same native notification service safely.
 */
export function syncNotificationScope(
  scope: string,
  notifications: ScheduledAppNotification[],
) {
  const task = syncQueue.then(() => reconcileScope(scope, notifications));
  syncQueue = task.catch(() => undefined);
  return task;
}

/**
 * Clears every pending and delivered Lifever notification from the operating
 * system, then forgets the local registry so active schedulers can rebuild it.
 */
export function clearAllScheduledNotifications() {
  const task = syncQueue.then(async () => {
    await clearNativeNotifications();
    writeRegistry({});
  });
  syncQueue = task.catch(() => undefined);
  return task;
}
