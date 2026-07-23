import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AppId } from "./types";

type AppsContextValue = {
  activeApp: AppId;
  setActiveApp: (app: AppId) => void;
};

const AppsContext = createContext<AppsContextValue | null>(null);

const readActiveApp = (): AppId => {
  try {
    const stored = localStorage.getItem("lifever-active-app");
    if (
      stored === "calendar" ||
      stored === "kanban" ||
      stored === "formula1"
    ) {
      return stored;
    }
    return "reminders";
  } catch {
    return "reminders";
  }
};

export function AppsProvider({ children }: PropsWithChildren) {
  const [activeApp, setActiveApp] = useState<AppId>(readActiveApp);

  useEffect(() => {
    try {
      localStorage.setItem("lifever-active-app", activeApp);
    } catch {
      // The in-memory selection still works in restricted contexts.
    }
  }, [activeApp]);

  const value = useMemo(() => ({ activeApp, setActiveApp }), [activeApp]);

  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>;
}

export function useApps() {
  const context = useContext(AppsContext);
  if (!context) throw new Error("useApps must be used inside AppsProvider");
  return context;
}
