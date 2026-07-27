import { subMinutes } from "date-fns";
import { useEffect, useMemo, useRef } from "react";

import { syncNotificationScope } from "@/features/notifications/notification-service";
import type { ScheduledAppNotification } from "@/features/notifications/types";
import { isDemoMode } from "@/lib/demo-mode";

import { useCalendar } from "../model/calendar-provider";

const CALENDAR_NOTIFICATION_SYNC_DELAY = 400;

export function CalendarNotificationScheduler() {
  const { events, isReady } = useCalendar();
  const previousKeys = useRef<Set<string> | null>(null);
  const scheduled = useMemo<ScheduledAppNotification[]>(
    () =>
      events.flatMap((event) => {
        if (!event.alertsEnabled) return [];

        const startsAt = new Date(event.startAt);
        const location = event.location.trim();
        const locationSuffix = location ? ` · ${location}` : "";

        return [
          {
            key: `${event.id}:thirty-minutes`,
            deliverAt: subMinutes(startsAt, 30),
            title: event.title.trim() || "Calendar event",
            body: `Starts in 30 minutes${locationSuffix}`,
            group: "calendar",
            sound: "Ping",
            extra: {
              type: "calendar-event",
              calendarEventId: event.id,
              alert: "thirty-minutes",
            },
          },
          {
            key: `${event.id}:start`,
            deliverAt: startsAt,
            title: event.title.trim() || "Calendar event",
            body: `Starting now${locationSuffix}`,
            group: "calendar",
            sound: "Ping",
            extra: {
              type: "calendar-event",
              calendarEventId: event.id,
              alert: "start",
            },
          },
        ];
      }),
    [events],
  );

  useEffect(() => {
    if (!isReady || isDemoMode) return;

    const nextKeys = new Set(scheduled.map((notification) => notification.key));
    const removedNotification =
      previousKeys.current === null ||
      [...previousKeys.current].some((key) => !nextKeys.has(key));
    previousKeys.current = nextKeys;

    const sync = () => {
      void syncNotificationScope("calendar", scheduled).catch((error) => {
        console.warn("Could not sync calendar notifications", error);
      });
    };

    if (removedNotification) {
      sync();
      return;
    }

    const timeout = window.setTimeout(sync, CALENDAR_NOTIFICATION_SYNC_DELAY);
    return () => window.clearTimeout(timeout);
  }, [isReady, scheduled]);

  return null;
}
