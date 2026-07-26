import { useMemo } from "react";

import { Formula1Countdown } from "@/features/formula1/components/formula1-countdown";
import { Formula1Flag } from "@/features/formula1/components/formula1-flag";
import {
  getNextSession,
  getSpotlightRace,
  raceStartDate,
} from "@/features/formula1/lib/formula1-dates";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatUserDate, formatUserTime } from "@/lib/date-time-format";

export function Formula1HomeWidget() {
  const { loading, snapshot } = useFormula1();
  const { dateFormat, timeFormat } = useUserPreferences();
  const now = useCurrentTime();
  const race = useMemo(
    () => getSpotlightRace(snapshot?.races ?? [], now),
    [now, snapshot?.races],
  );
  const nextSession = race ? getNextSession(race, now) : null;
  const startsAt = nextSession?.startsAt ?? race?.startsAt ?? null;
  const raceStartsAt = race ? raceStartDate(race) : null;

  if (loading && !snapshot) {
    return <p className="text-xs text-muted-foreground">Loading season…</p>;
  }
  if (!race) {
    return <p className="text-xs text-muted-foreground">No upcoming race.</p>;
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <Formula1Flag
          country={race.circuit.country}
          className="mt-0.5 size-7"
        />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            Round {race.round}
          </p>
          <p className="truncate text-[18px] leading-tight font-bold tracking-[-0.025em]">
            {race.name}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {race.circuit.locality}, {race.circuit.country}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-t border-border/55 pt-4">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            Next session
          </p>
          <p className="mt-1 truncate text-[12px] font-semibold">
            {nextSession?.label ?? "Race"}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {startsAt
              ? `${formatUserDate(startsAt, dateFormat, {
                  includeYear: false,
                  length: "long",
                  weekday: "short",
                })} · ${formatUserTime(startsAt, timeFormat)}`
              : "Date and time TBC"}
          </p>
        </div>
        {startsAt ? (
          <div className="text-right">
            <p className="text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
              Starts in
            </p>
            <strong className="mt-1 block text-[15px] leading-tight font-bold tracking-[-0.025em]">
              <Formula1Countdown target={new Date(startsAt)} />
            </strong>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-border/45 pt-3 text-[10px]">
        <span className="font-semibold">Race</span>
        <span className="truncate text-right text-muted-foreground">
          {raceStartsAt
            ? `${formatUserDate(raceStartsAt, dateFormat, {
                includeYear: false,
                length: "long",
                weekday: "short",
              })} · ${formatUserTime(raceStartsAt, timeFormat)}`
            : "Date and time TBC"}
        </span>
      </div>
    </div>
  );
}
