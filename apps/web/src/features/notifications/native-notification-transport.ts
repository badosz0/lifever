type NativeScheduledNotification = {
  id: string;
  title: string;
  body?: string;
  deliverAtMs: number;
  threadId?: string;
  sound: boolean;
};

export type NativeNotificationOpenTarget = {
  kind: "calendar-event" | "reminder";
  id: string;
};

type NativeNotificationSyncRequest = {
  clearAll: boolean;
  cancelIds: string[];
  notifications: NativeScheduledNotification[];
};

let invokePromise: Promise<typeof import("@tauri-apps/api/core").invoke> | null = null;
let listenPromise: Promise<typeof import("@tauri-apps/api/event").listen> | null = null;

function isNativeApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function loadInvoke() {
  if (!isNativeApp()) return null;
  invokePromise ??= import("@tauri-apps/api/core").then(({ invoke }) => invoke);
  return invokePromise;
}

async function loadListen() {
  if (!isNativeApp()) return null;
  listenPromise ??= import("@tauri-apps/api/event").then(({ listen }) => listen);
  return listenPromise;
}

export async function syncNativeNotifications(
  request: NativeNotificationSyncRequest,
) {
  const invoke = await loadInvoke();
  if (!invoke) return null;

  return invoke<boolean>("sync_native_notifications", { request });
}

export function clearNativeNotifications() {
  return syncNativeNotifications({
    clearAll: true,
    cancelIds: [],
    notifications: [],
  });
}

export async function takePendingNativeNotificationOpens() {
  const invoke = await loadInvoke();
  if (!invoke) return [];

  return invoke<NativeNotificationOpenTarget[]>(
    "take_pending_notification_opens",
  );
}

export async function listenForNativeNotificationOpens(
  onOpen: () => void,
) {
  const listen = await loadListen();
  if (!listen) return () => undefined;

  return listen("lifever-notification-open", onOpen);
}
