import { subMinutes } from "date-fns";
import { useEffect } from "react";

import { syncNotificationScope } from "@/features/notifications/notification-service";

import { useCalendar } from "../model/calendar-provider";

const CALENDAR_NOTIFICATION_SYNC_DELAY = 400;

export function CalendarNotificationScheduler() {
  const { events, isReady } = useCalendar();

  useEffect(() => {
    if (!isReady) return;

    const timeout = window.setTimeout(() => {
      const scheduled = events.flatMap((event) => {
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
      });

      void syncNotificationScope("calendar", scheduled).catch((error) => {
        console.warn("Could not sync calendar notifications", error);
      });
    }, CALENDAR_NOTIFICATION_SYNC_DELAY);

    return () => window.clearTimeout(timeout);
  }, [events, isReady]);

  return null;
}
