import { useMemo } from "react";

import { RtkSavingsChart } from "@/features/ai/components/ai-usage-visuals";
import {
  buildRtkChartDays,
  formatTokenCount,
} from "@/features/ai/lib/ai-usage";
import type {
  AIHistoryRange,
  RTKUsageDashboard,
} from "@/features/ai/model/types";

export function RtkUsageSection({
  rtk,
  range,
}: {
  rtk: RTKUsageDashboard;
  range: AIHistoryRange;
}) {
  const visibleDays = useMemo(
    () => buildRtkChartDays(rtk.daily, range),
    [range, rtk.daily],
  );
  const rangeSaved = useMemo(
    () => visibleDays.reduce((total, day) => total + day.savedTokens, 0),
    [visibleDays],
  );

  if (!rtk.installed) return null;

  if (!rtk.summary) {
    return (
      <section className="mt-7 border-b border-border/65 px-1 py-5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-amber-500" />
          <h3 className="text-[12px] font-semibold">RTK savings unavailable</h3>
        </div>
        <p className="mt-1.5 max-w-xl text-[10px] leading-4 text-muted-foreground">
          {rtk.warning ?? "Run `rtk gain` once, then refresh this dashboard."}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-7 border-b border-border/65 px-1 py-6 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <h3 className="text-[13px] font-semibold">RTK savings</h3>
            {rtk.version ? (
              <span className="text-[9px] text-muted-foreground">
                v{rtk.version}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Tokens removed from command output before reaching your context
          </p>
        </div>
        <div className="text-right">
          <strong className="text-[20px] leading-none tracking-[-0.035em] tabular-nums">
            {formatTokenCount(rangeSaved)}
          </strong>
          <p className="mt-1 text-[9px] text-muted-foreground">
            saved in the last {range} days
          </p>
        </div>
      </div>

      <RtkSavingsChart daily={rtk.daily} range={range} />

      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
        <RtkFact
          label="Total saved"
          value={formatTokenCount(rtk.summary.totalSaved)}
          detail="tokens"
        />
        <RtkFact
          label="Average reduction"
          value={`${Math.round(rtk.summary.avgSavingsPct)}%`}
          detail="smaller"
        />
        <RtkFact
          label="Commands optimized"
          value={formatTokenCount(rtk.summary.totalCommands)}
          detail="all projects"
        />
        <RtkFact
          label="Original → delivered"
          value={`${formatTokenCount(rtk.summary.totalInput)} → ${formatTokenCount(rtk.summary.totalOutput)}`}
          detail="tokens"
        />
        <RtkFact
          label="Command time"
          value={formatDuration(rtk.summary.totalTimeMs)}
          detail={`${formatDuration(rtk.summary.avgTimeMs)} avg`}
        />
      </div>
    </section>
  );
}

function formatDuration(milliseconds: number) {
  if (milliseconds <= 0) return "0s";
  if (milliseconds < 60_000) {
    return `${Math.max(0.1, milliseconds / 1_000).toFixed(1)}s`;
  }
  const totalMinutes = Math.round(milliseconds / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function RtkFact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 text-[12px] font-semibold tabular-nums">
        {value}{" "}
        <span className="text-[9px] font-normal text-muted-foreground">
          {detail}
        </span>
      </p>
    </div>
  );
}
