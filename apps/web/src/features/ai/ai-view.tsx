import {
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AppHeader,
  AppHeaderToolbar,
} from "@/components/app-shell/app-header";
import { AppSettingsButton } from "@/components/app-shell/app-settings-button";
import { Button } from "@/components/ui/button";
import { AISettingsDialog } from "@/features/ai/components/ai-settings-dialog";
import {
  QuotaGauge,
  TokenHistoryChart,
} from "@/features/ai/components/ai-usage-visuals";
import {
  buildChartDays,
  formatPlanName,
  formatTokenCount,
} from "@/features/ai/lib/ai-usage";
import { useAI } from "@/features/ai/model/ai-provider";
import type {
  AIDailyUsage,
  AIModelUsage,
} from "@/features/ai/model/types";
import type { AppViewProps } from "@/features/apps/model/types";
import { cn } from "@/lib/cn";

const AUTO_REFRESH_MS = 15 * 60 * 1_000;

export function AIView({
  onOpenMobileSidebar,
  onToggleSidebar,
}: AppViewProps) {
  const {
    dashboard,
    ensureLoaded,
    error,
    historyRange,
    loading,
    refresh,
    refreshing,
  } = useAI();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void ensureLoaded();
    const interval = window.setInterval(() => void refresh(), AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [ensureLoaded, refresh]);

  const visibleDays = useMemo(
    () => buildChartDays(dashboard?.daily ?? [], historyRange),
    [dashboard?.daily, historyRange],
  );
  const visibleSummary = useMemo(
    () => summarizeDays(visibleDays),
    [visibleDays],
  );
  const today = visibleDays.at(-1);
  const cachedShare = visibleSummary.inputTokens
    ? Math.round(
        (visibleSummary.cachedInputTokens / visibleSummary.inputTokens) * 100,
      )
    : 0;
  const hasLocalData =
    dashboard?.source.codexConnected || dashboard?.source.sessionsFound;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <AppHeader>
        <AppHeaderToolbar
          onOpenMobileSidebar={onOpenMobileSidebar}
          onToggleSidebar={onToggleSidebar}
        >
          <div className="ml-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.015em]">
                AI
              </h1>
              {dashboard?.isDemo ? (
                <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.06em] text-indigo-500 uppercase">
                  Demo
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 text-muted-foreground"
            onClick={() => void refresh()}
            disabled={refreshing || loading}
            aria-label="Refresh AI usage"
            title="Refresh usage"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (refreshing || loading) && "animate-spin",
              )}
            />
          </Button>
          <AppSettingsButton
            label="AI settings"
            className="size-8"
            onClick={() => setSettingsOpen(true)}
          />
        </AppHeaderToolbar>

        <div className="mt-6 min-w-0 px-1 sm:mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[30px] leading-[1.08] font-bold tracking-[-0.04em] sm:text-[34px]">
                Codex usage
              </h2>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Live OpenAI limits and private token history from this device
              </p>
            </div>
            {dashboard?.source.codexConnected ? (
              <div className="mb-0.5 flex items-center gap-2 text-[10px]">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium">
                  {formatPlanName(dashboard.plan)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[1100px] px-4 pt-2 pb-14 sm:px-7">
          {error ? (
            <UsageNotice tone="error">{error}</UsageNotice>
          ) : dashboard?.warning && hasLocalData ? (
            <UsageNotice>{dashboard.warning}</UsageNotice>
          ) : null}

          {loading && !dashboard ? (
            <AILoadingState />
          ) : dashboard && hasLocalData ? (
            <>
              <section aria-labelledby="limits-heading">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3
                    id="limits-heading"
                    className="text-[11px] font-semibold"
                  >
                    Available usage
                  </h3>
                  <span className="text-[9px] text-muted-foreground">
                    {dashboard.source.codexConnected
                      ? accountSourceLabel(dashboard.source.accountSource)
                      : "Subscription limits unavailable"}
                  </span>
                </div>
                {dashboard.limits.length ? (
                  <div
                    className={cn(
                      "grid border-y border-border/65",
                      dashboard.limits.length > 1 &&
                        "md:grid-cols-[minmax(0,1.35fr)_minmax(220px,.65fr)] md:divide-x md:divide-border/65",
                    )}
                  >
                    {dashboard.limits.map((limit, index) => (
                      <div
                        key={limit.id}
                        className={cn(
                          "border-b border-border/65 px-1 py-5 last:border-b-0 md:border-b-0 md:px-5",
                          index > 0 && "py-4 md:flex md:items-center",
                        )}
                      >
                        <QuotaGauge
                          limit={limit}
                          index={index}
                          compact={index > 0}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-y border-border/65 px-1 py-5 sm:px-5">
                    <p className="text-[12px] font-semibold">
                      No subscription limit was reported
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                      Local token history is still available. ChatGPT plans
                      expose live limits after Codex is signed in.
                    </p>
                  </div>
                )}
              </section>

              <section className="mt-7">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-1 sm:grid-cols-4 sm:gap-x-8">
                  <Stat
                    label="Today"
                    value={formatTokenCount(today?.totalTokens ?? 0)}
                    detail="tokens"
                  />
                  <Stat
                    label={`${historyRange} days`}
                    value={formatTokenCount(visibleSummary.totalTokens)}
                    detail="tokens"
                  />
                  <Stat
                    label="Sessions"
                    value={String(visibleSummary.sessions)}
                    detail="local"
                  />
                  <Stat
                    label="Active days"
                    value={String(
                      visibleDays.filter((day) => day.sessions > 0).length,
                    )}
                    detail={`of ${historyRange}`}
                  />
                </div>
              </section>

              <div className="mt-8 grid border-y border-border/65 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,.8fr)]">
                <section className="px-1 py-6 sm:px-5 lg:pr-7">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <h3 className="text-[13px] font-semibold">
                        Token activity
                      </h3>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {cachedShare}% of input reused from cache
                      </p>
                    </div>
                    <strong className="text-[16px] tracking-[-0.025em]">
                      {formatTokenCount(visibleSummary.totalTokens)}
                    </strong>
                  </div>
                  <TokenHistoryChart
                    daily={dashboard.daily}
                    range={historyRange}
                  />
                </section>

                <section className="border-t border-border/65 px-1 py-6 sm:px-5 lg:border-t-0 lg:border-l lg:pl-7">
                  <ModelBreakdown models={dashboard.models} />
                </section>
              </div>

              <div className="mt-6 flex items-start gap-2.5 px-1 text-[10px] leading-4 text-muted-foreground">
                <ShieldCheck className="mt-px size-3.5 shrink-0" />
                <p>
                  Live limits reuse your existing Codex sign-in. Credentials
                  stay in Codex storage; token totals are aggregated locally
                  and never synced to Lifever.
                </p>
              </div>
            </>
          ) : (
            <AIUnavailableState message={dashboard?.warning ?? error} />
          )}
        </div>
      </div>

      <AISettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </main>
  );
}

function summarizeDays(days: AIDailyUsage[]) {
  return days.reduce(
    (total, day) => ({
      inputTokens: total.inputTokens + day.inputTokens,
      cachedInputTokens: total.cachedInputTokens + day.cachedInputTokens,
      outputTokens: total.outputTokens + day.outputTokens,
      totalTokens: total.totalTokens + day.totalTokens,
      sessions: total.sessions + day.sessions,
    }),
    {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      sessions: 0,
    },
  );
}

function Stat({
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
      <p className="text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-2 flex min-w-0 items-baseline gap-1.5">
        <strong className="truncate text-[21px] leading-none font-bold tracking-[-0.04em]">
          {value}
        </strong>
        <span className="shrink-0 text-[9px] text-muted-foreground">
          {detail}
        </span>
      </div>
    </div>
  );
}

function ModelBreakdown({ models }: { models: AIModelUsage[] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold">Models</h3>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Share of sessions with identified model data
      </p>
      <BreakdownRows
        items={models.slice(0, 4).map((model) => ({
          label: model.model,
          tokens: model.totalTokens,
          detail: `${model.sessions} sessions`,
        }))}
      />
    </div>
  );
}

function BreakdownRows({
  items,
}: {
  items: { label: string; tokens: number; detail: string }[];
}) {
  const total = Math.max(
    items.reduce((sum, item) => sum + item.tokens, 0),
    1,
  );
  if (!items.length) {
    return (
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
        Usage will appear after the first local Codex session.
      </p>
    );
  }
  return (
    <div className="mt-5 space-y-5">
      {items.map((item, index) => {
        const share = (item.tokens / total) * 100;
        return (
          <div key={item.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[11px] font-semibold">
                {item.label}
              </span>
              <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                {formatTokenCount(item.tokens)}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  index % 2 === 0 ? "bg-[#5B8CFF]" : "bg-[#8B5CF6]",
                )}
                style={{ width: `${Math.max(2, share)}%` }}
              />
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              {Math.round(share)}% · {item.detail}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function accountSourceLabel(source: "codex-auth" | "codex-cli" | null) {
  if (source === "codex-auth") return "Live from OpenAI";
  if (source === "codex-cli") return "Live through Codex";
  return "Subscription limits unavailable";
}

function UsageNotice({
  children,
  tone = "warning",
}: {
  children: string;
  tone?: "warning" | "error";
}) {
  return (
    <div
      className={cn(
        "mb-5 flex items-start gap-2 border-l-2 px-3 py-2 text-[11px]",
        tone === "error"
          ? "border-red-500 text-red-700 dark:text-red-300"
          : "border-amber-500 text-amber-800 dark:text-amber-300",
      )}
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function AIUnavailableState({ message }: { message?: string | null }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center px-6 py-16 text-center">
      <div className="max-w-[340px]">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
          <TerminalSquare className="size-5" />
        </div>
        <h2 className="mt-4 text-[15px] font-semibold">
          Open AI on your Mac
        </h2>
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          {message ??
            "The desktop app reads live Codex limits and local token history without exposing your prompts or credentials."}
        </p>
      </div>
    </div>
  );
}

function AILoadingState() {
  return (
    <div
      className="animate-pulse"
      role="status"
      aria-label="Loading AI usage"
    >
      <div className="grid border-y border-border/60 md:grid-cols-2 md:divide-x md:divide-border/60">
        <LoadingLimit />
        <LoadingLimit compact />
      </div>

      <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 px-1 sm:grid-cols-4 sm:gap-x-8">
        {[0, 1, 2, 3].map((item) => (
          <div key={item}>
            <LoadingBar className="h-1.5 w-12" />
            <LoadingBar
              className={cn(
                "mt-3 h-5",
                item % 2 === 0 ? "w-16" : "w-10",
              )}
              strong
            />
          </div>
        ))}
      </div>

      <div className="mt-8 grid border-y border-border/60 lg:grid-cols-[1.65fr_.75fr] lg:divide-x lg:divide-border/60">
        <div className="min-h-[330px] px-1 py-6 sm:px-5 lg:pr-7">
          <LoadingBar className="h-2.5 w-24" strong />
          <LoadingBar className="mt-2.5 h-1.5 w-36" />
          <div className="mt-10 flex h-48 items-end gap-2 border-b border-border/45 px-1">
            {[34, 48, 28, 62, 45, 72, 52, 82, 58, 68, 88, 74].map(
              (height, index) => (
                <span
                  key={index}
                  className="min-w-1 flex-1 rounded-t-[3px] bg-[#5B8CFF]/10"
                  style={{ height: `${height}%` }}
                />
              ),
            )}
          </div>
        </div>
        <div className="min-h-[330px] border-t border-border/60 px-1 py-6 sm:px-5 lg:border-t-0 lg:pl-7">
          <LoadingBar className="h-2.5 w-16" strong />
          <LoadingBar className="mt-2.5 h-1.5 w-40 max-w-full" />
          <div className="mt-8 space-y-6">
            {[72, 54, 63, 42].map((width, index) => (
              <div key={index}>
                <div className="flex items-center justify-between gap-5">
                  <LoadingBar
                    className="h-2"
                    style={{ width: `${width}%` }}
                    strong
                  />
                  <LoadingBar className="h-1.5 w-9 shrink-0" />
                </div>
                <LoadingBar className="mt-2.5 h-1 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading AI usage…</span>
    </div>
  );
}

function LoadingLimit({ compact = false }: { compact?: boolean }) {
  return (
    <div className="min-h-[126px] px-1 py-5 sm:px-5">
      <LoadingBar className="h-2 w-20" strong />
      <LoadingBar
        className={cn("mt-4 h-5", compact ? "w-14" : "w-24")}
        strong
      />
      <LoadingBar className="mt-4 h-1.5 w-full" />
      <LoadingBar className="mt-2.5 h-1.5 w-2/3" />
    </div>
  );
}

function LoadingBar({
  className,
  strong = false,
  style,
}: {
  className?: string;
  strong?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "block rounded-full",
        strong ? "bg-[#5B8CFF]/12" : "bg-[#5B8CFF]/[.07]",
        className,
      )}
      style={style}
    />
  );
}
