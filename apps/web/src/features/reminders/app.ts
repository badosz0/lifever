import { ListTodo } from "lucide-react";

import { defineFeatureApp } from "@/features/apps/model/types";
import { ReminderDetailsDialog } from "@/features/reminders/components/reminder-details-dialog";
import { RemindersHomeWidget } from "@/features/reminders/components/reminders-home-widget";
import { ReminderInspector } from "@/features/reminders/components/reminder-inspector";
import { RemindersProvider } from "@/features/reminders/model/reminders-provider";
import { RemindersView } from "@/features/reminders/reminders-view";

export const remindersApp = defineFeatureApp({
  id: "reminders",
  kind: "feature",
  label: "Reminders",
  icon: ListTodo,
  defaultEnabled: true,
  defaultOnHome: true,
  Provider: RemindersProvider,
  HomeWidget: RemindersHomeWidget,
  View: RemindersView,
  Inspector: ReminderInspector,
  DetailsDialog: ReminderDetailsDialog,
  detailsPanel: { defaultWidth: 340, minWidth: 280, maxWidth: 480 },
});
