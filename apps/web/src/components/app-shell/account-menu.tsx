import { ChevronDown, LogOut, Settings2 } from "lucide-react";
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
import { authClient } from "@/lib/auth-client";
import { clearDesktopAuthToken } from "@/lib/auth-token";
import { isDemoMode } from "@/lib/demo-mode";

export function AccountMenu() {
  const { data: session, isPending } = authClient.useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const name = session?.user.name ?? (isDemoMode ? "Showcase" : "Lifever");
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
            <span className="relative shrink-0">
              <Avatar className="size-6 ring-1 ring-border/70">
                {session?.user.image ? (
                  <AvatarImage src={session.user.image} alt="" />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initial}
                </AvatarFallback>
              </Avatar>
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
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
