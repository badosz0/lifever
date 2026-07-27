import { AppShell } from "@/components/app-shell/app-shell";
import { GlobalContextMenuGuard } from "@/components/app-shell/global-context-menu-guard";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalendarNotificationScheduler } from "@/features/calendar/components/calendar-notification-scheduler";
import { SignedOutScreen } from "@/features/auth/components/signed-out-screen";
import { ReminderNotificationScheduler } from "@/features/reminders/components/reminder-notification-scheduler";
import { authClient } from "@/lib/auth-client";
import { isDemoMode } from "@/lib/demo-mode";
import { AppProviders } from "@/providers/app-providers";
import { ThemeProvider } from "@/providers/theme-provider";

function AccountApp() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="h-full bg-background" aria-hidden="true" />;
  }

  if (!session && !isDemoMode) {
    return <SignedOutScreen />;
  }

  return (
    <AppProviders>
      <GlobalContextMenuGuard />
      <ReminderNotificationScheduler />
      <CalendarNotificationScheduler />
      <AppShell />
    </AppProviders>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AccountApp />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
