import { Bell, ChevronDown, LogIn, LogOut, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { InvitationsDialog } from "@/features/sharing/components/invitations-dialog";
import { useSharing } from "@/features/sharing/model/sharing-provider";
import { authClient, signInWithDiscord } from "@/lib/auth-client";
import { clearDesktopAuthToken } from "@/lib/auth-token";

export function AccountMenu() {
  const { data: session, isPending } = authClient.useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const { invites } = useSharing();
  const name = session?.user.name ?? "Local profile";
  const initial = name.charAt(0).toUpperCase();

  const signIn = async () => {
    const result = await signInWithDiscord();

    if (result.error) {
      toast.error("Couldn’t sign in with Discord", {
        description: result.error.message,
      });
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    clearDesktopAuthToken();
    toast.success("Signed out");
  };

  if (isPending) {
    return <div className="h-9" aria-hidden="true" />;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="group flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left outline-none transition-colors duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-sidebar-accent/75 active:bg-sidebar-accent data-[state=open]:bg-sidebar-accent/75 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            aria-label={
              invites.length > 0
                ? `Open account menu, ${invites.length} pending ${
                    invites.length === 1 ? "invitation" : "invitations"
                  }`
                : "Open account menu"
            }
          >
            <span className="relative shrink-0">
              <Avatar className="size-6 ring-1 ring-border/70">
                {session?.user.image ? (
                  <AvatarImage src={session.user.image} alt="" />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initial}
                </AvatarFallback>
              </Avatar>
              {invites.length > 0 ? (
                <span
                  className="absolute -top-1.5 -right-1.5 flex min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[8px] leading-3.5 font-bold text-destructive-foreground ring-2 ring-sidebar"
                  aria-hidden="true"
                >
                  {invites.length > 9 ? "9+" : invites.length}
                </span>
              ) : null}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {name}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/65 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          sideOffset={6}
          align="start"
          className="w-56"
        >
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" />
            Settings
          </DropdownMenuItem>
          {session ? (
            <DropdownMenuItem onSelect={() => setInvitationsOpen(true)}>
              <Bell className="size-4" />
              <span className="flex-1">Invitations</span>
              {invites.length > 0 ? (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  {invites.length}
                </span>
              ) : null}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {session ? (
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => void signIn()}>
                <LogIn className="size-4" />
                Continue with Discord
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <InvitationsDialog
        open={invitationsOpen}
        onOpenChange={setInvitationsOpen}
      />
    </>
  );
}
