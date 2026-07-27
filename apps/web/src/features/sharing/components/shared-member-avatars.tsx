import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { SharedResourceMember } from "@/features/sharing/model/types";
import { cn } from "@/lib/cn";

type SharedMemberAvatarsProps = {
  activeUserIds?: ReadonlySet<string>;
  className?: string;
  members: SharedResourceMember[];
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

export function SharedMemberAvatars({
  activeUserIds,
  className,
  members,
}: SharedMemberAvatarsProps) {
  const uniqueMembers = [
    ...new Map(members.map((member) => [member.user.id, member])).values(),
  ];
  if (uniqueMembers.length === 0) return null;
  const visibleMembers = uniqueMembers.slice(0, 3);

  return (
    <div
      className={cn("flex items-center -space-x-1.5", className)}
      aria-label={`Shared with ${uniqueMembers
        .map((member) => member.user.name)
        .join(", ")}`}
    >
      {visibleMembers.map((member) => {
        const active = activeUserIds?.has(member.user.id) === true;
        return (
          <span key={member.user.id} className="relative">
            <Avatar
              className="size-5 border-2 border-background bg-background shadow-sm"
              title={`${member.user.name}${active ? " · viewing now" : ""}`}
            >
              {member.user.image ? (
                <AvatarImage src={member.user.image} alt="" />
              ) : null}
              <AvatarFallback className="bg-muted text-[7px] font-semibold text-muted-foreground">
                {initials(member.user.name)}
              </AvatarFallback>
            </Avatar>
            {active ? (
              <span
                className="absolute right-0 bottom-0 size-1.5 rounded-full border border-background bg-emerald-500"
                aria-hidden="true"
              />
            ) : null}
          </span>
        );
      })}
      {uniqueMembers.length > visibleMembers.length ? (
        <span
          className="relative flex size-5 items-center justify-center rounded-full border-2 border-background bg-muted text-[7px] font-semibold text-muted-foreground shadow-sm"
          title={`${uniqueMembers.length - visibleMembers.length} more members`}
        >
          +{uniqueMembers.length - visibleMembers.length}
        </span>
      ) : null}
    </div>
  );
}
