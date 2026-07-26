import { createElement, type PropsWithChildren, type ReactNode } from "react";

import { lifeverFeatureApps } from "@/features/apps/feature-app-registry";
import { AppsProvider } from "@/features/apps/model/apps-provider";
import { UserPreferencesProvider } from "@/features/settings/model/user-preferences-provider";

export function AppProviders({ children }: PropsWithChildren) {
  const appProviders = lifeverFeatureApps.reduceRight<ReactNode>(
    (content, app) => createElement(app.Provider, null, content),
    children,
  );

  return (
    <UserPreferencesProvider>
      <AppsProvider>{appProviders}</AppsProvider>
    </UserPreferencesProvider>
  );
}
