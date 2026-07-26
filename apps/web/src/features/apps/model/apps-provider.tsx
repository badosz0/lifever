import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  isRegisteredFeatureAppId,
  lifeverFeatureApps,
  lifeverFeatureAppsById,
} from "@/features/apps/feature-app-registry";
import {
  type AppPreferenceOverride,
  useUserPreferences,
} from "@/features/settings/model/user-preferences-provider";

import type {
  AppId,
  FeatureAppDefinition,
  FeatureAppId,
} from "./types";

type AppsContextValue = {
  activeApp: AppId;
  enabledApps: FeatureAppDefinition[];
  homeApps: FeatureAppDefinition[];
  homeAppOrder: FeatureAppId[];
  isAppEnabled: (app: FeatureAppId) => boolean;
  isAppOnHome: (app: FeatureAppId) => boolean;
  setActiveApp: (app: AppId) => void;
  setAppEnabled: (app: FeatureAppId, enabled: boolean) => void;
  setAppOnHome: (app: FeatureAppId, showOnHome: boolean) => void;
  setHomeAppOrder: (apps: FeatureAppId[]) => void;
};

const AppsContext = createContext<AppsContextValue | null>(null);

const readActiveApp = (): AppId => {
  try {
    const stored = localStorage.getItem("lifever-active-app");
    if (stored === "home" || isRegisteredFeatureAppId(stored)) return stored;
    return "home";
  } catch {
    return "home";
  }
};

export function AppsProvider({ children }: PropsWithChildren) {
  const {
    appConfiguration,
    isReady: preferencesReady,
    setAppConfiguration,
  } = useUserPreferences();
  const [activeApp, setActiveAppState] = useState<AppId>(readActiveApp);

  const isAppEnabled = useCallback(
    (appId: FeatureAppId) => {
      const app = lifeverFeatureAppsById.get(appId);
      if (!app) return false;
      return appConfiguration.apps?.[appId]?.enabled ?? app.defaultEnabled;
    },
    [appConfiguration.apps],
  );
  const isAppOnHome = useCallback(
    (appId: FeatureAppId) => {
      const app = lifeverFeatureAppsById.get(appId);
      if (!app || !isAppEnabled(appId)) return false;
      return (
        appConfiguration.apps?.[appId]?.showOnHome ?? app.defaultOnHome
      );
    },
    [appConfiguration.apps, isAppEnabled],
  );
  const enabledApps = useMemo(
    () => lifeverFeatureApps.filter((app) => isAppEnabled(app.id)),
    [isAppEnabled],
  );
  const homeAppOrder = useMemo(() => {
    const registeredIds = new Set(lifeverFeatureApps.map((app) => app.id));
    const stored = (appConfiguration.homeOrder ?? []).filter((appId) =>
      registeredIds.has(appId),
    );
    return [
      ...new Set([
        ...stored,
        ...lifeverFeatureApps.map((app) => app.id),
      ]),
    ];
  }, [appConfiguration.homeOrder]);
  const homeApps = useMemo(
    () =>
      homeAppOrder.flatMap((appId) => {
        const app = lifeverFeatureAppsById.get(appId);
        return app && isAppOnHome(appId) ? [app] : [];
      }),
    [homeAppOrder, isAppOnHome],
  );

  const setActiveApp = useCallback(
    (app: AppId) => {
      if (
        app !== "home" &&
        (!isRegisteredFeatureAppId(app) || !isAppEnabled(app))
      ) {
        return;
      }
      setActiveAppState(app);
    },
    [isAppEnabled],
  );
  const setAppEnabled = useCallback(
    (appId: FeatureAppId, enabled: boolean) => {
      const app = lifeverFeatureAppsById.get(appId);
      if (!app) return;
      const existing = appConfiguration.apps?.[appId] ?? {};
      const nextOverride: AppPreferenceOverride = { ...existing, enabled };
      if (enabled === app.defaultEnabled) delete nextOverride.enabled;
      const apps = { ...appConfiguration.apps };
      if (Object.keys(nextOverride).length) apps[appId] = nextOverride;
      else delete apps[appId];
      setAppConfiguration({
        ...appConfiguration,
        ...(Object.keys(apps).length ? { apps } : { apps: undefined }),
      });
    },
    [appConfiguration, setAppConfiguration],
  );
  const setAppOnHome = useCallback(
    (appId: FeatureAppId, showOnHome: boolean) => {
      const app = lifeverFeatureAppsById.get(appId);
      if (!app) return;
      const existing = appConfiguration.apps?.[appId] ?? {};
      const nextOverride: AppPreferenceOverride = {
        ...existing,
        showOnHome,
      };
      if (showOnHome === app.defaultOnHome) delete nextOverride.showOnHome;
      const apps = { ...appConfiguration.apps };
      if (Object.keys(nextOverride).length) apps[appId] = nextOverride;
      else delete apps[appId];
      setAppConfiguration({
        ...appConfiguration,
        ...(Object.keys(apps).length ? { apps } : { apps: undefined }),
      });
    },
    [appConfiguration, setAppConfiguration],
  );
  const setHomeAppOrder = useCallback(
    (apps: FeatureAppId[]) => {
      const registered = new Set(lifeverFeatureApps.map((app) => app.id));
      const normalized = [
        ...new Set(apps.filter((appId) => registered.has(appId))),
      ];
      setAppConfiguration({
        ...appConfiguration,
        homeOrder: normalized.length ? normalized : undefined,
      });
    },
    [appConfiguration, setAppConfiguration],
  );

  useEffect(() => {
    if (
      preferencesReady &&
      activeApp !== "home" &&
      !isAppEnabled(activeApp)
    ) {
      setActiveAppState("home");
    }
  }, [activeApp, isAppEnabled, preferencesReady]);

  useEffect(() => {
    try {
      localStorage.setItem("lifever-active-app", activeApp);
    } catch {
      // The in-memory selection still works in restricted contexts.
    }
  }, [activeApp]);

  const value = useMemo(
    () => ({
      activeApp,
      enabledApps,
      homeApps,
      homeAppOrder,
      isAppEnabled,
      isAppOnHome,
      setActiveApp,
      setAppEnabled,
      setAppOnHome,
      setHomeAppOrder,
    }),
    [
      activeApp,
      enabledApps,
      homeApps,
      homeAppOrder,
      isAppEnabled,
      isAppOnHome,
      setActiveApp,
      setAppEnabled,
      setAppOnHome,
      setHomeAppOrder,
    ],
  );

  return <AppsContext.Provider value={value}>{children}</AppsContext.Provider>;
}

export function useApps() {
  const context = useContext(AppsContext);
  if (!context) throw new Error("useApps must be used inside AppsProvider");
  return context;
}
