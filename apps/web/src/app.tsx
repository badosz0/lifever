import { AppShell } from "@/components/app-shell/app-shell";
import { GlobalContextMenuGuard } from "@/components/app-shell/global-context-menu-guard";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarNotificationScheduler } from "@/features/calendar/components/calendar-notification-scheduler";
import { ReminderNotificationScheduler } from "@/features/reminders/components/reminder-notification-scheduler";
import { AppProviders } from "@/providers/app-providers";
import { ThemeProvider } from "@/providers/theme-provider";

export function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppProviders>
          <GlobalContextMenuGuard />
          <ReminderNotificationScheduler />
          <CalendarNotificationScheduler />
          <AppShell />
          <Toaster />
        </AppProviders>
      </TooltipProvider>
    </ThemeProvider>
  );
}
