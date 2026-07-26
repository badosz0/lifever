import {
  createElement,
  Fragment,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { AppCalendarSourceRegistryProvider } from "@/features/apps/calendar-source-registry";
import { lifeverFeatureApps } from "@/features/apps/feature-app-registry";
import { AppsProvider } from "@/features/apps/model/apps-provider";
import { UserPreferencesProvider } from "@/features/settings/model/user-preferences-provider";
import { SharingProvider } from "@/features/sharing/model/sharing-provider";

export function AppProviders({ children }: PropsWithChildren) {
  const appProviders = lifeverFeatureApps.reduceRight<ReactNode>(
    (content, app) => {
      const calendarSource =
        "calendarSource" in app ? app.calendarSource : undefined;
      return createElement(
        app.Provider,
        null,
        calendarSource
          ? createElement(
              Fragment,
              null,
              createElement(calendarSource.Connector),
              content,
            )
          : content,
      );
    },
    children,
  );

  return (
    <UserPreferencesProvider>
      <SharingProvider>
        <AppsProvider>
          <AppCalendarSourceRegistryProvider>
            {appProviders}
          </AppCalendarSourceRegistryProvider>
        </AppsProvider>
      </SharingProvider>
    </UserPreferencesProvider>
  );
}
