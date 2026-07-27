import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CollaborationPeer,
  CollaborationResourceMessage,
  CollaborationRoom,
} from "@/features/collaboration/model/types";
import type { SharedResourceType } from "@/features/sharing/model/types";
import { ApiRequestError, apiRequest, apiUrl } from "@/lib/api";

type LiveCollaborationOptions = {
  currentUserId?: string;
  enabled: boolean;
  onAccessChanged?: () => void;
  onResourceChange: (message: CollaborationResourceMessage) => void;
  rooms: CollaborationRoom[];
};

type ManagedSocket = {
  roomKey: string;
  socket: WebSocket;
};

const roomKey = (resourceType: SharedResourceType, resourceId: string) =>
  `${resourceType}:${resourceId}`;

const socketUrl = (ticket: string) => {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/collaboration/socket";
  url.search = "";
  url.searchParams.set("ticket", ticket);
  return url.toString();
};

const reconnectDelay = (attempt: number) => {
  const base = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
  return base + Math.round(Math.random() * Math.min(1_000, base * 0.2));
};

export const useLiveCollaboration = ({
  currentUserId,
  enabled,
  onAccessChanged,
  onResourceChange,
  rooms,
}: LiveCollaborationOptions) => {
  const [pageVisible, setPageVisible] = useState(
    () => document.visibilityState === "visible",
  );
  const [peersByRoom, setPeersByRoom] = useState<
    Record<string, CollaborationPeer[]>
  >({});
  const sockets = useRef(new Map<string, ManagedSocket>());
  const roomConfigurations = useRef(new Map<string, CollaborationRoom>());
  const onResourceChangeRef = useRef(onResourceChange);
  const onAccessChangedRef = useRef(onAccessChanged);
  onResourceChangeRef.current = onResourceChange;
  onAccessChangedRef.current = onAccessChanged;
  roomConfigurations.current = new Map(
    rooms.map((room) => [
      roomKey(room.resourceType, room.resourceId),
      room,
    ]),
  );

  const roomKeys = useMemo(
    () =>
      rooms
        .map((room) => roomKey(room.resourceType, room.resourceId))
        .sort()
        .join("|"),
    [rooms],
  );
  const focusSignature = useMemo(
    () =>
      rooms
        .map(
          (room) =>
            `${roomKey(room.resourceType, room.resourceId)}:${JSON.stringify(room.focus)}`,
        )
        .sort()
        .join("|"),
    [rooms],
  );

  useEffect(() => {
    const handleVisibility = () =>
      setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    let disposed = false;
    const retryTimers = new Set<number>();
    const desiredRooms =
      enabled && pageVisible
        ? [...roomConfigurations.current.values()]
        : [];

    const connect = async (room: CollaborationRoom, attempt = 0) => {
      const key = roomKey(room.resourceType, room.resourceId);
      if (disposed || sockets.current.has(key)) return;

      try {
        const { ticket } = await apiRequest<{ ticket: string }>(
          "/api/collaboration/tickets",
          {
            method: "POST",
            body: JSON.stringify({
              resourceType: room.resourceType,
              resourceId: room.resourceId,
            }),
          },
        );
        if (disposed || !roomConfigurations.current.has(key)) return;

        const socket = new WebSocket(socketUrl(ticket));
        sockets.current.set(key, { roomKey: key, socket });
        socket.addEventListener("open", () => {
          const currentRoom = roomConfigurations.current.get(key);
          if (!currentRoom) {
            socket.close(1000, "Room is no longer visible");
            return;
          }
          socket.send(
            JSON.stringify({
              type: "presence.update",
              focus: currentRoom.focus,
            }),
          );
        });
        socket.addEventListener("message", (event) => {
          if (typeof event.data !== "string") return;
          let message: {
            type?: string;
            peers?: CollaborationPeer[];
          };
          try {
            message = JSON.parse(event.data) as typeof message;
          } catch {
            return;
          }
          if (
            message.type === "presence.snapshot" &&
            Array.isArray(message.peers)
          ) {
            setPeersByRoom((current) => {
              const peers = message.peers!
                .filter((peer) => peer.user.id !== currentUserId);
              return { ...current, [key]: peers };
            });
            return;
          }
          if (message.type === "resource.changed") {
            onResourceChangeRef.current(
              message as CollaborationResourceMessage,
            );
            return;
          }
          if (message.type === "access.revoked") {
            onAccessChangedRef.current?.();
          }
        });
        socket.addEventListener("close", (event) => {
          const managed = sockets.current.get(key);
          if (managed?.socket === socket) sockets.current.delete(key);
          setPeersByRoom((current) => {
            if (!(key in current)) return current;
            const next = { ...current };
            delete next[key];
            return next;
          });
          if (
            disposed ||
            event.code === 1000 ||
            !roomConfigurations.current.has(key)
          ) {
            return;
          }
          const timer = window.setTimeout(() => {
            retryTimers.delete(timer);
            const currentRoom = roomConfigurations.current.get(key);
            if (currentRoom) void connect(currentRoom, attempt + 1);
          }, reconnectDelay(attempt));
          retryTimers.add(timer);
        });
      } catch (error) {
        if (
          disposed ||
          (error instanceof ApiRequestError &&
            (error.status === 401 ||
              error.status === 404 ||
              error.status === 503))
        ) {
          return;
        }
        const timer = window.setTimeout(() => {
          retryTimers.delete(timer);
          const currentRoom = roomConfigurations.current.get(key);
          if (currentRoom) void connect(currentRoom, attempt + 1);
        }, reconnectDelay(attempt));
        retryTimers.add(timer);
      }
    };

    for (const room of desiredRooms) void connect(room);

    return () => {
      disposed = true;
      for (const timer of retryTimers) window.clearTimeout(timer);
      retryTimers.clear();
      for (const managed of sockets.current.values()) {
        managed.socket.close(1000, "Room is no longer visible");
      }
      sockets.current.clear();
      setPeersByRoom({});
    };
  }, [currentUserId, enabled, pageVisible, roomKeys]);

  useEffect(() => {
    for (const [key, managed] of sockets.current) {
      if (managed.socket.readyState !== WebSocket.OPEN) continue;
      const room = roomConfigurations.current.get(key);
      if (!room) continue;
      managed.socket.send(
        JSON.stringify({ type: "presence.update", focus: room.focus }),
      );
    }
  }, [focusSignature]);

  return { peersByRoom };
};

export const collaborationRoomKey = roomKey;
