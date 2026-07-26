import { toast } from "sonner";

import { formatEventRange } from "@/features/calendar/lib/dates";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";

export function useCalendarEventActions() {
  const {
    duplicateEvent,
    removeEvent,
    restoreEvent,
    setSelectedEventId,
  } = useCalendar();
  const { timeFormat } = useUserPreferences();

  const deleteCalendarEvent = (id: string) => {
    const removed = removeEvent(id);
    if (!removed) return;
    toast("Event deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreEvent(removed);
          setSelectedEventId(removed.id);
        },
      },
    });
  };

  const duplicateCalendarEvent = (id: string) => {
    const copy = duplicateEvent(id);
    if (!copy) return;
    toast.success("Event duplicated", {
      description: formatEventRange(copy.startAt, copy.endAt, timeFormat),
      action: {
        label: "Undo",
        onClick: () => {
          removeEvent(copy.id);
          setSelectedEventId(id);
        },
      },
    });
  };

  return { deleteCalendarEvent, duplicateCalendarEvent };
}
