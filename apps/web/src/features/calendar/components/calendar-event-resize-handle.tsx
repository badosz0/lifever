import type { PointerEventHandler } from "react";

import { cn } from "@/lib/cn";

type CalendarEventResizeHandleProps = {
  edge: "start" | "end";
  onPointerCancel: PointerEventHandler<HTMLSpanElement>;
  onPointerDown: PointerEventHandler<HTMLSpanElement>;
  onPointerMove: PointerEventHandler<HTMLSpanElement>;
  onPointerUp: PointerEventHandler<HTMLSpanElement>;
};

export function CalendarEventResizeHandle({
  edge,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: CalendarEventResizeHandleProps) {
  return (
    <span
      data-calendar-resize-handle={edge}
      className={cn(
        "absolute inset-x-0 z-10 h-2 cursor-ns-resize",
        edge === "start" ? "top-0" : "bottom-0",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={(event) => event.stopPropagation()}
      aria-hidden="true"
    />
  );
}
