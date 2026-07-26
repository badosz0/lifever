export type AIRateLimit = {
  id: string;
  label: string;
  usedPercent: number;
  remainingPercent: number;
  windowMinutes: number | null;
  resetsAt: number | null;
};

export type AICredits = {
  hasCredits: boolean;
  unlimited: boolean;
  balance: string | null;
};

export type AITokenSummary = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessionCount: number;
  activeDays: number;
  historyDays: number;
};

export type AIDailyUsage = {
  date: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessions: number;
};

export type AIModelUsage = {
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessions: number;
};

export type AIProjectUsage = {
  project: string;
  totalTokens: number;
  sessions: number;
  lastActiveAt: string;
};

export type AIRecentSession = {
  id: string;
  project: string;
  model: string;
  startedAt: string;
  lastActiveAt: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AIUsageSource = {
  codexConnected: boolean;
  accountSource: "codex-auth" | "codex-cli" | null;
  codexAuthFound: boolean;
  codexCliFound: boolean;
  sessionsFound: boolean;
  historyIsLocal: boolean;
};

export type AIUsageDashboard = {
  collectedAt: number;
  plan: string | null;
  limits: AIRateLimit[];
  credits: AICredits | null;
  summary: AITokenSummary;
  daily: AIDailyUsage[];
  models: AIModelUsage[];
  projects: AIProjectUsage[];
  recentSessions: AIRecentSession[];
  source: AIUsageSource;
  warning: string | null;
  isDemo?: boolean;
};

export type AIHistoryRange = 14 | 30;
