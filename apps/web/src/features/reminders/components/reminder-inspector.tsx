import {
  Check,
  CircleCheckBig,
  Flag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reminderControlValueClassName } from "@/features/reminders/components/reminder-control-styles";
import { ReminderSchedulePicker } from "@/features/reminders/components/reminder-schedule-picker";
import {
  playReminderCompletionSound,
  prepareReminderCompletionSound,
} from "@/features/reminders/lib/completion-sound";
import { useReminders } from "@/features/reminders/model/reminders-provider";
import { cn } from "@/lib/cn";

type ReminderInspectorProps = {
  className?: string;
};

export function ReminderInspector({ className }: ReminderInspectorProps) {
  const {
    reminders,
    removeReminder,
    restoreReminder,
    selectedReminderId,
    setSelectedReminderId,
    updateReminder,
  } = useReminders();
  const reminder = reminders.find((item) => item.id === selectedReminderId);

  if (!reminder) {
    return (
      <aside
        className={cn(
          "flex h-full w-[340px] shrink-0 items-center justify-center border-l border-border bg-card px-8 text-center",
          className,
        )}
      >
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CircleCheckBig className="size-[18px]" />
          </div>
          <p className="mt-3 text-sm font-medium">Select a reminder</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Its details will stay close without getting in your way.
          </p>
        </div>
      </aside>
    );
  }

  const completed = Boolean(reminder.completedAt);
  const deleteReminder = () => {
    const removed = removeReminder(reminder.id);
    if (!removed) return;
    toast("Reminder deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreReminder(removed);
          setSelectedReminderId(removed.id);
        },
      },
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full w-[340px] shrink-0 flex-col overflow-hidden border-l border-border bg-card",
        className,
      )}
      aria-label="Reminder details"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <h2 className="text-sm font-semibold">Details</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setSelectedReminderId(null)}
          aria-label="Close details"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => {
              if (!completed) playReminderCompletionSound();
              updateReminder(reminder.id, {
                completedAt: completed ? null : new Date().toISOString(),
              });
            }}
            onPointerDown={() => {
              if (!completed) prepareReminderCompletionSound();
            }}
            onKeyDown={(event) => {
              if (
                !completed &&
                (event.key === "Enter" || event.key === " ")
              ) {
                prepareReminderCompletionSound();
              }
            }}
            className={cn(
              "mt-3 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] outline-none transition-[background-color,border-color,transform] active:scale-90 focus-visible:ring-2 focus-visible:ring-ring",
              completed
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/45",
            )}
            aria-label={completed ? "Mark incomplete" : "Mark complete"}
          >
            {completed ? <Check className="size-3" strokeWidth={3} /> : null}
          </button>
          <Textarea
            value={reminder.title}
            onChange={(event) => updateReminder(reminder.id, { title: event.target.value })}
            className="min-h-20 border-0 bg-transparent px-0 text-base leading-6 font-semibold shadow-none focus:ring-0"
            aria-label="Reminder title"
          />
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor="reminder-notes" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <Textarea
              id="reminder-notes"
              value={reminder.notes}
              onChange={(event) => updateReminder(reminder.id, { notes: event.target.value })}
              placeholder="Add a note"
            />
          </div>

          <div className="rounded-xl border border-border bg-background">
            <ReminderSchedulePicker
              value={reminder.dueAt}
              onChange={(dueAt) => updateReminder(reminder.id, { dueAt })}
            />

            <button
              type="button"
              onClick={() =>
                updateReminder(reminder.id, { important: !reminder.important })
              }
              aria-pressed={reminder.important}
              className="flex min-h-11 w-full items-center gap-3 rounded-b-xl px-3 text-[13px] font-medium outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted/70"
            >
              <Flag
                className={cn(
                  "size-4 text-orange-500",
                  reminder.important && "fill-orange-500",
                )}
              />
              <span className="flex-1 text-left">Important</span>
              <span
                className={cn(
                  reminderControlValueClassName,
                  "inline-flex items-center justify-end",
                )}
              >
                {reminder.important ? "On" : "Off"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/60 px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-auto justify-start rounded-md px-2 text-[12px] font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={deleteReminder}
        >
          <Trash2 className="size-3.5" strokeWidth={1.8} />
          Delete Reminder
        </Button>
      </div>
    </aside>
  );
}
