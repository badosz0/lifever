import { ChevronDown, LogIn, LogOut, Settings2 } from "lucide-react";
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
import { SignInDialog } from "@/components/app-shell/sign-in-dialog";
import { authClient } from "@/lib/auth-client";
import { clearDesktopAuthToken } from "@/lib/auth-token";

export function AccountMenu() {
  const { data: session, isPending } = authClient.useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const name = session?.user.name ?? "Local profile";
  const initial = name.charAt(0).toUpperCase();

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
            aria-label="Open account menu"
          >
            <Avatar className="size-6 ring-1 ring-border/70">
              {session?.user.image ? (
                <AvatarImage src={session.user.image} alt="" />
              ) : null}
              <AvatarFallback className="text-[10px]">
                {initial}
              </AvatarFallback>
            </Avatar>
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
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {session ? (
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => setSignInOpen(true)}>
                <LogIn className="size-4" />
                Sign in
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}
