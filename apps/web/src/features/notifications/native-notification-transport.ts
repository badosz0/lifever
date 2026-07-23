type NativeScheduledNotification = {
  id: string;
  title: string;
  body?: string;
  deliverAtMs: number;
  threadId?: string;
  sound: boolean;
};

type NativeNotificationSyncRequest = {
  cancelIds: string[];
  notifications: NativeScheduledNotification[];
};

let invokePromise: Promise<typeof import("@tauri-apps/api/core").invoke> | null = null;

function isNativeApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function loadInvoke() {
  if (!isNativeApp()) return null;
  invokePromise ??= import("@tauri-apps/api/core").then(({ invoke }) => invoke);
  return invokePromise;
}

export async function syncNativeNotifications(
  request: NativeNotificationSyncRequest,
) {
  const invoke = await loadInvoke();
  if (!invoke) return null;

  return invoke<boolean>("sync_native_notifications", { request });
}
