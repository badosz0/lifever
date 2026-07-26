import { Columns3 } from "lucide-react";

import { defineFeatureApp } from "@/features/apps/model/types";
import { KanbanDetailsDialog } from "@/features/kanban/components/kanban-details-dialog";
import { KanbanHomeWidget } from "@/features/kanban/components/kanban-home-widget";
import { KanbanInspector } from "@/features/kanban/components/kanban-inspector";
import { KanbanView } from "@/features/kanban/kanban-view";
import { KanbanProvider } from "@/features/kanban/model/kanban-provider";

export const kanbanApp = defineFeatureApp({
  id: "kanban",
  kind: "feature",
  label: "Kanban",
  icon: Columns3,
  defaultEnabled: true,
  defaultOnHome: true,
  Provider: KanbanProvider,
  HomeWidget: KanbanHomeWidget,
  View: KanbanView,
  Inspector: KanbanInspector,
  DetailsDialog: KanbanDetailsDialog,
  detailsPanel: { defaultWidth: 360, minWidth: 320, maxWidth: 500 },
});
