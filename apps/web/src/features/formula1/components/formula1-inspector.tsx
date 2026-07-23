import {
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Flag,
  MapPin,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Formula1Flag } from "@/features/formula1/components/formula1-flag";
import {
  getNextSession,
  getRaceState,
  getSessionState,
  getSpotlightRace,
  raceStartDate,
} from "@/features/formula1/lib/formula1-dates";
import {
  getConstructorColor,
} from "@/features/formula1/lib/formula1-visuals";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";
import type { Formula1Race } from "@/features/formula1/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { useCurrentTime } from "@/hooks/use-current-time";
import { cn } from "@/lib/cn";
import { formatUserDate, formatUserTime } from "@/lib/date-time-format";

type Formula1InspectorProps = {
  className?: string;
};

export function Formula1Inspector({ className }: Formula1InspectorProps) {
  const {
    loadRaceResults,
    selectedRaceRound,
    setSelectedRaceRound,
    snapshot,
  } = useFormula1();
  const { dateFormat, timeFormat } = useUserPreferences();
  const now = useCurrentTime();
  const [resultsLoading, setResultsLoading] = useState(false);

  const spotlightRace = useMemo(
    () => getSpotlightRace(snapshot?.races ?? [], now),
    [now, snapshot?.races],
  );
  const race =
    snapshot?.races.find((item) => item.round === selectedRaceRound) ??
    spotlightRace;
  const results = race ? snapshot?.resultsByRound[race.round] : undefined;
  const completed = race ? getRaceState(race, now) === "completed" : false;

  useEffect(() => {
    if (!race || !completed || results) return;
    let active = true;
    setResultsLoading(true);
    void loadRaceResults(race.round)
      .catch(() => undefined)
      .finally(() => {
        if (active) setResultsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [completed, loadRaceResults, race, results]);

  if (!race) {
    return (
      <aside
        className={cn(
          "flex h-full w-[360px] shrink-0 items-center justify-center border-l border-border bg-card px-8 text-center",
          className,
        )}
      >
        <div>
          <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
            <Flag className="size-[19px]" />
          </div>
          <p className="mt-3 text-sm font-medium">Race details</p>
          <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
            The next race weekend and its local session times will appear here.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full w-[360px] shrink-0 flex-col overflow-hidden border-l border-border bg-card",
        className,
      )}
      aria-label="Race details"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Formula1Flag country={race.circuit.country} className="size-4" />
          <h2 className="truncate text-sm font-semibold">Round {race.round}</h2>
        </div>
        {selectedRaceRound !== null ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => setSelectedRaceRound(null)}
            aria-label="Close selected race"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <RaceOverview race={race} />

        {completed ? (
          <RaceResults
            race={race}
            results={results}
            loading={resultsLoading}
          />
        ) : (
          <SessionSchedule race={race} />
        )}

        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold">{race.circuit.name}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {race.circuit.locality}, {race.circuit.country}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[9px] leading-4 text-muted-foreground/75">
          All session times use your local timezone and respect your time and
          date format settings.
        </p>
      </div>
    </aside>
  );

  function RaceOverview({ race: item }: { race: Formula1Race }) {
    const start = raceStartDate(item);
    const nextSession = getNextSession(item, now);
    const state = getRaceState(item, now);
    return (
      <div>
        <div className="flex items-start gap-3">
          <Formula1Flag country={item.circuit.country} className="size-8" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.08em] text-red-600 uppercase">
              {state === "completed"
                ? "Completed"
                : state === "race-week"
                  ? "Race week"
                  : `${item.season} season`}
            </p>
            <h3 className="mt-1 text-[19px] leading-5 font-semibold tracking-[-0.03em]">
              {item.name}
            </h3>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted p-3">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <p className="mt-2 text-[10px] text-muted-foreground">Race day</p>
            <p className="mt-0.5 text-[11px] font-semibold">
              {formatUserDate(start, dateFormat, {
                includeYear: false,
                length: "long",
              })}
            </p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <Clock3 className="size-3.5 text-muted-foreground" />
            <p className="mt-2 text-[10px] text-muted-foreground">
              {nextSession && state !== "completed"
                ? nextSession.label
                : "Race time"}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold">
              {nextSession?.startsAt
                ? formatUserTime(nextSession.startsAt, timeFormat)
                : item.startsAt
                  ? formatUserTime(item.startsAt, timeFormat)
                  : "TBC"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function SessionSchedule({ race: item }: { race: Formula1Race }) {
    return (
      <section className="mt-5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h3 className="text-[11px] font-semibold">Weekend schedule</h3>
          <span className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
            Local time
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {item.sessions.map((session, index) => {
            const state = getSessionState(session, now);
            return (
              <div
                key={session.id}
                className="flex min-h-12 items-center gap-3 border-b border-border/55 px-3 py-2 last:border-b-0"
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    state === "past"
                      ? "bg-muted text-muted-foreground"
                      : state === "next"
                        ? "bg-red-600 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {state === "past" ? (
                    <Check className="size-3" />
                  ) : (
                    <Circle
                      className="size-2.5"
                      fill={state === "next" ? "currentColor" : "none"}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[11px] font-medium",
                      state === "past" && "text-muted-foreground",
                    )}
                  >
                    {session.label}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {session.startsAt
                      ? formatUserDate(session.startsAt, dateFormat, {
                          includeYear: false,
                          length: "long",
                          weekday: "short",
                        })
                      : "Date TBC"}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    state === "next" && "text-red-600",
                    state === "past" && "text-muted-foreground",
                  )}
                >
                  {session.startsAt
                    ? formatUserTime(session.startsAt, timeFormat)
                    : "TBC"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function RaceResults({
    race: item,
    results: raceResults,
    loading: isLoading,
  }: {
    race: Formula1Race;
    results: typeof results;
    loading: boolean;
  }) {
    const podium = raceResults?.slice(0, 3);
    return (
      <section className="mt-5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h3 className="text-[11px] font-semibold">Race result</h3>
          <span className="text-[9px] text-muted-foreground">
            {item.date}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {isLoading && !podium ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : podium?.length ? (
            podium.map((result) => (
              <div
                key={result.driver.id}
                className="flex min-h-12 items-center gap-3 border-b border-border/55 px-3 py-2 last:border-b-0"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                    result.position === 1
                      ? "bg-amber-400 text-amber-950"
                      : "bg-muted",
                  )}
                >
                  {result.position === 1 ? (
                    <Trophy className="size-3.5" />
                  ) : (
                    result.position
                  )}
                </span>
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: getConstructorColor(result.constructor.id),
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">
                    {result.driver.givenName} {result.driver.familyName}
                  </p>
                  <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                    {result.constructor.name}
                  </p>
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {result.time ?? result.status}
                </span>
              </div>
            ))
          ) : (
            <p className="px-3 py-5 text-center text-[10px] text-muted-foreground">
              Detailed results aren’t available yet.
            </p>
          )}
        </div>
      </section>
    );
  }
}
