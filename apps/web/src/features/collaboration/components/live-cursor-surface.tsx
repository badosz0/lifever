import { MousePointer2 } from "lucide-react";
import {
  type PointerEvent,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CollaborationCursorPosition,
  CollaborationPeer,
} from "@/features/collaboration/model/types";
import { cn } from "@/lib/cn";

type LiveCursorSurfaceProps = PropsWithChildren<{
  className?: string;
  onCursorChange: (cursor: CollaborationCursorPosition | null) => void;
  peers: CollaborationPeer[];
}>;

const CURSOR_IDLE_MS = 1_200;
const CURSOR_MOVEMENT_THRESHOLD_PX = 2;
const cursorColors = [
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#D97706",
  "#059669",
  "#0891B2",
];

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const cursorColor = (id: string) => {
  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return cursorColors[Math.abs(hash) % cursorColors.length]!;
};

const displayName = (name: string) => name.trim().split(/\s+/u)[0] || "Guest";

export function LiveCursorSurface({
  children,
  className,
  onCursorChange,
  peers,
}: LiveCursorSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | null>(null);
  const localCursorVisible = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ height: 0, width: 0 });
  const remotePeers = useMemo(() => {
    const latestByUser = new Map<string, CollaborationPeer>();
    for (const peer of peers) {
      if (!peer.cursor) continue;
      const current = latestByUser.get(peer.user.id);
      if (
        !current?.cursor ||
        peer.cursor.updatedAt > current.cursor.updatedAt
      ) {
        latestByUser.set(peer.user.id, peer);
      }
    }
    return [...latestByUser.values()];
  }, [peers]);
  const enabled = peers.length > 0;

  const clearIdleTimer = useCallback(() => {
    if (idleTimer.current === null) return;
    window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }, []);

  const hideLocalCursor = useCallback(() => {
    clearIdleTimer();
    lastPointer.current = null;
    if (!localCursorVisible.current) return;
    localCursorVisible.current = false;
    onCursorChange(null);
  }, [clearIdleTimer, onCursorChange]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const measure = () => {
      const rect = surface.getBoundingClientRect();
      setSurfaceSize({ height: rect.height, width: rect.width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled) hideLocalCursor();
  }, [enabled, hideLocalCursor]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("blur", hideLocalCursor);
    return () => window.removeEventListener("blur", hideLocalCursor);
  }, [enabled, hideLocalCursor]);

  useEffect(() => hideLocalCursor, [hideLocalCursor]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType === "touch") return;
    const previous = lastPointer.current;
    if (
      previous &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <
        CURSOR_MOVEMENT_THRESHOLD_PX
    ) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    localCursorVisible.current = true;
    onCursorChange({
      x: clampUnit((event.clientX - rect.left) / rect.width),
      y: clampUnit((event.clientY - rect.top) / rect.height),
    });

    clearIdleTimer();
    idleTimer.current = window.setTimeout(
      hideLocalCursor,
      CURSOR_IDLE_MS,
    );
  };

  return (
    <div
      ref={surfaceRef}
      className={cn("relative", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={hideLocalCursor}
      onPointerCancel={hideLocalCursor}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
        aria-hidden="true"
      >
        {remotePeers.map((peer) => {
          const cursor = peer.cursor!;
          const color = cursorColor(peer.user.id);
          return (
            <div
              key={peer.connectionId}
              className="absolute top-0 left-0 will-change-transform transition-transform duration-100 ease-out motion-reduce:transition-none"
              style={{
                transform: `translate3d(${cursor.x * surfaceSize.width}px, ${cursor.y * surfaceSize.height}px, 0)`,
              }}
            >
              <MousePointer2
                className="size-[15px] drop-shadow-[0_1px_1px_rgb(255_255_255/.8)]"
                fill={color}
                color={color}
                strokeWidth={1.8}
              />
              <span
                className={cn(
                  "absolute rounded-md px-1.5 py-0.5 text-[9px] leading-3 font-semibold whitespace-nowrap text-white shadow-[0_2px_6px_rgb(0_0_0/.16)]",
                  cursor.x > 0.72 ? "right-1" : "left-3",
                  cursor.y > 0.82 ? "bottom-3" : "top-3",
                )}
                style={{ backgroundColor: color }}
              >
                {displayName(peer.user.name)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
