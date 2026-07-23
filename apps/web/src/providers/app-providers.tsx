import type { PropsWithChildren } from "react";

import { AppsProvider } from "@/features/apps/model/apps-provider";
import { CalendarProvider } from "@/features/calendar/model/calendar-provider";
import { KanbanProvider } from "@/features/kanban/model/kanban-provider";
import { Formula1Provider } from "@/features/formula1/model/formula1-provider";
import { RemindersProvider } from "@/features/reminders/model/reminders-provider";
import { UserPreferencesProvider } from "@/features/settings/model/user-preferences-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <UserPreferencesProvider>
      <AppsProvider>
        <RemindersProvider>
          <CalendarProvider>
            <KanbanProvider>
              <Formula1Provider>{children}</Formula1Provider>
            </KanbanProvider>
          </CalendarProvider>
        </RemindersProvider>
      </AppsProvider>
    </UserPreferencesProvider>
  );
}
