import { CalendarDays } from "lucide-react";

import { defineFeatureApp } from "@/features/apps/model/types";
import { CalendarView } from "@/features/calendar/calendar-view";
import { CalendarDetailsDialog } from "@/features/calendar/components/calendar-details-dialog";
import { CalendarHomeWidget } from "@/features/calendar/components/calendar-home-widget";
import { CalendarInspector } from "@/features/calendar/components/calendar-inspector";
import { CalendarProvider } from "@/features/calendar/model/calendar-provider";

export const calendarApp = defineFeatureApp({
  id: "calendar",
  kind: "feature",
  label: "Calendar",
  icon: CalendarDays,
  defaultEnabled: true,
  defaultOnHome: true,
  Provider: CalendarProvider,
  HomeWidget: CalendarHomeWidget,
  View: CalendarView,
  Inspector: CalendarInspector,
  DetailsDialog: CalendarDetailsDialog,
  detailsPanel: { defaultWidth: 360, minWidth: 320, maxWidth: 500 },
});
