import { Blocks, House, LayoutGrid } from "lucide-react";

import {
  SettingsGroup,
  SettingsModal,
  SettingsSection,
  type SettingsDialogProps,
} from "@/components/settings/settings-modal";
import { Switch } from "@/components/ui/switch";
import { lifeverFeatureApps } from "@/features/apps/feature-app-registry";
import { useApps } from "@/features/apps/model/apps-provider";

const descriptions: Record<string, string> = {
  reminders: "Tasks, lists, and timely reminders",
  calendar: "Your schedule and connected calendars",
  notes: "Notes, collections, and Markdown writing",
  kanban: "Projects, cards, and custom workflows",
  formula1: "Race weekends and championship standings",
};

export function HomeSettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const { isAppEnabled, isAppOnHome, setAppEnabled, setAppOnHome } = useApps();
  const rows = (home: boolean) => (
    <SettingsGroup>
      {lifeverFeatureApps.map((app) => {
        const Icon = app.icon;
        const enabled = isAppEnabled(app.id);
        const id = `home-settings-${home ? "widget" : "app"}-${app.id}`;
        return (
          <div
            key={app.id}
            className="flex min-h-[84px] items-center gap-4 px-4 py-4 sm:px-5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Icon className="size-[18px]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor={id} className="text-sm font-medium">
                {app.label}
              </label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {home && !enabled
                  ? "Enable this app to show its summary on Home."
                  : descriptions[app.id]}
              </p>
            </div>
            <Switch
              id={id}
              aria-label={
                home ? `Show ${app.label} on Home` : `Enable ${app.label}`
              }
              checked={home ? isAppOnHome(app.id) : enabled}
              disabled={home && !enabled}
              onCheckedChange={(checked) =>
                home
                  ? setAppOnHome(app.id, checked)
                  : setAppEnabled(app.id, checked)
              }
            />
          </div>
        );
      })}
    </SettingsGroup>
  );

  return (
    <SettingsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Home settings"
      description="Choose your apps and shape your overview."
      icon={House}
      pages={[
        {
          id: "apps",
          label: "Apps",
          icon: LayoutGrid,
          description:
            "Choose which apps appear in navigation. Disabling an app keeps its data.",
          content: (
            <SettingsSection title="Available apps">
              {rows(false)}
            </SettingsSection>
          ),
        },
        {
          id: "widgets",
          label: "Home summaries",
          icon: Blocks,
          description:
            "Bring the things that matter into your overview. Drag summaries on Home to arrange them.",
          content: (
            <SettingsSection title="Show on Home">{rows(true)}</SettingsSection>
          ),
        },
      ]}
    />
  );
}
