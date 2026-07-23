import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReminderInspector } from "@/features/reminders/components/reminder-inspector";
import { useReminders } from "@/features/reminders/model/reminders-provider";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ReminderDetailsDialog() {
  const { selectedReminderId, setSelectedReminderId } = useReminders();
  const usesDialog = useMediaQuery("(max-width: 1279px)");

  if (!usesDialog) return null;

  return (
    <Dialog
      open={Boolean(selectedReminderId)}
      onOpenChange={(open) => {
        if (!open) setSelectedReminderId(null);
      }}
    >
      <DialogContent
        showClose={false}
        className="top-0 right-0 bottom-0 left-auto h-dvh w-[min(100%,380px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:translate-x-full data-[state=closed]:scale-100 sm:rounded-l-2xl"
      >
        <DialogTitle className="sr-only">Reminder details</DialogTitle>
        <DialogDescription className="sr-only">Edit the selected reminder.</DialogDescription>
        <ReminderInspector className="w-full border-l-0" />
      </DialogContent>
    </Dialog>
  );
}
