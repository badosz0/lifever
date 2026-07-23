import { AppShell } from "@/components/app-shell/app-shell";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReminderNotificationScheduler } from "@/features/reminders/components/reminder-notification-scheduler";
import { AppProviders } from "@/providers/app-providers";
import { ThemeProvider } from "@/providers/theme-provider";

export function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppProviders>
          <ReminderNotificationScheduler />
          <AppShell />
          <Toaster />
        </AppProviders>
      </TooltipProvider>
    </ThemeProvider>
  );
}
