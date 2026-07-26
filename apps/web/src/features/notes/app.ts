import { StickyNote } from "lucide-react";

import { defineFeatureApp } from "@/features/apps/model/types";
import { NoteDetailsDialog } from "@/features/notes/components/note-details-dialog";
import { NotesHomeWidget } from "@/features/notes/components/notes-home-widget";
import { NoteInspector } from "@/features/notes/components/note-inspector";
import { NotesProvider } from "@/features/notes/model/notes-provider";
import { NotesView } from "@/features/notes/notes-view";

export const notesApp = defineFeatureApp({
  id: "notes",
  kind: "feature",
  label: "Notes",
  icon: StickyNote,
  defaultEnabled: true,
  defaultOnHome: true,
  Provider: NotesProvider,
  HomeWidget: NotesHomeWidget,
  View: NotesView,
  Inspector: NoteInspector,
  DetailsDialog: NoteDetailsDialog,
  detailsPanel: { defaultWidth: 600, minWidth: 420, maxWidth: 780 },
});
