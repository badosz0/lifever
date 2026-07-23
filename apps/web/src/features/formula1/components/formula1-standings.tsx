import { Star, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getConstructorColor } from "@/features/formula1/lib/formula1-visuals";
import type {
  Formula1ConstructorStanding,
  Formula1DriverStanding,
} from "@/features/formula1/model/types";
import { cn } from "@/lib/cn";

type DriverStandingsProps = {
  standings: Formula1DriverStanding[];
  favoriteId: string | null;
  onFavoriteChange: (id: string | null) => void;
};

type ConstructorStandingsProps = {
  standings: Formula1ConstructorStanding[];
  favoriteId: string | null;
  onFavoriteChange: (id: string | null) => void;
};

function Position({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold tabular-nums",
        value === 1 ? "bg-amber-400 text-amber-950" : "bg-muted text-foreground",
      )}
    >
      {value === 1 ? <Trophy className="size-3.5" /> : value}
    </span>
  );
}

function FavoriteButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-7 text-muted-foreground opacity-55 hover:opacity-100",
        active && "text-amber-500 opacity-100 hover:text-amber-500",
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Star className="size-3.5" fill={active ? "currentColor" : "none"} />
    </Button>
  );
}

export function Formula1DriverStandings({
  standings,
  favoriteId,
  onFavoriteChange,
}: DriverStandingsProps) {
  const leaderPoints = standings[0]?.points ?? 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-[1fr_auto] border-b border-border/70 px-4 py-3">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          Driver
        </span>
        <span className="pr-9 text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          Points
        </span>
      </div>
      <div>
        {standings.map((standing) => {
          const team = standing.constructors[0];
          const active = favoriteId === standing.driver.id;
          return (
            <div
              key={standing.driver.id}
              className={cn(
                "flex min-h-14 items-center gap-3 border-b border-border/55 px-3 py-2 last:border-b-0 sm:px-4",
                active && "bg-amber-50 dark:bg-amber-950/25",
              )}
            >
              <Position value={standing.position} />
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: getConstructorColor(team?.id ?? "") }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-[13px] font-semibold">
                    {standing.driver.givenName} {standing.driver.familyName}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {standing.driver.code}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {team?.name ?? "No constructor"}
                  {standing.wins > 0
                    ? ` · ${standing.wins} ${standing.wins === 1 ? "win" : "wins"}`
                    : ""}
                  {standing.position > 1
                    ? ` · ${standing.points - leaderPoints} from leader`
                    : ""}
                </p>
              </div>
              <span className="text-[13px] font-bold tabular-nums">
                {standing.points}
              </span>
              <FavoriteButton
                active={active}
                label={
                  active
                    ? `Remove ${standing.driver.familyName} from favorites`
                    : `Favorite ${standing.driver.familyName}`
                }
                onClick={() =>
                  onFavoriteChange(active ? null : standing.driver.id)
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Formula1ConstructorStandings({
  standings,
  favoriteId,
  onFavoriteChange,
}: ConstructorStandingsProps) {
  const leaderPoints = standings[0]?.points ?? 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-[1fr_auto] border-b border-border/70 px-4 py-3">
        <span className="text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          Constructor
        </span>
        <span className="pr-9 text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
          Points
        </span>
      </div>
      <div>
        {standings.map((standing) => {
          const active = favoriteId === standing.constructor.id;
          return (
            <div
              key={standing.constructor.id}
              className={cn(
                "flex min-h-14 items-center gap-3 border-b border-border/55 px-3 py-2 last:border-b-0 sm:px-4",
                active && "bg-amber-50 dark:bg-amber-950/25",
              )}
            >
              <Position value={standing.position} />
              <span
                className="size-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: getConstructorColor(standing.constructor.id),
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">
                  {standing.constructor.name}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {standing.constructor.nationality}
                  {standing.wins > 0
                    ? ` · ${standing.wins} ${standing.wins === 1 ? "win" : "wins"}`
                    : ""}
                  {standing.position > 1
                    ? ` · ${standing.points - leaderPoints} from leader`
                    : ""}
                </p>
              </div>
              <span className="text-[13px] font-bold tabular-nums">
                {standing.points}
              </span>
              <FavoriteButton
                active={active}
                label={
                  active
                    ? `Remove ${standing.constructor.name} from favorites`
                    : `Favorite ${standing.constructor.name}`
                }
                onClick={() =>
                  onFavoriteChange(active ? null : standing.constructor.id)
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
