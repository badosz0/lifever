import { House, Settings2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { lifeverFeatureApps } from "@/features/apps/feature-app-registry";
import { useApps } from "@/features/apps/model/apps-provider";

type HomeSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HomeSettingsDialog({
  open,
  onOpenChange,
}: HomeSettingsDialogProps) {
  const {
    isAppEnabled,
    isAppOnHome,
    setAppEnabled,
    setAppOnHome,
  } = useApps();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,calc(100vh-2rem))] max-w-[560px] flex-col overflow-hidden bg-popover p-0">
        <div className="border-b border-border/60 px-5 pt-5 pb-4">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="size-[18px]" />
          </div>
          <DialogTitle>Home settings</DialogTitle>
          <DialogDescription className="mt-1">
            Choose which apps are available and which summaries appear on
            Home.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-2 grid grid-cols-[1fr_64px_64px] items-center px-3 text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            <span>App</span>
            <span className="text-center">Enabled</span>
            <span className="text-center">Home</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            {lifeverFeatureApps.map((app, index) => {
              const Icon = app.icon;
              const enabled = isAppEnabled(app.id);
              return (
                <div
                  key={app.id}
                  className="grid min-h-[58px] grid-cols-[1fr_64px_64px] items-center px-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" strokeWidth={1.9} />
                    </div>
                    <span className="truncate text-[13px] font-semibold">
                      {app.label}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        setAppEnabled(app.id, checked)
                      }
                      aria-label={`${enabled ? "Disable" : "Enable"} ${app.label}`}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={isAppOnHome(app.id)}
                      disabled={!enabled}
                      onCheckedChange={(checked) =>
                        setAppOnHome(app.id, checked)
                      }
                      aria-label={`${isAppOnHome(app.id) ? "Hide" : "Show"} ${app.label} on Home`}
                    />
                  </div>
                  {index < lifeverFeatureApps.length - 1 ? (
                    <div className="col-span-3 ml-11 h-px bg-border/55" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
            <House className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Drag summaries on Home to arrange them. Disabled apps are hidden
              from navigation and Home.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
