import { Copy, Trash2 } from "lucide-react";
import type { ReactElement } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { CalendarEvent } from "@/features/calendar/model/types";
import { useCalendarEventActions } from "@/features/calendar/model/use-calendar-event-actions";

type CalendarEventContextMenuProps = {
  children: ReactElement;
  event: CalendarEvent;
};

export function CalendarEventContextMenu({
  children,
  event,
}: CalendarEventContextMenuProps) {
  const { deleteCalendarEvent, duplicateCalendarEvent } =
    useCalendarEventActions();

  if (event.readOnly) return children;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={() => duplicateCalendarEvent(event.id)}>
          <Copy className="size-3.5" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          onSelect={() => deleteCalendarEvent(event.id)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
