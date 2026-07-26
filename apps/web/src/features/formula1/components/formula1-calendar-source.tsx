import { useMemo } from "react";

import { useRegisterAppCalendarSource } from "@/features/apps/calendar-source-registry";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";

const sessionDuration = {
  practice: 60,
  "sprint-qualifying": 45,
  sprint: 60,
  qualifying: 60,
  race: 120,
} as const;

export function Formula1CalendarSource() {
  const { snapshot } = useFormula1();
  const source = useMemo(
    () => ({
      id: "app:formula1",
      appId: "formula1",
      name: "Formula 1",
      color: "#EF4444",
      defaultVisible: false,
      events:
        snapshot?.races.flatMap((race) =>
          race.sessions.flatMap((session) => {
            if (!session.startsAt) return [];
            const start = new Date(session.startsAt);
            const end = new Date(
              start.getTime() + sessionDuration[session.kind] * 60_000,
            );
            return [
              {
                id: `formula1:${race.season}:${race.round}:${session.id}`,
                title: `${race.name} · ${session.label}`,
                startAt: start.toISOString(),
                endAt: end.toISOString(),
                location: `${race.circuit.name}, ${race.circuit.locality}`,
                notes: `Round ${race.round} of the ${race.season} Formula 1 season.`,
              },
            ];
          }),
        ) ?? [],
    }),
    [snapshot],
  );
  useRegisterAppCalendarSource(source);
  return null;
}
