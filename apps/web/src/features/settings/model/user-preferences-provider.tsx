import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  DateFormatPreference,
  TimeFormatPreference,
  UserFormatPreferences,
} from "@/lib/date-time-format";

type UserPreferencesContextValue = UserFormatPreferences & {
  setDateFormat: (format: DateFormatPreference) => void;
  setTimeFormat: (format: TimeFormatPreference) => void;
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
  const [preferences, setPreferences] =
    useState<UserFormatPreferences>(readPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // The in-memory preferences still work in restricted contexts.
    }
  }, [preferences]);

  const value = useMemo<UserPreferencesContextValue>(
    () => ({
      ...preferences,
      setDateFormat: (dateFormat) =>
        setPreferences((current) => ({ ...current, dateFormat })),
      setTimeFormat: (timeFormat) =>
        setPreferences((current) => ({ ...current, timeFormat })),
    }),
    [preferences],
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
