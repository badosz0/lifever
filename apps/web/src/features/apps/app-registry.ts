import { CalendarDays, Columns3, ListTodo } from "lucide-react";

import { CalendarDetailsDialog } from "@/features/calendar/components/calendar-details-dialog";
import { CalendarInspector } from "@/features/calendar/components/calendar-inspector";
import { CalendarView } from "@/features/calendar/calendar-view";
import { ReminderDetailsDialog } from "@/features/reminders/components/reminder-details-dialog";
import { ReminderInspector } from "@/features/reminders/components/reminder-inspector";
import { RemindersView } from "@/features/reminders/reminders-view";
import { KanbanDetailsDialog } from "@/features/kanban/components/kanban-details-dialog";
import { KanbanInspector } from "@/features/kanban/components/kanban-inspector";
import { KanbanView } from "@/features/kanban/kanban-view";

import type { AppId, LifeverAppDefinition } from "./model/types";

export const lifeverApps: LifeverAppDefinition[] = [
  {
    id: "reminders",
    label: "Reminders",
    icon: ListTodo,
    View: RemindersView,
    Inspector: ReminderInspector,
    DetailsDialog: ReminderDetailsDialog,
    detailsPanel: { defaultWidth: 340, minWidth: 280, maxWidth: 480 },
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    View: CalendarView,
    Inspector: CalendarInspector,
    DetailsDialog: CalendarDetailsDialog,
    detailsPanel: { defaultWidth: 360, minWidth: 320, maxWidth: 500 },
  },
  {
    id: "kanban",
    label: "Kanban",
    icon: Columns3,
    View: KanbanView,
    Inspector: KanbanInspector,
    DetailsDialog: KanbanDetailsDialog,
    detailsPanel: { defaultWidth: 360, minWidth: 320, maxWidth: 500 },
  },
];

export const lifeverAppsById = Object.fromEntries(
  lifeverApps.map((app) => [app.id, app]),
) as Record<AppId, LifeverAppDefinition>;
