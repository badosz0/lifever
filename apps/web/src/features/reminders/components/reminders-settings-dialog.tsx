import { ArrowUpDown, CheckCheck, ListTodo, Trash2 } from "lucide-react";

import {
  SettingsGroup,
  SettingsModal,
  SettingsRow,
  SettingsSection,
  type SettingsDialogProps,
} from "@/components/settings/settings-modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RemindersSettingsDialog({
  open,
  onOpenChange,
  sort,
  onSortChange,
  completedCount,
  onClearCompleted,
}: SettingsDialogProps & {
  sort: "due" | "created";
  onSortChange: (sort: "due" | "created") => void;
  completedCount: number;
  onClearCompleted: () => void;
}) {
  return (
    <SettingsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reminder settings"
      description="Keep your tasks clear and your lists in order."
      icon={ListTodo}
      pages={[
        {
          id: "organization",
          label: "Organization",
          icon: ArrowUpDown,
          description: "Choose the order that helps you focus on what’s next.",
          content: (
            <SettingsSection title="Reminder list">
              <SettingsGroup>
                <SettingsRow
                  title="Sort reminders"
                  description={
                    sort === "due"
                      ? "The earliest due dates appear first. Reminders without a date follow."
                      : "The newest reminders appear first."
                  }
                  controlId="reminders-settings-sort"
                >
                  <Select
                    value={sort}
                    onValueChange={(value) =>
                      onSortChange(value as "due" | "created")
                    }
                  >
                    <SelectTrigger id="reminders-settings-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due">Due date</SelectItem>
                      <SelectItem value="created">Date created</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsRow>
              </SettingsGroup>
            </SettingsSection>
          ),
        },
        {
          id: "cleanup",
          label: "Completed reminders",
          icon: CheckCheck,
          description:
            "Make a little space when you’re done with your completed tasks.",
          content: (
            <SettingsSection
              title="Delete completed reminders"
              destructive
              description="Permanently delete completed reminders from all your devices. Active reminders stay in place."
            >
              <div className="space-y-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
                <p className="text-sm font-medium">
                  {completedCount
                    ? `${completedCount} completed ${completedCount === 1 ? "reminder" : "reminders"}`
                    : "No completed reminders to delete"}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  You’ll be asked to confirm before anything is deleted.
                </p>
                <Button
                  variant="outline"
                  className="border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={!completedCount}
                  onClick={onClearCompleted}
                >
                  <Trash2 className="size-4" />
                  Delete completed…
                </Button>
              </div>
            </SettingsSection>
          ),
        },
      ]}
    />
  );
}
