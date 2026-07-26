import {
  AlertCircle,
  Flag,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  AppHeader,
  AppHeaderToolbar,
} from "@/components/app-shell/app-header";
import { Button } from "@/components/ui/button";
import { Formula1Countdown } from "@/features/formula1/components/formula1-countdown";
import { Formula1Flag } from "@/features/formula1/components/formula1-flag";
import { Formula1RaceRow } from "@/features/formula1/components/formula1-race-row";
import {
  Formula1ConstructorStandings,
  Formula1DriverStandings,
} from "@/features/formula1/components/formula1-standings";
import {
  getNextSession,
  getRaceState,
  getSpotlightRace,
} from "@/features/formula1/lib/formula1-dates";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { useCurrentTime } from "@/hooks/use-current-time";
import { cn } from "@/lib/cn";
import { formatUserDate, formatUserTime } from "@/lib/date-time-format";

type Formula1ViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

type Formula1ViewMode = "schedule" | "drivers" | "constructors";

const readViewMode = (): Formula1ViewMode => {
  try {
    const value = localStorage.getItem("lifever-formula1-view");
    if (value === "drivers" || value === "constructors") return value;
  } catch {
    // Use the schedule when storage is restricted.
  }
  return "schedule";
};

const viewOptions = [
  { id: "schedule" as const, label: "Races", Icon: Flag },
  { id: "drivers" as const, label: "Drivers", Icon: Users },
  { id: "constructors" as const, label: "Teams", Icon: Trophy },
];

export function Formula1View({
  onOpenMobileSidebar,
  onToggleSidebar,
}: Formula1ViewProps) {
  const {
    error,
    favoriteConstructorId,
    favoriteDriverId,
    loading,
    refresh,
    refreshing,
    selectedRaceRound,
    setFavoriteConstructorId,
    setFavoriteDriverId,
    setSelectedRaceRound,
    snapshot,
  } = useFormula1();
  const { dateFormat, timeFormat } = useUserPreferences();
  const now = useCurrentTime();
  const [view, setViewState] = useState<Formula1ViewMode>(readViewMode);

  const setView = (next: Formula1ViewMode) => {
    setViewState(next);
    try {
      localStorage.setItem("lifever-formula1-view", next);
    } catch {
      // The current view remains available for this session.
    }
  };

  const spotlightRace = useMemo(
    () => getSpotlightRace(snapshot?.races ?? [], now),
    [now, snapshot?.races],
  );
  const nextSession = spotlightRace
    ? getNextSession(spotlightRace, now)
    : null;
  const nextSessionStartsAt =
    nextSession?.startsAt ?? spotlightRace?.startsAt ?? null;
  const upcomingRaces =
    snapshot?.races.filter((race) => getRaceState(race, now) !== "completed") ??
    [];
  const completedRaces =
    snapshot?.races
      .filter((race) => getRaceState(race, now) === "completed")
      .reverse() ?? [];

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <AppHeader>
        <AppHeaderToolbar
          onOpenMobileSidebar={onOpenMobileSidebar}
          onToggleSidebar={onToggleSidebar}
        >
          <div className="ml-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.015em]">
                Formula 1
              </h1>
              {snapshot ? (
                <span className="hidden text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase sm:inline">
                  {snapshot.season} season
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex rounded-lg bg-muted p-0.5">
            {viewOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] sm:px-2.5",
                  view === id &&
                    "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]",
                )}
                aria-pressed={view === id}
                aria-label={label}
              >
                <Icon className="size-3 sm:hidden" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 text-muted-foreground"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Refresh Formula 1 data"
            title="Refresh data"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          </Button>
        </AppHeaderToolbar>
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-5xl px-4 pt-2 pb-12 sm:px-6">
          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/65 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <AlertCircle className="mt-px size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {loading && !snapshot ? (
            <Formula1LoadingState />
          ) : snapshot ? (
            <>
              {view === "schedule" ? (
                <>
                  {spotlightRace ? (
                    <button
                      type="button"
                      onClick={() => setSelectedRaceRound(spotlightRace.round)}
                      className="w-full border-b border-border/65 px-1 pt-2 pb-6 text-left outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-muted/35 active:scale-[.996] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-colors motion-reduce:active:scale-100 sm:px-2 sm:pt-3"
                    >
                      <div className="flex flex-col items-start gap-5 sm:flex-row sm:gap-6">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
                              Round {spotlightRace.round}
                            </span>
                          </div>
                          <div className="mt-4 flex items-start gap-3">
                            <Formula1Flag
                              country={spotlightRace.circuit.country}
                              className="size-9 sm:size-10"
                            />
                            <div className="min-w-0">
                              <h2 className="text-[21px] leading-6 font-semibold tracking-[-0.035em] sm:text-[25px] sm:leading-7">
                                {spotlightRace.name}
                              </h2>
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                {spotlightRace.circuit.locality},{" "}
                                {spotlightRace.circuit.country}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="w-full shrink-0 border-l-2 border-red-500 py-1 pl-4 text-left sm:w-auto sm:min-w-[210px] sm:text-right">
                          <p className="text-[9px] font-bold tracking-[0.08em] text-red-600 uppercase">
                            Your local time
                          </p>
                          <p className="mt-1.5 text-[12px] font-medium text-foreground/80">
                            {nextSessionStartsAt
                              ? formatUserDate(
                                  nextSessionStartsAt,
                                  dateFormat,
                                  {
                                    includeYear: false,
                                    length: "long",
                                    weekday: "short",
                                  },
                                )
                              : "Date to be confirmed"}
                          </p>
                          <p className="mt-0.5 text-[26px] leading-none font-bold tracking-[-0.035em] tabular-nums">
                            {nextSessionStartsAt
                              ? formatUserTime(
                                  nextSessionStartsAt,
                                  timeFormat,
                                )
                              : "TBC"}
                          </p>
                          {nextSessionStartsAt ? (
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              {nextSession?.label ?? "Race starts"} ·{" "}
                              <Formula1Countdown
                                target={new Date(nextSessionStartsAt)}
                              />
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ) : null}

                  {upcomingRaces.length > 0 ? (
                    <section className="mt-7">
                      <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-[13px] font-semibold">Coming up</h2>
                        <span className="text-[10px] text-muted-foreground">
                          Times shown locally
                        </span>
                      </div>
                      <div className="grid lg:grid-cols-2 lg:gap-x-6">
                        {upcomingRaces.map((race) => (
                          <Formula1RaceRow
                            key={race.round}
                            race={race}
                            selected={selectedRaceRound === race.round}
                            now={now}
                            onSelect={() => setSelectedRaceRound(race.round)}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {completedRaces.length > 0 ? (
                    <section className="mt-7">
                      <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-[13px] font-semibold">
                          Completed races
                        </h2>
                        <span className="text-[10px] text-muted-foreground">
                          Most recent first
                        </span>
                      </div>
                      <div className="grid lg:grid-cols-2 lg:gap-x-6">
                        {completedRaces.map((race) => (
                          <Formula1RaceRow
                            key={race.round}
                            race={race}
                            winner={snapshot.winnersByRound[race.round]}
                            selected={selectedRaceRound === race.round}
                            now={now}
                            onSelect={() => setSelectedRaceRound(race.round)}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : view === "drivers" ? (
                <section>
                  <StandingsHeading
                    eyebrow={`${snapshot.season} championship`}
                    title="Driver standings"
                    description="Favorite a driver to keep them easy to spot throughout the season."
                  />
                  <Formula1DriverStandings
                    standings={snapshot.driverStandings}
                    favoriteId={favoriteDriverId}
                    onFavoriteChange={setFavoriteDriverId}
                  />
                </section>
              ) : (
                <section>
                  <StandingsHeading
                    eyebrow={`${snapshot.season} championship`}
                    title="Constructor standings"
                    description="Follow the team you care about without losing the shape of the field."
                  />
                  <Formula1ConstructorStandings
                    standings={snapshot.constructorStandings}
                    favoriteId={favoriteConstructorId}
                    onFavoriteChange={setFavoriteConstructorId}
                  />
                </section>
              )}

              <p className="mt-6 text-center text-[9px] leading-4 text-muted-foreground/70">
                Schedule and championship data from Jolpica F1. Session times
                automatically use your timezone.
              </p>
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <AlertCircle className="size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Couldn’t load the season</p>
              <p className="mt-1 max-w-64 text-xs leading-5 text-muted-foreground">
                Check your connection and try refreshing Formula 1 data.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void refresh()}
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StandingsHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 pt-2">
      <p className="text-[10px] font-bold tracking-[0.08em] text-red-600 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
        {title}
      </h2>
      <p className="mt-1 max-w-lg text-[11px] leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Formula1LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="h-44 rounded-[22px] border border-border bg-card" />
      <div className="mt-7 h-4 w-24 rounded bg-muted" />
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
