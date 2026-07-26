import { LogOut, MailPlus, Share2, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHARING_CHANGED_EVENT,
  type SharePermission,
  type SharedPerson,
  type SharedResourceAccess,
  type SharedResourceType,
} from "@/features/sharing/model/types";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

type ShareMember = {
  id: string;
  role: "owner" | "collaborator";
  permission: SharePermission;
  user: SharedPerson;
};

type PendingInvite = {
  id: string;
  email: string;
  permission: SharePermission;
};

type ResourceSharingPayload = {
  resource: {
    id: string;
    name: string;
    access: SharedResourceAccess;
  };
  members: ShareMember[];
  invites: PendingInvite[];
};

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: SharedResourceType;
  resourceId: string;
  resourceName: string;
  onLeft?: () => void;
};

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
  onLeft,
}: ShareDialogProps) {
  const { data: session } = authClient.useSession();
  const [payload, setPayload] = useState<ResourceSharingPayload | null>(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<SharePermission>("write");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const load = useCallback(async () => {
    if (!session || !open) return;
    setIsLoading(true);
    try {
      const response = await apiRequest<ResourceSharingPayload>(
        `/api/sharing/resources/${resourceType}/${encodeURIComponent(resourceId)}`,
      );
      setPayload(response);
    } catch (error) {
      toast.error("Sharing could not load", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [open, resourceId, resourceType, session]);

  useEffect(() => {
    if (!open) {
      setPayload(null);
      setEmail("");
      setPermission("write");
      return;
    }
    void load();
  }, [load, open]);

  const invite = async () => {
    if (!email.trim()) return;
    setIsSending(true);
    try {
      const response = await apiRequest<{ alreadyMember?: boolean }>(
        "/api/sharing/invites",
        {
          method: "POST",
          body: JSON.stringify({
            resourceType,
            resourceId,
            email,
            permission,
          }),
        },
      );
      toast.success(
        response.alreadyMember ? "Access updated" : "Invitation sent",
      );
      setEmail("");
      await load();
    } catch (error) {
      toast.error("Couldn’t send invitation", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const updatePermission = async (
    shareId: string,
    nextPermission: SharePermission,
  ) => {
    setPayload((current) =>
      current
        ? {
            ...current,
            members: current.members.map((member) =>
              member.id === shareId
                ? { ...member, permission: nextPermission }
                : member,
            ),
          }
        : current,
    );
    try {
      await apiRequest(`/api/sharing/shares/${shareId}`, {
        method: "PATCH",
        body: JSON.stringify({ permission: nextPermission }),
      });
      window.dispatchEvent(new CustomEvent(SHARING_CHANGED_EVENT));
    } catch (error) {
      toast.error("Access could not be updated", {
        description: error instanceof Error ? error.message : "Try again.",
      });
      await load();
    }
  };

  const removeMember = async (shareId: string) => {
    try {
      await apiRequest(`/api/sharing/shares/${shareId}`, { method: "DELETE" });
      await load();
      window.dispatchEvent(new CustomEvent(SHARING_CHANGED_EVENT));
    } catch (error) {
      toast.error("Collaborator could not be removed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      await apiRequest(`/api/sharing/invites/${inviteId}`, {
        method: "DELETE",
      });
      await load();
    } catch (error) {
      toast.error("Invitation could not be cancelled", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };

  const leave = async () => {
    const shareId = payload?.resource.access.shareId;
    if (!shareId) return;
    try {
      await apiRequest(`/api/sharing/shares/${shareId}`, { method: "DELETE" });
      onOpenChange(false);
      onLeft?.();
      window.dispatchEvent(new CustomEvent(SHARING_CHANGED_EVENT));
      toast.success(`Left “${resourceName}”`);
    } catch (error) {
      toast.error("Couldn’t leave this shared item", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };

  const isOwner = payload?.resource.access.role === "owner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] p-0">
        <div className="px-5 pt-5 pb-4">
          <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Share2 className="size-[17px]" />
          </div>
          <DialogTitle>Share “{resourceName}”</DialogTitle>
          <DialogDescription className="mt-1">
            Invite people to view or edit this item with you.
          </DialogDescription>
        </div>

        {!session ? (
          <div className="border-y border-border/65 px-5 py-8 text-center">
            <p className="text-[13px] font-medium">Sign in to share</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Collaboration is available for synced account data.
            </p>
          </div>
        ) : (
          <div className="max-h-[min(58vh,480px)] overflow-y-auto border-y border-border/65 px-5 py-4">
            {isOwner ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void invite();
                }}
              >
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  aria-label="Collaborator email"
                  className="min-w-0 flex-1"
                />
                <Select
                  value={permission}
                  onValueChange={(value) =>
                    setPermission(value as SharePermission)
                  }
                >
                  <SelectTrigger className="w-[112px]" aria-label="Access">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="write">Can edit</SelectItem>
                    <SelectItem value="read">Can view</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!email.trim() || isSending}
                  aria-label="Send invitation"
                >
                  <MailPlus className="size-4" />
                </Button>
              </form>
            ) : null}

            <h3
              className={
                isOwner
                  ? "mt-5 text-[11px] font-semibold text-muted-foreground"
                  : "text-[11px] font-semibold text-muted-foreground"
              }
            >
              PEOPLE WITH ACCESS
            </h3>
            <div className="mt-1">
              {payload?.members.map((member) => (
                <div
                  key={member.id}
                  className="flex min-h-12 items-center gap-2.5 border-b border-border/55 py-2 last:border-b-0"
                >
                  <Avatar className="size-7">
                    {member.user.image ? (
                      <AvatarImage src={member.user.image} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[9px]">
                      {member.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">
                      {member.user.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  {member.role === "owner" ? (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Owner
                    </span>
                  ) : isOwner ? (
                    <>
                      <Select
                        value={member.permission}
                        onValueChange={(value) =>
                          void updatePermission(
                            member.id,
                            value as SharePermission,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-[92px] border-0 bg-muted px-2 text-[10px] shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="write">Can edit</SelectItem>
                          <SelectItem value="read">Can view</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => void removeMember(member.id)}
                        aria-label={`Remove ${member.user.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {member.permission === "write" ? "Can edit" : "Can view"}
                    </span>
                  )}
                </div>
              ))}
              {!payload && isLoading ? (
                <div className="flex h-20 items-center justify-center text-[11px] text-muted-foreground">
                  Loading access…
                </div>
              ) : null}
            </div>

            {isOwner && payload && payload.invites.length > 0 ? (
              <>
                <h3 className="mt-5 text-[11px] font-semibold text-muted-foreground">
                  PENDING
                </h3>
                <div className="mt-1">
                  {payload.invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex min-h-10 items-center gap-2 border-b border-border/55 py-1.5 last:border-b-0"
                    >
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserRound className="size-3.5" />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-[11px]">
                        {invite.email}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {invite.permission === "write"
                          ? "Can edit"
                          : "Can view"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground"
                        onClick={() => void cancelInvite(invite.id)}
                        aria-label={`Cancel invitation for ${invite.email}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3">
          {payload?.resource.access.role === "collaborator" ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void leave()}
            >
              <LogOut className="size-4" />
              Leave
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
