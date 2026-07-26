import { useCallback } from "react";
import { toast } from "sonner";

import { formatEventRange } from "@/features/calendar/lib/dates";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";

export function useCalendarEventActions() {
  const {
    duplicateEvent,
    registerEventUndo,
    removeEvent,
    restoreEvent,
    setSelectedEventId,
  } = useCalendar();
  const { timeFormat } = useUserPreferences();

  const deleteCalendarEvent = useCallback(
    (id: string) => {
      const removed = removeEvent(id);
      if (!removed) return;
      let toastId: string | number | undefined;
      const undo = registerEventUndo(() => {
        if (toastId !== undefined) toast.dismiss(toastId);
        const restored = restoreEvent(removed);
        setSelectedEventId(restored?.id ?? null);
      });
      toastId = toast("Event deleted", {
        action: {
          label: "Undo",
          onClick: undo,
        },
      });
    },
    [registerEventUndo, removeEvent, restoreEvent, setSelectedEventId],
  );

  const duplicateCalendarEvent = useCallback(
    (id: string) => {
      const copy = duplicateEvent(id);
      if (!copy) return;
      let toastId: string | number | undefined;
      const undo = registerEventUndo(() => {
        if (toastId !== undefined) toast.dismiss(toastId);
        removeEvent(copy.id);
        setSelectedEventId(id);
      });
      toastId = toast.success("Event duplicated", {
        description: formatEventRange(copy.startAt, copy.endAt, timeFormat),
        action: {
          label: "Undo",
          onClick: undo,
        },
      });
    },
    [
      duplicateEvent,
      registerEventUndo,
      removeEvent,
      setSelectedEventId,
      timeFormat,
    ],
  );

  return { deleteCalendarEvent, duplicateCalendarEvent };
}
