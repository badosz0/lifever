import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/cn";

type PanelResizeHandleProps = {
  edge: "left" | "right";
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
  onResizeEnd: () => void;
  onReset: () => void;
  onResizingChange?: (resizing: boolean) => void;
};

const KEYBOARD_STEP = 16;

export function PanelResizeHandle({
  edge,
  label,
  width,
  minWidth,
  maxWidth,
  onResize,
  onResizeEnd,
  onReset,
  onResizingChange,
}: PanelResizeHandleProps) {
  const [resizing, setResizing] = useState(false);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const previousBodyStyles = useRef({ cursor: "", userSelect: "" });

  const restoreBodyStyles = () => {
    document.body.style.cursor = previousBodyStyles.current.cursor;
    document.body.style.userSelect = previousBodyStyles.current.userSelect;
  };

  const finishResize = () => {
    if (!resizingRef.current) return;
    resizingRef.current = false;
    setResizing(false);
    restoreBodyStyles();
    onResizingChange?.(false);
    onResizeEnd();
  };

  useEffect(
    () => () => {
      if (resizingRef.current) restoreBodyStyles();
    },
    [],
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    startXRef.current = event.clientX;
    startWidthRef.current = width;
    resizingRef.current = true;
    setResizing(true);
    previousBodyStyles.current = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
    onResizingChange?.(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizingRef.current) return;
    const pointerDelta = event.clientX - startXRef.current;
    const widthDelta = edge === "right" ? pointerDelta : -pointerDelta;
    onResize(startWidthRef.current + widthDelta);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    finishResize();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextWidth: number | null = null;

    if (event.key === "Home") nextWidth = minWidth;
    if (event.key === "End") nextWidth = maxWidth;
    if (event.key === "ArrowLeft") {
      nextWidth = width + (edge === "right" ? -KEYBOARD_STEP : KEYBOARD_STEP);
    }
    if (event.key === "ArrowRight") {
      nextWidth = width + (edge === "right" ? KEYBOARD_STEP : -KEYBOARD_STEP);
    }

    if (nextWidth === null) return;
    event.preventDefault();
    onResize(nextWidth);
    requestAnimationFrame(onResizeEnd);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels`}
      title="Drag to resize · Double-click to reset"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={finishResize}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={cn(
        "group absolute inset-y-0 z-20 w-3 touch-none cursor-col-resize outline-none",
        edge === "right" ? "-right-1.5" : "-left-1.5",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-primary/35 group-focus-visible:bg-primary/50",
          resizing && "bg-primary/65",
        )}
      />
    </div>
  );
}
