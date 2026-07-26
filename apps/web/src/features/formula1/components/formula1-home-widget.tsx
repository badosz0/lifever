import { useMemo } from "react";

import { Formula1Countdown } from "@/features/formula1/components/formula1-countdown";
import { Formula1Flag } from "@/features/formula1/components/formula1-flag";
import {
  getNextSession,
  getSpotlightRace,
} from "@/features/formula1/lib/formula1-dates";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatUserTime } from "@/lib/date-time-format";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";

export function Formula1HomeWidget() {
  const { loading, snapshot } = useFormula1();
  const { timeFormat } = useUserPreferences();
  const now = useCurrentTime();
  const race = useMemo(
    () => getSpotlightRace(snapshot?.races ?? [], now),
    [now, snapshot?.races],
  );
  const nextSession = race ? getNextSession(race, now) : null;
  const startsAt = nextSession?.startsAt ?? race?.startsAt ?? null;

  if (loading && !snapshot) {
    return <p className="text-xs text-muted-foreground">Loading season…</p>;
  }
  if (!race) {
    return <p className="text-xs text-muted-foreground">No upcoming race.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Formula1Flag country={race.circuit.country} className="text-[22px]" />
        <div className="min-w-0">
          <p className="truncate text-[18px] leading-tight font-bold tracking-[-0.025em]">
            {race.name}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {race.circuit.locality} · Round {race.round}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            {nextSession?.label ?? "Race"}
          </p>
          <p className="mt-1 text-[12px] font-semibold">
            {startsAt ? formatUserTime(startsAt, timeFormat) : "Time TBC"}
          </p>
        </div>
        {startsAt ? (
          <strong className="text-[18px] font-bold tracking-[-0.025em]">
            <Formula1Countdown target={new Date(startsAt)} />
          </strong>
        ) : null}
      </div>
    </div>
  );
}
