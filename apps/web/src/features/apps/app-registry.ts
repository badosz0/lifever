import {
  CalendarDays,
  Columns3,
  Flag,
  ListTodo,
  StickyNote,
} from "lucide-react";

import { CalendarDetailsDialog } from "@/features/calendar/components/calendar-details-dialog";
import { CalendarInspector } from "@/features/calendar/components/calendar-inspector";
import { CalendarView } from "@/features/calendar/calendar-view";
import { ReminderDetailsDialog } from "@/features/reminders/components/reminder-details-dialog";
import { ReminderInspector } from "@/features/reminders/components/reminder-inspector";
import { RemindersView } from "@/features/reminders/reminders-view";
import { KanbanDetailsDialog } from "@/features/kanban/components/kanban-details-dialog";
import { KanbanInspector } from "@/features/kanban/components/kanban-inspector";
import { KanbanView } from "@/features/kanban/kanban-view";
import { Formula1DetailsDialog } from "@/features/formula1/components/formula1-details-dialog";
import { Formula1Inspector } from "@/features/formula1/components/formula1-inspector";
import { Formula1View } from "@/features/formula1/formula1-view";
import { NoteDetailsDialog } from "@/features/notes/components/note-details-dialog";
import { NoteInspector } from "@/features/notes/components/note-inspector";
import { NotesView } from "@/features/notes/notes-view";

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
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    View: NotesView,
    Inspector: NoteInspector,
    DetailsDialog: NoteDetailsDialog,
    detailsPanel: { defaultWidth: 600, minWidth: 420, maxWidth: 780 },
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
  {
    id: "formula1",
    label: "Formula 1",
    icon: Flag,
    View: Formula1View,
    Inspector: Formula1Inspector,
    DetailsDialog: Formula1DetailsDialog,
    detailsPanel: { defaultWidth: 360, minWidth: 320, maxWidth: 500 },
  },
];

export const lifeverAppsById = Object.fromEntries(
  lifeverApps.map((app) => [app.id, app]),
) as Record<AppId, LifeverAppDefinition>;
