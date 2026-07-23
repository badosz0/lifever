import { ChevronDown, LogIn, LogOut, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { authClient } from "@/lib/auth-client";

export function AccountMenu() {
  const { data: session } = authClient.useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const name = session?.user.name ?? "Local profile";
  const initial = name.charAt(0).toUpperCase();

  const signIn = async () => {
    const result = await authClient.signIn.social({
      provider: "discord",
      callbackURL: window.location.href,
    });

    if (result.error) {
      toast.error("Discord sign-in is not configured yet", {
        description: "Add the Discord credentials from .env.example, then restart the API.",
      });
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    toast.success("Signed out");
  };

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
          <DropdownMenuLabel className="truncate">
            {session?.user.email ?? "Stored on this device"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
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
              <DropdownMenuItem onSelect={() => void signIn()}>
                <LogIn className="size-4" />
                Continue with Discord
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
