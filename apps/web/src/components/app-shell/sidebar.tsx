import { AccountMenu } from "@/components/app-shell/account-menu";
import { homeApp } from "@/features/apps/app-registry";
import { useApps } from "@/features/apps/model/apps-provider";
import { ReleaseUpdateNotice } from "@/features/updates/components/release-update-notice";
import { cn } from "@/lib/cn";

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const { activeApp, enabledApps, setActiveApp } = useApps();
  const HomeIcon = homeApp.icon;

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-sidebar px-2 pb-2 text-sidebar-foreground">
      <nav className="pt-3" aria-label="Home">
        <button
          type="button"
          onClick={() => {
            setActiveApp(homeApp.id);
            onNavigate?.();
          }}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium text-sidebar-foreground outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-sidebar-accent/65 active:scale-[.985] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-colors motion-reduce:active:scale-100",
            activeApp === homeApp.id &&
              "bg-sidebar-accent/85 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.035)] hover:bg-sidebar-accent dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.045)]",
          )}
          aria-current={activeApp === homeApp.id ? "page" : undefined}
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center text-muted-foreground",
              activeApp === homeApp.id && "text-sidebar-primary",
            )}
          >
            <HomeIcon className="size-[17px]" strokeWidth={1.9} />
          </span>
          <span className="truncate">{homeApp.label}</span>
        </button>
      </nav>

      <div className="px-2 pt-3 pb-1.5">
        <p className="text-[10px] font-semibold tracking-[0.065em] text-muted-foreground/75 uppercase">
          Apps
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5" aria-label="Lifever apps">
        {enabledApps.map((app) => {
          const selected = activeApp === app.id;
          const Icon = app.icon;

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                setActiveApp(app.id);
                onNavigate?.();
              }}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium text-sidebar-foreground outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-sidebar-accent/65 active:scale-[.985] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-colors motion-reduce:active:scale-100",
                selected &&
                  "bg-sidebar-accent/85 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.035)] hover:bg-sidebar-accent dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.045)]",
              )}
              aria-current={selected ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center text-muted-foreground",
                  selected && "text-sidebar-primary",
                )}
              >
                <Icon className="size-[17px]" strokeWidth={1.9} />
              </span>
              <span className="truncate">{app.label}</span>
            </button>
          );
        })}
      </nav>

      <ReleaseUpdateNotice />

      <div className="mt-1 border-t border-border/55 pt-2">
        <AccountMenu />
      </div>
    </div>
  );
}
