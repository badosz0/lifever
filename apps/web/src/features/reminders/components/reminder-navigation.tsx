import { useReminders } from "@/features/reminders/model/reminders-provider";
import { cn } from "@/lib/cn";

type ReminderNavigationProps = {
  className?: string;
};

const views = [
  { id: "today", label: "Today" },
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
] as const;

export function ReminderNavigation({ className }: ReminderNavigationProps) {
  const { activeView, setActiveView } = useReminders();

  return (
    <nav className={cn("flex min-w-0 items-center", className)} aria-label="Reminder views">
      {views.map((view) => {
        const selected = activeView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
            className={cn(
              "relative flex h-8 shrink-0 items-center rounded-md px-2 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-current={selected ? "page" : undefined}
          >
            {view.label}
            <span
              className={cn(
                "absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-primary transition-opacity duration-150",
                selected ? "opacity-100" : "opacity-0",
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </nav>
  );
}
