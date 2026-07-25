import { ResponsiveDetailsDialog } from "@/components/app-shell/responsive-details-dialog";
import { CalendarInspector } from "@/features/calendar/components/calendar-inspector";
import { useCalendar } from "@/features/calendar/model/calendar-provider";

export function CalendarDetailsDialog() {
  const { selectedEventId, setSelectedEventId } = useCalendar();

  return (
    <ResponsiveDetailsDialog
      open={Boolean(selectedEventId)}
      onOpenChange={(open) => {
        if (!open) setSelectedEventId(null);
      }}
      title="Event details"
      description="Edit the selected calendar event."
      className="w-[min(100%,410px)]"
    >
      <CalendarInspector className="w-full border-l-0" />
    </ResponsiveDetailsDialog>
  );
}
