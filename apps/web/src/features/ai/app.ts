import { ChartNoAxesCombined } from "lucide-react";

import { AIDetailsDialog } from "@/features/ai/components/ai-details-dialog";
import { AIHomeWidget } from "@/features/ai/components/ai-home-widget";
import { AIInspector } from "@/features/ai/components/ai-inspector";
import { AIView } from "@/features/ai/ai-view";
import { AIProvider } from "@/features/ai/model/ai-provider";
import { defineFeatureApp } from "@/features/apps/model/types";

export const aiApp = defineFeatureApp({
  id: "ai",
  kind: "feature",
  label: "AI",
  icon: ChartNoAxesCombined,
  defaultEnabled: false,
  defaultOnHome: false,
  Provider: AIProvider,
  HomeWidget: AIHomeWidget,
  View: AIView,
  Inspector: AIInspector,
  DetailsDialog: AIDetailsDialog,
  detailsPanel: { defaultWidth: 340, minWidth: 300, maxWidth: 440 },
});
