import { useCallback, useEffect, useState } from "react";

import { useApps } from "@/features/apps/model/apps-provider";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import {
  listenForNativeNotificationOpens,
  type NativeNotificationOpenTarget,
  takePendingNativeNotificationOpens,
} from "@/features/notifications/native-notification-transport";
import { useReminders } from "@/features/reminders/model/reminders-provider";

type PendingNotificationOpen = NativeNotificationOpenTarget & {
  receivedAt: number;
};

const TARGET_LOAD_TIMEOUT_MS = 15_000;

export function NotificationOpenHandler() {
  const {
    isAppEnabled,
    setActiveApp,
    setAppEnabled,
  } = useApps();
  const {
    events,
    isReady: calendarReady,
    setSelectedEventId,
  } = useCalendar();
  const {
    isReady: remindersReady,
    reminders,
    setActiveView,
    setSelectedReminderId,
  } = useReminders();
  const [pending, setPending] = useState<PendingNotificationOpen[]>([]);

  const drainNativeQueue = useCallback(async () => {
    const targets = await takePendingNativeNotificationOpens();
    if (targets.length === 0) return;
    const receivedAt = Date.now();
    setPending((current) => [
      ...current,
      ...targets.map((target) => ({ ...target, receivedAt })),
    ]);
  }, []);

  useEffect(() => {
    let disposed = false;
    let stopListening: (() => void) | undefined;

    void listenForNativeNotificationOpens(() => {
      if (!disposed) void drainNativeQueue();
    }).then((unlisten) => {
      if (disposed) unlisten();
      else stopListening = unlisten;
    });
    void drainNativeQueue();

    return () => {
      disposed = true;
      stopListening?.();
    };
  }, [drainNativeQueue]);

  useEffect(() => {
    const target = pending[0];
    if (!target) return;

    const appId = target.kind === "calendar-event" ? "calendar" : "reminders";
    if (!isAppEnabled(appId)) {
      setAppEnabled(appId, true);
      return;
    }

    setActiveApp(appId);

    const targetLoaded =
      target.kind === "calendar-event"
        ? calendarReady && events.some((event) => event.id === target.id)
        : remindersReady && reminders.some((reminder) => reminder.id === target.id);

    if (targetLoaded) {
      if (target.kind === "calendar-event") {
        setSelectedEventId(target.id);
      } else {
        setActiveView("all");
        setSelectedReminderId(target.id);
      }
      setPending((current) => current.slice(1));
      return;
    }

    const remaining = Math.max(
      0,
      TARGET_LOAD_TIMEOUT_MS - (Date.now() - target.receivedAt),
    );
    const timeout = window.setTimeout(() => {
      setPending((current) => current.slice(1));
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [
    calendarReady,
    events,
    isAppEnabled,
    pending,
    reminders,
    remindersReady,
    setActiveApp,
    setActiveView,
    setAppEnabled,
    setSelectedEventId,
    setSelectedReminderId,
  ]);

  return null;
}
