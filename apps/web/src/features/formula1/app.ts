import { Flag } from "lucide-react";

import { defineFeatureApp } from "@/features/apps/model/types";
import { Formula1DetailsDialog } from "@/features/formula1/components/formula1-details-dialog";
import { Formula1CalendarSource } from "@/features/formula1/components/formula1-calendar-source";
import { Formula1HomeWidget } from "@/features/formula1/components/formula1-home-widget";
import { Formula1Inspector } from "@/features/formula1/components/formula1-inspector";
import { Formula1View } from "@/features/formula1/formula1-view";
import { Formula1Provider } from "@/features/formula1/model/formula1-provider";

export const formula1App = defineFeatureApp({
  id: "formula1",
  kind: "feature",
  label: "Formula 1",
  icon: Flag,
  defaultEnabled: false,
  defaultOnHome: false,
  Provider: Formula1Provider,
  HomeWidget: Formula1HomeWidget,
  View: Formula1View,
  Inspector: Formula1Inspector,
  DetailsDialog: Formula1DetailsDialog,
  calendarSource: { Connector: Formula1CalendarSource },
  detailsPanel: { defaultWidth: 360, minWidth: 320, maxWidth: 500 },
});
