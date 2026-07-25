import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchFormula1RaceResults,
  fetchFormula1Snapshot,
} from "@/features/formula1/lib/formula1-api";
import type {
  Formula1RaceResult,
  Formula1Snapshot,
} from "@/features/formula1/model/types";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { useSerialTaskQueue } from "@/hooks/use-serial-task-queue";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

const CACHE_KEY = "lifever-formula1-cache-v1";
const PREFERENCES_KEY = "lifever-formula1-preferences-v1";
const CACHE_TTL_MS = 15 * 60 * 1_000;

type Formula1Preferences = {
  favoriteDriverId: string | null;
  favoriteConstructorId: string | null;
};

const defaultPreferences: Formula1Preferences = {
  favoriteDriverId: null,
  favoriteConstructorId: null,
};

type Formula1ContextValue = {
  snapshot: Formula1Snapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  selectedRaceRound: number | null;
  favoriteDriverId: string | null;
  favoriteConstructorId: string | null;
  setSelectedRaceRound: (round: number | null) => void;
  setFavoriteDriverId: (id: string | null) => void;
  setFavoriteConstructorId: (id: string | null) => void;
  refresh: () => Promise<void>;
  loadRaceResults: (round: number) => Promise<Formula1RaceResult[]>;
};

const readCache = (): Formula1Snapshot | null => {
  try {
    const cached = JSON.parse(
      localStorage.getItem(CACHE_KEY) ?? "null",
    ) as Formula1Snapshot | null;
    if (!cached?.updatedAt || !Array.isArray(cached.races)) return null;
    return {
      ...cached,
      resultsByRound: cached.resultsByRound ?? {},
      winnersByRound: cached.winnersByRound ?? {},
    };
  } catch {
    return null;
  }
};

const readPreferences = (): Formula1Preferences => {
  try {
    const value = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? "null",
    ) as Partial<Formula1Preferences> | null;
    return {
      favoriteDriverId:
        typeof value?.favoriteDriverId === "string"
          ? value.favoriteDriverId
          : null,
      favoriteConstructorId:
        typeof value?.favoriteConstructorId === "string"
          ? value.favoriteConstructorId
          : null,
    };
  } catch {
    return defaultPreferences;
  }
};

const Formula1Context = createContext<Formula1ContextValue | null>(null);

export function Formula1Provider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const initialCache = useMemo(readCache, []);
  const [snapshot, setSnapshot] = useState<Formula1Snapshot | null>(initialCache);
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRaceRound, setSelectedRaceRound] = useState<number | null>(null);
  const [preferences, setPreferences] =
    useState<Formula1Preferences>(defaultPreferences);
  const [preferencesMode, setPreferencesMode] = useState<string | null>(null);
  const preferencesModeRef = useRef<string | null>(null);
  const preferencesMutationVersion = useRef(0);
  const pendingPreferenceWrites = useRef(0);
  const enqueuePreferenceWrite = useSerialTaskQueue();
  const mountedRef = useRef(true);
  const snapshotRef = useRef<Formula1Snapshot | null>(initialCache);
  const pendingResults = useRef(new Map<number, Promise<Formula1RaceResult[]>>());

  const loadRemotePreferences = useCallback(async (userId: string) => {
    const requestedMode = `user:${userId}`;
    const requestedVersion = preferencesMutationVersion.current;
    try {
      const { preferences: remotePreferences } = await apiRequest<{
        preferences: Formula1Preferences;
      }>("/api/preferences");
      if (
        preferencesModeRef.current === requestedMode &&
        preferencesMutationVersion.current === requestedVersion
      ) {
        setPreferences(remotePreferences);
        setPreferencesMode(requestedMode);
      }
    } catch {
      if (preferencesModeRef.current === requestedMode) {
        setPreferencesMode(requestedMode);
      }
    }
  }, []);

  const requestSnapshot = useCallback(
    async (signal?: AbortSignal) => {
      setRefreshing(true);
      setError(null);
      try {
        const next = await fetchFormula1Snapshot(signal);
        if (!mountedRef.current || signal?.aborted) return;
        setSnapshot((current) => {
          const merged = {
            ...next,
            resultsByRound: current?.resultsByRound ?? {},
          };
          snapshotRef.current = merged;
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
          } catch {
            // Fresh data remains available in memory.
          }
          return merged;
        });
      } catch (requestError) {
        if (signal?.aborted || !mountedRef.current) return;
        setError(
          snapshotRef.current
            ? "Couldn’t refresh. Showing saved data."
            : requestError instanceof Error
              ? requestError.message
              : "Formula 1 data is unavailable.",
        );
      } finally {
        if (mountedRef.current && !signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    const cacheAge = initialCache
      ? Date.now() - new Date(initialCache.updatedAt).getTime()
      : Number.POSITIVE_INFINITY;
    if (cacheAge > CACHE_TTL_MS) {
      void requestSnapshot(controller.signal);
    } else {
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [initialCache, requestSnapshot]);

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
    preferencesModeRef.current = nextMode;
    preferencesMutationVersion.current = 0;
    setPreferencesMode(null);
    if (userId) {
      setPreferences(defaultPreferences);
      void loadRemotePreferences(userId);
    } else {
      setPreferences(readPreferences());
      setPreferencesMode("local");
    }
  }, [isPending, loadRemotePreferences, session?.user.id]);

  useEffect(() => {
    if (preferencesMode !== "local" || session || isPending) return;
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences remain available for this session.
    }
  }, [isPending, preferences, preferencesMode, session]);

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (userId && pendingPreferenceWrites.current === 0) {
      void loadRemotePreferences(userId);
    }
  }, Boolean(session?.user.id));

  const updatePreferences = useCallback(
    (patch: Partial<Formula1Preferences>) => {
      preferencesMutationVersion.current += 1;
      setPreferences((current) => ({ ...current, ...patch }));
      if (session) {
        pendingPreferenceWrites.current += 1;
        const request = enqueuePreferenceWrite(() =>
          apiRequest("/api/preferences", {
            method: "PATCH",
            body: JSON.stringify(patch),
          }),
        );
        void request
          .catch(() => void loadRemotePreferences(session.user.id))
          .finally(() => {
            pendingPreferenceWrites.current -= 1;
          });
      }
    },
    [enqueuePreferenceWrite, loadRemotePreferences, session],
  );

  const refresh = useCallback(async () => {
    await requestSnapshot();
  }, [requestSnapshot]);

  const loadRaceResults = useCallback(
    async (round: number) => {
      const existing = snapshot?.resultsByRound[round];
      if (existing) return existing;
      const inFlight = pendingResults.current.get(round);
      if (inFlight) return inFlight;

      const request = fetchFormula1RaceResults(round)
        .then((results) => {
          if (!mountedRef.current) return results;
          setSnapshot((current) => {
            if (!current) return current;
            const next = {
              ...current,
              resultsByRound: {
                ...current.resultsByRound,
                [round]: results,
              },
            };
            snapshotRef.current = next;
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(next));
            } catch {
              // Results remain available in memory.
            }
            return next;
          });
          return results;
        })
        .finally(() => pendingResults.current.delete(round));

      pendingResults.current.set(round, request);
      return request;
    },
    [snapshot],
  );

  const value = useMemo<Formula1ContextValue>(
    () => ({
      snapshot,
      loading,
      refreshing,
      error,
      selectedRaceRound,
      favoriteDriverId: preferences.favoriteDriverId,
      favoriteConstructorId: preferences.favoriteConstructorId,
      setSelectedRaceRound,
      setFavoriteDriverId: (favoriteDriverId) =>
        updatePreferences({ favoriteDriverId }),
      setFavoriteConstructorId: (favoriteConstructorId) =>
        updatePreferences({ favoriteConstructorId }),
      refresh,
      loadRaceResults,
    }),
    [
      error,
      loadRaceResults,
      loading,
      preferences,
      refresh,
      refreshing,
      selectedRaceRound,
      snapshot,
      updatePreferences,
    ],
  );

  return (
    <Formula1Context.Provider value={value}>
      {children}
    </Formula1Context.Provider>
  );
}

export function useFormula1() {
  const context = useContext(Formula1Context);
  if (!context) {
    throw new Error("useFormula1 must be used inside Formula1Provider");
  }
  return context;
}
