import {
  CalendarDays,
  Check,
  FileText,
  LayoutDashboard,
  Mail,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSharing } from "@/features/sharing/model/sharing-provider";
import type { SharedResourceType } from "@/features/sharing/model/types";

const resourceIcon = {
  note: FileText,
  kanbanProject: LayoutDashboard,
  calendar: CalendarDays,
} satisfies Record<SharedResourceType, typeof FileText>;

type InvitationsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InvitationsDialog({
  open,
  onOpenChange,
}: InvitationsDialogProps) {
  const { invites, isLoading, respondToInvite } = useSharing();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const respond = async (id: string, response: "accept" | "reject") => {
    setRespondingId(id);
    try {
      await respondToInvite(id, response);
      toast.success(
        response === "accept"
          ? "Invitation accepted"
          : "Invitation declined",
      );
    } catch (error) {
      toast.error("Couldn’t update invitation", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] p-0">
        <div className="px-5 pt-5 pb-4">
          <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="size-[17px]" />
          </div>
          <DialogTitle>Invitations</DialogTitle>
          <DialogDescription className="mt-1">
            Notes, projects, and calendars shared with you.
          </DialogDescription>
        </div>

        <div className="max-h-[min(56vh,440px)] min-h-28 overflow-y-auto border-y border-border/65 px-5 py-2">
          {invites.length > 0 ? (
            invites.map((invite) => {
              const Icon = resourceIcon[invite.resourceType];
              return (
                <div
                  key={invite.id}
                  className="flex min-h-16 items-center gap-3 border-b border-border/55 py-2.5 last:border-b-0"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {invite.resourceName}
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <Avatar className="size-4">
                        {invite.owner.image ? (
                          <AvatarImage src={invite.owner.image} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[7px]">
                          {invite.owner.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {invite.owner.name} ·{" "}
                        {invite.permission === "write"
                          ? "Can edit"
                          : "View only"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 text-muted-foreground"
                      disabled={respondingId === invite.id}
                      onClick={() => void respond(invite.id, "reject")}
                      aria-label={`Decline ${invite.resourceName}`}
                    >
                      <X className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-2.5 text-[11px]"
                      disabled={respondingId === invite.id}
                      onClick={() => void respond(invite.id, "accept")}
                    >
                      <Check className="size-3.5" />
                      Accept
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex min-h-28 items-center justify-center text-center">
              <div>
                <p className="text-[13px] font-medium">
                  {isLoading ? "Checking invitations…" : "You’re all caught up"}
                </p>
                {!isLoading ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    New invitations will appear here.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-3">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
