import { format, subDays, subMinutes } from "date-fns";

import type {
  AIDailyUsage,
  AIHistoryRange,
  AIUsageDashboard,
} from "@/features/ai/model/types";
import { isTauri } from "@/lib/runtime";

const emptySummary = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  sessionCount: 0,
  activeDays: 0,
  historyDays: 30,
};

const makeBrowserDashboard = (): AIUsageDashboard => ({
  collectedAt: Date.now(),
  plan: null,
  limits: [],
  credits: null,
  summary: emptySummary,
  daily: [],
  models: [],
  projects: [],
  recentSessions: [],
  source: {
    codexConnected: false,
    accountSource: null,
    codexAuthFound: false,
    codexCliFound: false,
    sessionsFound: false,
    historyIsLocal: true,
  },
  warning:
    "Live Codex usage is available in the Lifever desktop app, where it can connect to Codex on this Mac.",
});

const makeDemoDashboard = (): AIUsageDashboard => {
  const now = new Date();
  const daily = Array.from({ length: 30 }, (_, index) => {
    const age = 29 - index;
    const rhythm = [0.54, 0.82, 0.35, 0.94, 0.68, 0.21, 0.76][index % 7]!;
    const quietDay = index % 11 === 3 || index % 13 === 8;
    const inputTokens = quietDay
      ? 0
      : Math.round((68_000 + index * 2_900) * rhythm);
    const cachedInputTokens = Math.round(inputTokens * (0.46 + (index % 4) * 0.06));
    const outputTokens = Math.round(inputTokens * (0.14 + (index % 3) * 0.025));
    return {
      date: format(subDays(new Date(), age), "yyyy-MM-dd"),
      inputTokens,
      cachedInputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      sessions: quietDay ? 0 : Math.max(1, Math.round(5 * rhythm)),
    };
  });
  const summary = daily.reduce(
    (total, day) => ({
      inputTokens: total.inputTokens + day.inputTokens,
      cachedInputTokens: total.cachedInputTokens + day.cachedInputTokens,
      outputTokens: total.outputTokens + day.outputTokens,
      totalTokens: total.totalTokens + day.totalTokens,
      sessionCount: total.sessionCount + day.sessions,
      activeDays: total.activeDays + Number(day.sessions > 0),
      historyDays: 30,
    }),
    { ...emptySummary },
  );

  return {
    collectedAt: Date.now(),
    plan: "prolite",
    limits: [
      {
        id: "codex-primary",
        label: "Weekly limit",
        usedPercent: 38,
        remainingPercent: 62,
        windowMinutes: 10_080,
        resetsAt: Math.floor(Date.now() / 1_000) + 3 * 24 * 60 * 60 + 17_400,
      },
      {
        id: "codex-spark-primary",
        label: "GPT-5.3-Codex-Spark · Weekly limit",
        usedPercent: 12,
        remainingPercent: 88,
        windowMinutes: 10_080,
        resetsAt: Math.floor(Date.now() / 1_000) + 4 * 24 * 60 * 60 + 9_000,
      },
    ],
    credits: { hasCredits: false, unlimited: false, balance: "0" },
    summary,
    daily,
    models: [
      {
        model: "gpt-5.6-sol",
        inputTokens: Math.round(summary.inputTokens * 0.72),
        cachedInputTokens: Math.round(summary.cachedInputTokens * 0.76),
        outputTokens: Math.round(summary.outputTokens * 0.74),
        totalTokens: Math.round(summary.totalTokens * 0.72),
        sessions: Math.round(summary.sessionCount * 0.68),
      },
      {
        model: "gpt-5.6-terra",
        inputTokens: Math.round(summary.inputTokens * 0.28),
        cachedInputTokens: Math.round(summary.cachedInputTokens * 0.24),
        outputTokens: Math.round(summary.outputTokens * 0.26),
        totalTokens: Math.round(summary.totalTokens * 0.28),
        sessions: Math.round(summary.sessionCount * 0.32),
      },
    ],
    projects: [
      {
        project: "lifever",
        totalTokens: Math.round(summary.totalTokens * 0.48),
        sessions: Math.round(summary.sessionCount * 0.42),
        lastActiveAt: now.toISOString(),
      },
      {
        project: "codex",
        totalTokens: Math.round(summary.totalTokens * 0.31),
        sessions: Math.round(summary.sessionCount * 0.34),
        lastActiveAt: subDays(new Date(), 1).toISOString(),
      },
      {
        project: "lifever-site",
        totalTokens: Math.round(summary.totalTokens * 0.21),
        sessions: Math.round(summary.sessionCount * 0.24),
        lastActiveAt: subDays(new Date(), 2).toISOString(),
      },
    ],
    recentSessions: [
      {
        id: "demo-lifever",
        project: "lifever",
        model: "gpt-5.6-sol",
        startedAt: subMinutes(now, 166).toISOString(),
        lastActiveAt: now.toISOString(),
        inputTokens: 128_420,
        cachedInputTokens: 74_860,
        outputTokens: 18_940,
        totalTokens: 147_360,
      },
      {
        id: "demo-api",
        project: "api",
        model: "gpt-5.6-terra",
        startedAt: subMinutes(subDays(now, 1), 58).toISOString(),
        lastActiveAt: subDays(now, 1).toISOString(),
        inputTokens: 84_210,
        cachedInputTokens: 42_340,
        outputTokens: 12_670,
        totalTokens: 96_880,
      },
      {
        id: "demo-site",
        project: "lifever-site",
        model: "gpt-5.6-sol",
        startedAt: subMinutes(subDays(now, 2), 81).toISOString(),
        lastActiveAt: subDays(now, 2).toISOString(),
        inputTokens: 69_540,
        cachedInputTokens: 38_110,
        outputTokens: 9_620,
        totalTokens: 79_160,
      },
    ],
    source: {
      codexConnected: true,
      accountSource: "codex-auth",
      codexAuthFound: true,
      codexCliFound: true,
      sessionsFound: true,
      historyIsLocal: true,
    },
    warning: null,
    isDemo: true,
  };
};

export async function fetchAIUsageDashboard(): Promise<AIUsageDashboard> {
  if (!isTauri) {
    return import.meta.env.DEV ? makeDemoDashboard() : makeBrowserDashboard();
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AIUsageDashboard>("get_ai_usage_dashboard");
}

export function formatTokenCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function formatPlanName(plan: string | null) {
  if (!plan) return "OpenAI account";
  const normalized = plan.toLowerCase();
  if (normalized === "prolite" || normalized === "pro") return "ChatGPT Pro";
  if (normalized === "plus") return "ChatGPT Plus";
  if (normalized === "team") return "ChatGPT Team";
  if (normalized === "business") return "ChatGPT Business";
  if (normalized === "enterprise") return "ChatGPT Enterprise";
  return plan
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildChartDays(
  usage: AIDailyUsage[],
  range: AIHistoryRange,
) {
  const byDate = new Map(usage.map((day) => [day.date, day]));
  return Array.from({ length: range }, (_, index) => {
    const date = subDays(new Date(), range - index - 1);
    const key = format(date, "yyyy-MM-dd");
    return (
      byDate.get(key) ?? {
        date: key,
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        sessions: 0,
      }
    );
  });
}
