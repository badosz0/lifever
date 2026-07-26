import { Menu, PanelLeft } from "lucide-react";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { cn } from "@/lib/cn";

type AppHeaderProps = PropsWithChildren<{
  elevated?: boolean;
  className?: string;
}>;

type AppHeaderToolbarProps = PropsWithChildren<{
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
  className?: string;
}>;

export function AppHeader({
  children,
  elevated = false,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "scroll-edge relative z-30 shrink-0 bg-background/88 px-4 pt-3 pb-3 backdrop-blur-xl sm:px-6 sm:pt-5 sm:pb-4",
        elevated && "z-40",
        className,
      )}
    >
      {children}
    </header>
  );
}

export function AppHeaderToolbar({
  children,
  onOpenMobileSidebar,
  onToggleSidebar,
  className,
}: AppHeaderToolbarProps) {
  return (
    <div className={cn("flex min-h-9 items-center gap-1.5", className)}>
      <ShortcutTooltip label="Toggle Sidebar" shortcut={["⌘", "\\"]}>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden text-muted-foreground md:inline-flex"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-4" />
        </Button>
      </ShortcutTooltip>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground md:hidden"
        onClick={onOpenMobileSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="size-4" />
      </Button>
      {children}
    </div>
  );
}
