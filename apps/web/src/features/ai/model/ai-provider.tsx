import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { fetchAIUsageDashboard } from "@/features/ai/lib/ai-usage";
import type {
  AIHistoryRange,
  AIUsageDashboard,
} from "@/features/ai/model/types";

const RANGE_KEY = "lifever-ai-history-range";

const readHistoryRange = (): AIHistoryRange => {
  try {
    return localStorage.getItem(RANGE_KEY) === "30" ? 30 : 14;
  } catch {
    return 14;
  }
};

type AIContextValue = {
  dashboard: AIUsageDashboard | null;
  error: string | null;
  historyRange: AIHistoryRange;
  loading: boolean;
  refreshing: boolean;
  ensureLoaded: () => Promise<void>;
  refresh: () => Promise<void>;
  setHistoryRange: (range: AIHistoryRange) => void;
};

const AIContext = createContext<AIContextValue | null>(null);

export function AIProvider({ children }: PropsWithChildren) {
  const [dashboard, setDashboard] = useState<AIUsageDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyRange, setHistoryRangeState] =
    useState<AIHistoryRange>(readHistoryRange);
  const inFlight = useRef<Promise<void> | null>(null);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const request = (async () => {
      setRefreshing(hasLoaded.current);
      setLoading(!hasLoaded.current);
      setError(null);
      try {
        const next = await fetchAIUsageDashboard();
        setDashboard(next);
        hasLoaded.current = true;
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : String(requestError || "Codex usage is unavailable."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = request;
    return request;
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (hasLoaded.current) return;
    await refresh();
  }, [refresh]);

  const setHistoryRange = useCallback((range: AIHistoryRange) => {
    setHistoryRangeState(range);
    try {
      localStorage.setItem(RANGE_KEY, String(range));
    } catch {
      // The selection remains available for this session.
    }
  }, []);

  const value = useMemo(
    () => ({
      dashboard,
      error,
      historyRange,
      loading,
      refreshing,
      ensureLoaded,
      refresh,
      setHistoryRange,
    }),
    [
      dashboard,
      ensureLoaded,
      error,
      historyRange,
      loading,
      refresh,
      refreshing,
      setHistoryRange,
    ],
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) throw new Error("useAI must be used inside AIProvider");
  return context;
}
