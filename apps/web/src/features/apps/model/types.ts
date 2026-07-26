import type { ComponentType, PropsWithChildren } from "react";
import type { LucideIcon } from "lucide-react";

export type FeatureAppId = string;
export type AppId = "home" | FeatureAppId;

export type AppViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

type BaseAppDefinition = {
  label: string;
  icon: LucideIcon;
  View: ComponentType<AppViewProps>;
};

export type HomeAppDefinition = BaseAppDefinition & {
  id: "home";
  kind: "home";
};

export type FeatureAppDefinition = BaseAppDefinition & {
  id: FeatureAppId;
  kind: "feature";
  defaultEnabled: boolean;
  defaultOnHome: boolean;
  Provider: ComponentType<PropsWithChildren>;
  HomeWidget: ComponentType;
  Inspector: ComponentType<{ className?: string }>;
  DetailsDialog: ComponentType;
  calendarSource?: {
    Connector: ComponentType;
  };
  detailsPanel: {
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
  };
};

export type LifeverAppDefinition =
  | HomeAppDefinition
  | FeatureAppDefinition;

export const defineFeatureApp = <T extends FeatureAppDefinition>(
  definition: T,
) => definition;
