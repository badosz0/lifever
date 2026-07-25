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

import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";
import type {
  DateFormatPreference,
  TimeFormatPreference,
  UserFormatPreferences,
} from "@/lib/date-time-format";

type UserPreferencesContextValue = UserFormatPreferences & {
  setDateFormat: (format: DateFormatPreference) => void;
  setTimeFormat: (format: TimeFormatPreference) => void;
};

type PreferencesPayload = {
  preferences: UserFormatPreferences;
};

const STORAGE_KEY = "lifever-user-preferences";
const DEFAULT_PREFERENCES: UserFormatPreferences = {
  dateFormat: "system",
  timeFormat: "system",
};

const isDateFormat = (value: unknown): value is DateFormatPreference =>
  value === "system" ||
  value === "month-day-year" ||
  value === "day-month-year" ||
  value === "year-month-day";

const isTimeFormat = (value: unknown): value is TimeFormatPreference =>
  value === "system" || value === "12-hour" || value === "24-hour";

const readPreferences = (): UserFormatPreferences => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
      dateFormat?: unknown;
      timeFormat?: unknown;
    } | null;
    return {
      dateFormat: isDateFormat(stored?.dateFormat)
        ? stored.dateFormat
        : DEFAULT_PREFERENCES.dateFormat,
      timeFormat: isTimeFormat(stored?.timeFormat)
        ? stored.timeFormat
        : DEFAULT_PREFERENCES.timeFormat,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const [preferences, setPreferences] =
    useState<UserFormatPreferences>(DEFAULT_PREFERENCES);
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const writeChain = useRef(Promise.resolve());
  const pendingWrites = useRef(0);

  const loadRemote = useCallback(async (userId: string) => {
    const requestedMode = `user:${userId}`;
    const requestedVersion = mutationVersion.current;
    try {
      const { preferences: remotePreferences } =
        await apiRequest<PreferencesPayload>("/api/preferences");
      if (
        modeRef.current === requestedMode &&
        mutationVersion.current === requestedVersion
      ) {
        setPreferences(remotePreferences);
        setHydratedMode(requestedMode);
      }
    } catch {
      if (modeRef.current === requestedMode) setHydratedMode(requestedMode);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    setHydratedMode(null);
    if (userId) {
      setPreferences(DEFAULT_PREFERENCES);
      void loadRemote(userId);
    } else {
      setPreferences(readPreferences());
      setHydratedMode("local");
    }
  }, [isPending, loadRemote, session?.user.id]);

  useEffect(() => {
    if (hydratedMode !== "local" || session || isPending) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // The in-memory preferences still work in restricted contexts.
    }
  }, [hydratedMode, isPending, preferences, session]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        pendingWrites.current === 0
      ) {
        void loadRemote(userId);
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadRemote, session?.user.id]);

  const updateRemote = useCallback(
    (patch: Partial<UserFormatPreferences>) => {
      if (!session) return;
      pendingWrites.current += 1;
      const request = writeChain.current.then(() =>
        apiRequest("/api/preferences", {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      );
      writeChain.current = request.then(
        () => undefined,
        () => undefined,
      );
      void request
        .catch(() => void loadRemote(session.user.id))
        .finally(() => {
          pendingWrites.current -= 1;
        });
    },
    [loadRemote, session],
  );

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      ...preferences,
      setDateFormat: (dateFormat) => {
        mutationVersion.current += 1;
        setPreferences((current) => ({ ...current, dateFormat }));
        updateRemote({ dateFormat });
      },
      setTimeFormat: (timeFormat) => {
        mutationVersion.current += 1;
        setPreferences((current) => ({ ...current, timeFormat }));
        updateRemote({ timeFormat });
      },
    }),
    [preferences, updateRemote],
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error(
      "useUserPreferences must be used inside UserPreferencesProvider",
    );
  }
  return context;
}
