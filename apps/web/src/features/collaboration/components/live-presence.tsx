import { MousePointer2 } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { CollaborationPeer } from "@/features/collaboration/model/types";
import { cn } from "@/lib/cn";

type LivePresenceProps = {
  className?: string;
  peers: CollaborationPeer[];
  pointer?: boolean;
  size?: "sm" | "xs";
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

export function LivePresence({
  className,
  peers,
  pointer = false,
  size = "sm",
}: LivePresenceProps) {
  const uniquePeers = [
    ...new Map(peers.map((peer) => [peer.user.id, peer])).values(),
  ];
  if (uniquePeers.length === 0) return null;
  const visible = uniquePeers.slice(0, 3);

  return (
    <div
      className={cn("flex items-center -space-x-1.5", className)}
      aria-label={`${uniquePeers.map((peer) => peer.user.name).join(", ")} viewing`}
    >
      {pointer ? (
        <MousePointer2
          className="mr-0.5 size-3 fill-primary text-primary drop-shadow-sm"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      ) : null}
      {visible.map((peer) => (
        <Avatar
          key={peer.user.id}
          className={cn(
            "border-2 border-card bg-card shadow-sm",
            size === "xs" ? "size-4" : "size-5",
          )}
          title={`${peer.user.name} is here`}
        >
          {peer.user.image ? (
            <AvatarImage src={peer.user.image} alt="" />
          ) : null}
          <AvatarFallback
            className={cn(
              "bg-primary text-primary-foreground",
              size === "xs" ? "text-[6px]" : "text-[7px]",
            )}
          >
            {initials(peer.user.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {uniquePeers.length > visible.length ? (
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full border-2 border-card bg-muted font-semibold text-muted-foreground shadow-sm",
            size === "xs" ? "size-4 text-[6px]" : "size-5 text-[7px]",
          )}
          title={`${uniquePeers.length - visible.length} more collaborators`}
        >
          +{uniquePeers.length - visible.length}
        </span>
      ) : null}
    </div>
  );
}
