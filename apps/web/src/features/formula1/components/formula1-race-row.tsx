import { Check, ChevronRight, Trophy } from "lucide-react";

import { Formula1Flag } from "@/features/formula1/components/formula1-flag";
import { getRaceState, raceStartDate } from "@/features/formula1/lib/formula1-dates";
import type {
  Formula1Race,
  Formula1Winner,
} from "@/features/formula1/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";
import { formatUserDate, formatUserTime } from "@/lib/date-time-format";

type Formula1RaceRowProps = {
  race: Formula1Race;
  winner?: Formula1Winner;
  selected: boolean;
  now: Date;
  onSelect: () => void;
};

export function Formula1RaceRow({
  race,
  winner,
  selected,
  now,
  onSelect,
}: Formula1RaceRowProps) {
  const { dateFormat, timeFormat } = useUserPreferences();
  const raceState = getRaceState(race, now);
  const start = raceStartDate(race);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full border-b border-border/55 px-2 py-4 text-left outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-muted/45 active:scale-[.993] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-colors motion-reduce:active:scale-100",
        selected &&
          "bg-red-500/[.055] hover:bg-red-500/[.075]",
      )}
      aria-label={`Open ${race.name} details`}
    >
      <div className="flex items-start gap-3">
        <Formula1Flag
          country={race.circuit.country}
          className="mt-0.5 size-6"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
              Round {race.round}
            </span>
            {raceState === "completed" ? (
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <Check className="size-3" />
                Complete
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 truncate text-[14px] font-semibold tracking-[-0.01em]">
            {race.name}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {race.circuit.locality} ·{" "}
            {formatUserDate(start, dateFormat, {
              includeYear: false,
              length: "long",
            })}
            {race.startsAt ? ` · ${formatUserTime(start, timeFormat)}` : " · TBC"}
          </p>
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/55 transition-transform group-hover:translate-x-0.5" />
      </div>

      {winner ? (
        <div className="mt-3 ml-9 flex items-center gap-2.5 border-t border-border/45 pt-2.5">
          <Trophy className="size-3.5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Winner
            </p>
            <p className="truncate text-[11px] font-semibold">
              {winner.driver.givenName} {winner.driver.familyName}
            </p>
          </div>
          <span className="truncate text-[10px] text-muted-foreground">
            {winner.constructor.name}
          </span>
        </div>
      ) : null}
    </button>
  );
}
