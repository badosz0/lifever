import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type AppId = "reminders" | "calendar" | "kanban";

export type AppViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

export type LifeverAppDefinition = {
  id: AppId;
  label: string;
  icon: LucideIcon;
  View: ComponentType<AppViewProps>;
  Inspector: ComponentType<{ className?: string }>;
  DetailsDialog: ComponentType;
  detailsPanel: {
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
  };
};
