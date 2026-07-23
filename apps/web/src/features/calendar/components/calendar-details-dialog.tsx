import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarInspector } from "@/features/calendar/components/calendar-inspector";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { useMediaQuery } from "@/hooks/use-media-query";

export function CalendarDetailsDialog() {
  const { selectedEventId, setSelectedEventId } = useCalendar();
  const usesDialog = useMediaQuery("(max-width: 1279px)");

  if (!usesDialog) return null;

  return (
    <Dialog
      open={Boolean(selectedEventId)}
      onOpenChange={(open) => {
        if (!open) setSelectedEventId(null);
      }}
    >
      <DialogContent
        showClose={false}
        className="top-0 right-0 bottom-0 left-auto h-dvh w-[min(100%,410px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:translate-x-full data-[state=closed]:scale-100 sm:rounded-l-2xl"
      >
        <DialogTitle className="sr-only">Event details</DialogTitle>
        <DialogDescription className="sr-only">Edit the selected calendar event.</DialogDescription>
        <CalendarInspector className="w-full border-l-0" />
      </DialogContent>
    </Dialog>
  );
}
