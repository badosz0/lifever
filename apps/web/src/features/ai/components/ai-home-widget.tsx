import { useEffect, useMemo } from "react";

import { formatTokenCount } from "@/features/ai/lib/ai-usage";
import { useAI } from "@/features/ai/model/ai-provider";

export function AIHomeWidget() {
  const { dashboard, ensureLoaded, loading } = useAI();

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const todayTokens = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      dashboard?.daily.find((day) => day.date === today)?.totalTokens ?? 0
    );
  }, [dashboard?.daily]);
  const limit = dashboard?.limits[0];

  if (loading && !dashboard) {
    return <p className="text-xs text-muted-foreground">Reading Codex…</p>;
  }
  if (
    !dashboard?.source.codexConnected &&
    !dashboard?.source.sessionsFound
  ) {
    return (
      <p className="max-w-xs text-[11px] leading-5 text-muted-foreground">
        Open Lifever on your Mac to connect local Codex usage.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <strong className="text-[28px] leading-none font-bold tracking-[-0.04em]">
          {limit ? `${Math.round(limit.remainingPercent)}%` : "—"}
        </strong>
        <span className="pb-0.5 text-[11px] text-muted-foreground">
          {limit ? "quota remaining" : "live limit unavailable"}
        </span>
      </div>

      {limit ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#5B8CFF]"
            style={{ width: `${limit.remainingPercent}%` }}
          />
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            Today
          </p>
          <p className="mt-1 text-[12px] font-semibold">
            {formatTokenCount(todayTokens)} tokens
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            30 days
          </p>
          <p className="mt-1 text-[12px] font-semibold">
            {formatTokenCount(dashboard?.summary.totalTokens ?? 0)} tokens
          </p>
        </div>
      </div>
    </div>
  );
}
