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

import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { useSerialTaskQueue } from "@/hooks/use-serial-task-queue";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";
import type {
  DateFormatPreference,
  TimeFormatPreference,
  UserFormatPreferences,
} from "@/lib/date-time-format";

type UserPreferences = UserFormatPreferences & {
  calendarClickToCreate: boolean;
};

type UserPreferencesContextValue = UserPreferences & {
  setCalendarClickToCreate: (enabled: boolean) => void;
  setDateFormat: (format: DateFormatPreference) => void;
  setTimeFormat: (format: TimeFormatPreference) => void;
};

type PreferencesPayload = {
  preferences: UserPreferences;
};

const STORAGE_KEY = "lifever-user-preferences";
const DEFAULT_PREFERENCES: UserPreferences = {
  calendarClickToCreate: true,
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

const normalizePreferences = (
  stored: Partial<Record<keyof UserPreferences, unknown>> | null,
): UserPreferences => ({
  calendarClickToCreate:
    typeof stored?.calendarClickToCreate === "boolean"
      ? stored.calendarClickToCreate
      : DEFAULT_PREFERENCES.calendarClickToCreate,
  dateFormat: isDateFormat(stored?.dateFormat)
    ? stored.dateFormat
    : DEFAULT_PREFERENCES.dateFormat,
  timeFormat: isTimeFormat(stored?.timeFormat)
    ? stored.timeFormat
    : DEFAULT_PREFERENCES.timeFormat,
});

const readPreferences = (): UserPreferences => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<Record<keyof UserPreferences, unknown>> | null;
    return normalizePreferences(stored);
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const UserPreferencesContext =
  createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const pendingWrites = useRef(0);
  const enqueueWrite = useSerialTaskQueue();

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
        setPreferences(normalizePreferences(remotePreferences));
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

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (userId && pendingWrites.current === 0) void loadRemote(userId);
  }, Boolean(session?.user.id));

  const updateRemote = useCallback(
    (patch: Partial<UserPreferences>) => {
      if (!session) return;
      pendingWrites.current += 1;
      const request = enqueueWrite(() =>
        apiRequest("/api/preferences", {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      );
      void request
        .catch(() => void loadRemote(session.user.id))
        .finally(() => {
          pendingWrites.current -= 1;
        });
    },
    [enqueueWrite, loadRemote, session],
  );

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      ...preferences,
      setCalendarClickToCreate: (calendarClickToCreate) => {
        mutationVersion.current += 1;
        setPreferences((current) => ({
          ...current,
          calendarClickToCreate,
        }));
        updateRemote({ calendarClickToCreate });
      },
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
