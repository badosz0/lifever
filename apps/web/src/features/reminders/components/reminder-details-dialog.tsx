import { ResponsiveDetailsDialog } from "@/components/app-shell/responsive-details-dialog";
import { ReminderInspector } from "@/features/reminders/components/reminder-inspector";
import { useReminders } from "@/features/reminders/model/reminders-provider";

export function ReminderDetailsDialog() {
  const { selectedReminderId, setSelectedReminderId } = useReminders();

  return (
    <ResponsiveDetailsDialog
      open={Boolean(selectedReminderId)}
      onOpenChange={(open) => {
        if (!open) setSelectedReminderId(null);
      }}
      title="Reminder details"
      description="Edit the selected reminder."
      className="w-[min(100%,380px)]"
    >
      <ReminderInspector className="w-full border-l-0" />
    </ResponsiveDetailsDialog>
  );
}
