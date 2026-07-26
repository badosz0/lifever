import { format } from "date-fns";
import { type CSSProperties, useMemo } from "react";

import {
  buildChartDays,
  formatTokenCount,
} from "@/features/ai/lib/ai-usage";
import type {
  AIDailyUsage,
  AIHistoryRange,
  AIRateLimit,
} from "@/features/ai/model/types";
import { cn } from "@/lib/cn";

const quotaColors = ["#5B8CFF", "#8B5CF6", "#14B8A6", "#F59E0B"];

export function QuotaGauge({
  limit,
  index = 0,
  compact = false,
}: {
  limit: AIRateLimit;
  index?: number;
  compact?: boolean;
}) {
  const color = quotaColors[index % quotaColors.length]!;
  const radius = compact ? 22 : 34;
  const size = compact ? 56 : 84;
  const strokeWidth = compact ? 5 : 7;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (limit.remainingPercent / 100);
  const resetDate = limit.resetsAt
    ? new Date(limit.resetsAt * 1_000)
    : null;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        compact ? "gap-3" : "gap-4",
      )}
    >
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        aria-label={`${Math.round(limit.remainingPercent)}% remaining`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
          />
        </svg>
        <strong
          className={cn(
            "absolute inset-0 flex items-center justify-center tabular-nums tracking-[-0.04em]",
            compact ? "text-[14px]" : "text-[19px]",
          )}
        >
          {Math.round(limit.remainingPercent)}
          <span className="ml-px text-[8px] tracking-normal text-muted-foreground">
            %
          </span>
        </strong>
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "leading-4 font-semibold",
            compact ? "text-[11px]" : "text-[12px]",
          )}
        >
          {limit.label}
        </p>
        <p
          className={cn(
            "text-muted-foreground",
            compact ? "mt-0.5 text-[9px]" : "mt-1 text-[10px]",
          )}
        >
          {Math.round(limit.usedPercent)}% used
        </p>
        <p
          className={cn(
            "mt-0.5 text-muted-foreground",
            compact ? "text-[9px]" : "text-[10px]",
          )}
        >
          {resetDate
            ? `Resets ${format(resetDate, "EEE, MMM d · HH:mm")}`
            : "Reset time unavailable"}
        </p>
      </div>
    </div>
  );
}

export function TokenHistoryChart({
  daily,
  range,
}: {
  daily: AIDailyUsage[];
  range: AIHistoryRange;
}) {
  const days = useMemo(() => buildChartDays(daily, range), [daily, range]);
  const maximum = Math.max(...days.map((day) => day.totalTokens), 1);
  const labelEvery = range === 30 ? 5 : 2;

  return (
    <div className="mt-5">
      <div
        className="grid h-[190px] items-end gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${range}, minmax(0, 1fr))` }}
      >
        {days.map((day, index) => {
          const cached = Math.min(day.cachedInputTokens, day.inputTokens);
          const uncached = Math.max(0, day.inputTokens - cached);
          const output = day.outputTokens;
          const height = Math.max(
            day.totalTokens ? 5 : 2,
            (day.totalTokens / maximum) * 164,
          );
          const denominator = Math.max(day.totalTokens, 1);
          return (
            <div
              key={day.date}
              className="group relative flex h-full min-w-0 flex-col justify-end"
              style={{ "--bar-height": `${height}px` } as CSSProperties}
            >
              <div className="pointer-events-none absolute bottom-[calc(var(--bar-height)+8px)] left-1/2 z-10 hidden w-max -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-2 text-[10px] shadow-lg group-hover:block">
                <p className="font-semibold">
                  {format(new Date(`${day.date}T12:00:00`), "MMM d")}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {formatTokenCount(day.totalTokens)} tokens · {day.sessions}{" "}
                  {day.sessions === 1 ? "session" : "sessions"}
                </p>
              </div>
              <div
                className="flex w-full min-w-[3px] flex-col-reverse overflow-hidden rounded-[4px] bg-muted"
                style={{ height }}
              >
                {day.totalTokens ? (
                  <>
                    <span
                      className="w-full bg-[#5B8CFF]"
                      style={{ height: `${(uncached / denominator) * 100}%` }}
                    />
                    <span
                      className="w-full bg-[#9AB8FF]"
                      style={{ height: `${(cached / denominator) * 100}%` }}
                    />
                    <span
                      className="w-full bg-[#8B5CF6]"
                      style={{ height: `${(output / denominator) * 100}%` }}
                    />
                  </>
                ) : null}
              </div>
              <span
                className={cn(
                  "mt-2 truncate text-center text-[8px] text-muted-foreground",
                  index % labelEvery !== 0 &&
                    index !== days.length - 1 &&
                    "invisible",
                )}
              >
                {format(new Date(`${day.date}T12:00:00`), "MMM d")}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-muted-foreground">
        <ChartLegend color="#5B8CFF" label="Uncached input" />
        <ChartLegend color="#9AB8FF" label="Cached input" />
        <ChartLegend color="#8B5CF6" label="Output" />
      </div>
    </div>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
