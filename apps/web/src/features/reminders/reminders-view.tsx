import {
  ArrowUpDown,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AppHeader,
  AppHeaderToolbar,
} from "@/components/app-shell/app-header";
import { AppSettingsButton } from "@/components/app-shell/app-settings-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { EmptyReminders } from "@/features/reminders/components/empty-reminders";
import { NewReminderComposer } from "@/features/reminders/components/new-reminder-composer";
import { ReminderNavigation } from "@/features/reminders/components/reminder-navigation";
import { ReminderRow } from "@/features/reminders/components/reminder-row";
import { ReminderSection } from "@/features/reminders/components/reminder-section";
import { isBeforeToday, isSameLocalDay } from "@/features/reminders/lib/dates";
import { useReminders } from "@/features/reminders/model/reminders-provider";
import type { Reminder } from "@/features/reminders/model/types";

type RemindersViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

type ReminderSort = "due" | "created";

type ReminderViewOptions = {
  sort: ReminderSort;
};

const defaultViewOptions: ReminderViewOptions = {
  sort: "due",
};

const readViewOptions = (): ReminderViewOptions => {
  try {
    const stored = JSON.parse(
      localStorage.getItem("lifever-reminder-view-options") ?? "null",
    ) as Partial<ReminderViewOptions> | null;

    return {
      sort: stored?.sort === "created" ? "created" : "due",
    };
  } catch {
    return defaultViewOptions;
  }
};

const byDueDate = (a: Reminder, b: Reminder) => {
  if (!a.dueAt && !b.dueAt) return a.createdAt.localeCompare(b.createdAt);
  if (!a.dueAt) return 1;
  if (!b.dueAt) return -1;
  return a.dueAt.localeCompare(b.dueAt);
};

const byCreatedDate = (a: Reminder, b: Reminder) =>
  b.createdAt.localeCompare(a.createdAt);

export function RemindersView({
  onOpenMobileSidebar,
  onToggleSidebar,
}: RemindersViewProps) {
  const {
    activeView,
    clearCompletedReminders,
    isReady,
    reminders,
    selectedReminderId,
    setSelectedReminderId,
    updateReminder,
  } = useReminders();
  const [composerOpen, setComposerOpen] = useState(false);
  const [clearCompletedOpen, setClearCompletedOpen] = useState(false);
  const [viewOptions, setViewOptions] = useState(readViewOptions);
  const openComposer = useCallback(() => {
    if (!isReady) return;
    setSelectedReminderId(null);
    setComposerOpen(true);
  }, [isReady, setSelectedReminderId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "lifever-reminder-view-options",
        JSON.stringify(viewOptions),
      );
    } catch {
      // View preferences remain available for this session if storage is blocked.
    }
  }, [viewOptions]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']");
      const commandPressed = event.metaKey || event.ctrlKey;

      if (
        event.key.toLowerCase() === "n" &&
        !event.altKey &&
        (commandPressed || !isTyping)
      ) {
        event.preventDefault();
        openComposer();
      }

    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openComposer]);

  const title =
    ({
      today: "Today",
      all: "All Reminders",
      completed: "Completed",
    }[activeView] || "Reminders");

  const { completed, overdue, pendingCount, remaining, today } = useMemo(() => {
    const filtered = reminders
      .filter((reminder) => {
        if (activeView === "completed") return Boolean(reminder.completedAt);
        if (reminder.completedAt) return false;
        if (activeView === "today") {
          return (
            !reminder.dueAt ||
            isSameLocalDay(reminder.dueAt) ||
            isBeforeToday(reminder.dueAt)
          );
        }
        return true;
      })
      .sort(viewOptions.sort === "due" ? byDueDate : byCreatedDate);

    const groups = {
      overdue: [] as Reminder[],
      today: [] as Reminder[],
      remaining: [] as Reminder[],
      completed: [] as Reminder[],
    };

    for (const reminder of filtered) {
      if (activeView === "completed") {
        groups.completed.push(reminder);
      } else if (isBeforeToday(reminder.dueAt)) {
        groups.overdue.push(reminder);
      } else if (isSameLocalDay(reminder.dueAt)) {
        groups.today.push(reminder);
      } else {
        groups.remaining.push(reminder);
      }
    }

    return {
      ...groups,
      pendingCount:
        groups.overdue.length + groups.today.length + groups.remaining.length,
    };
  }, [activeView, reminders, viewOptions.sort]);

  const completedTotal = useMemo(
    () =>
      reminders.reduce(
        (count, reminder) => count + Number(Boolean(reminder.completedAt)),
        0,
      ),
    [reminders],
  );
  const allReminders = useMemo(
    () =>
      [...today, ...remaining].sort(
        viewOptions.sort === "due" ? byDueDate : byCreatedDate,
      ),
    [remaining, today, viewOptions.sort],
  );
  const visibleSectionCount =
    activeView === "completed"
      ? Number(completed.length > 0)
      : activeView === "all"
        ? Number(overdue.length > 0) + Number(allReminders.length > 0)
        : Number(overdue.length > 0) +
          Number(today.length > 0) +
          Number(remaining.length > 0);
  const showSectionHeaders = visibleSectionCount > 1;
  const visibleCount = activeView === "completed" ? completed.length : pendingCount;
  const visibleEmpty = visibleCount === 0;

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <AppHeader>
        <AppHeaderToolbar
          onOpenMobileSidebar={onOpenMobileSidebar}
          onToggleSidebar={onToggleSidebar}
        >
          <ReminderNavigation />
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AppSettingsButton label="Reminder settings" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                  Sort By
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={viewOptions.sort}
                    onValueChange={(sort) =>
                      setViewOptions((current) => ({
                        ...current,
                        sort: sort as ReminderSort,
                      }))
                    }
                  >
                    <DropdownMenuRadioItem value="due">
                      Due Date
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="created">
                      Date Created
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={completedTotal === 0}
                className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                onSelect={() => setClearCompletedOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete Completed…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ShortcutTooltip label="New Reminder" shortcut={["⌘", "N"]}>
            <Button
              size="icon-sm"
              className="size-7 rounded-full"
              onClick={openComposer}
              disabled={!isReady}
              aria-label="New reminder"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </Button>
          </ShortcutTooltip>
        </AppHeaderToolbar>

        <div className="mt-6 flex items-end gap-3 px-1 sm:mt-8">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[30px] leading-[1.08] font-bold tracking-[-0.03em] sm:text-[34px]">
              {title}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {activeView === "completed"
                ? `${completed.length} completed`
                : pendingCount === 0
                  ? "You're all caught up"
                  : `${pendingCount} ${pendingCount === 1 ? "reminder" : "reminders"}`}
            </p>
          </div>
        </div>
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-24 sm:px-6">
        <div className="mx-auto max-w-3xl pt-2">
          <NewReminderComposer open={composerOpen} onOpenChange={setComposerOpen} />

          {visibleEmpty ? (
            <EmptyReminders
              view={activeView === "completed" ? "completed" : "active"}
              onCreate={
                activeView === "completed" || !isReady
                  ? undefined
                  : openComposer
              }
            />
          ) : activeView === "completed" ? (
            <ReminderSection
              title="Completed"
              count={completed.length}
              showHeader={false}
            >
              {completed.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  selected={selectedReminderId === reminder.id}
                  onSelect={setSelectedReminderId}
                  onUpdate={updateReminder}
                />
              ))}
            </ReminderSection>
          ) : (
            <>
              <ReminderSection
                title="Overdue"
                count={overdue.length}
                showHeader={showSectionHeaders}
                tone="danger"
              >
                {overdue.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    selected={selectedReminderId === reminder.id}
                    onSelect={setSelectedReminderId}
                    onUpdate={updateReminder}
                  />
                ))}
              </ReminderSection>

              {activeView === "all" ? (
                <ReminderSection
                  title="Reminders"
                  count={allReminders.length}
                  showHeader={showSectionHeaders}
                >
                  {allReminders.map((reminder) => (
                    <ReminderRow
                      key={reminder.id}
                      reminder={reminder}
                      selected={selectedReminderId === reminder.id}
                      onSelect={setSelectedReminderId}
                      onUpdate={updateReminder}
                    />
                  ))}
                </ReminderSection>
              ) : (
                <>
                  <ReminderSection
                    title="Today"
                    count={today.length}
                    showHeader={showSectionHeaders}
                  >
                    {today.map((reminder) => (
                      <ReminderRow
                        key={reminder.id}
                        reminder={reminder}
                        selected={selectedReminderId === reminder.id}
                        onSelect={setSelectedReminderId}
                        onUpdate={updateReminder}
                      />
                    ))}
                  </ReminderSection>

                  <ReminderSection
                    title="No date"
                    count={remaining.length}
                    showHeader={showSectionHeaders}
                  >
                    {remaining.map((reminder) => (
                      <ReminderRow
                        key={reminder.id}
                        reminder={reminder}
                        selected={selectedReminderId === reminder.id}
                        onSelect={setSelectedReminderId}
                        onUpdate={updateReminder}
                      />
                    ))}
                  </ReminderSection>
                </>
              )}

            </>
          )}
        </div>
      </div>

      <Dialog open={clearCompletedOpen} onOpenChange={setClearCompletedOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Delete completed reminders?</DialogTitle>
          <DialogDescription className="mt-1.5">
            {completedTotal === 1
              ? "This completed reminder will be permanently deleted."
              : `All ${completedTotal} completed reminders will be permanently deleted.`}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setClearCompletedOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const deleted = clearCompletedReminders();
                setClearCompletedOpen(false);
                if (deleted > 0) {
                  toast.success(
                    `${deleted} completed ${deleted === 1 ? "reminder" : "reminders"} deleted`,
                  );
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
