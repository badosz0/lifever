import type { PropsWithChildren } from "react";

import { AppsProvider } from "@/features/apps/model/apps-provider";
import { CalendarProvider } from "@/features/calendar/model/calendar-provider";
import { KanbanProvider } from "@/features/kanban/model/kanban-provider";
import { RemindersProvider } from "@/features/reminders/model/reminders-provider";
import { UserPreferencesProvider } from "@/features/settings/model/user-preferences-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <UserPreferencesProvider>
      <AppsProvider>
        <RemindersProvider>
          <CalendarProvider>
            <KanbanProvider>{children}</KanbanProvider>
          </CalendarProvider>
        </RemindersProvider>
      </AppsProvider>
    </UserPreferencesProvider>
  );
}
