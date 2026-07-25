import { useEffect, useMemo, useState } from "react";

import {
  formatDurationMinutes,
  formatEventRange,
} from "@/features/calendar/lib/dates";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { isTauri } from "@/lib/runtime";

const UPCOMING_EVENT_WINDOW_MS = 8 * 60 * 60 * 1_000;

const cleanMenuLabel = (value: string) => value.replace(/\s+/g, " ").trim();

export function MenuBarSync() {
  const { events, isReady } = useCalendar();
  const { timeFormat } = useUserPreferences();
  const [nowMs, setNowMs] = useState(Date.now);

  const upcomingEvent = useMemo(() => {
    const windowEnd = nowMs + UPCOMING_EVENT_WINDOW_MS;

    return events
      .filter((event) => {
        const startAt = new Date(event.startAt).getTime();
        return startAt > nowMs && startAt <= windowEnd;
      })
      .sort(
        (left, right) =>
          new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      )[0];
  }, [events, nowMs]);

  useEffect(() => {
    const startAt = upcomingEvent
      ? new Date(upcomingEvent.startAt).getTime()
      : null;
    const remaining = startAt === null ? Number.POSITIVE_INFINITY : startAt - nowMs;
    const tickRate = remaining > 0 && remaining <= 60_000 ? 1_000 : 60_000;
    const timeout = window.setTimeout(
      () => setNowMs(Date.now()),
      tickRate - (Date.now() % tickRate),
    );
    return () => window.clearTimeout(timeout);
  }, [nowMs, upcomingEvent]);

  useEffect(() => {
    if (!isTauri || !isReady) return;

    if (!upcomingEvent) {
      void import("@tauri-apps/api/core").then(({ invoke }) =>
        invoke("sync_menu_bar_event", { event: null }),
      );
      return;
    }

    const title = cleanMenuLabel(upcomingEvent.title);
    const startAt = new Date(upcomingEvent.startAt).getTime();
    const remaining = Math.max(0, startAt - nowMs);
    const minutes = Math.ceil(remaining / 60_000);
    const relativeLabel =
      remaining < 60_000
        ? `${Math.ceil(remaining / 1_000)} second${remaining <= 1_000 ? "" : "s"}`
        : minutes < 60
          ? `${minutes} minute${minutes === 1 ? "" : "s"}`
          : formatDurationMinutes(minutes);
    const statusLabel = `In ${relativeLabel}`;
    const menuLabel = `${formatEventRange(upcomingEvent.startAt, upcomingEvent.endAt, timeFormat)}  ${title}`;

    void import("@tauri-apps/api/core").then(({ invoke }) =>
      invoke("sync_menu_bar_event", {
        event: { id: upcomingEvent.id, menuLabel, statusLabel },
      }),
    );
  }, [isReady, nowMs, timeFormat, upcomingEvent]);

  return null;
}
