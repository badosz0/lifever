import type { Note, NoteCategory, NotesSettings } from "./types";

export const initialNoteCategories: NoteCategory[] = [
  { id: "personal", name: "Personal", color: "#f59e0b" },
  { id: "work", name: "Work", color: "#3b82f6" },
  { id: "ideas", name: "Ideas", color: "#8b5cf6" },
];

export const initialNotes: Note[] = [
  {
    id: "note-weekend",
    title: "Weekend ideas",
    body: `## Saturday

- Morning coffee somewhere new
- Walk by the river
- Pick up fresh bread

## Sunday

Keep it slow. Read for an hour and plan the week before dinner.`,
    categoryId: "personal",
    pinned: true,
    createdAt: "2026-07-20T08:12:00.000Z",
    updatedAt: "2026-07-23T18:42:00.000Z",
  },
  {
    id: "note-launch",
    title: "Launch checklist",
    body: `# Lifever launch

- [x] Calendar polish
- [x] Kanban projects
- [ ] Notes keyboard shortcuts
- [ ] Final accessibility pass

> Small, dependable details make the whole product feel calm.`,
    categoryId: "work",
    pinned: true,
    createdAt: "2026-07-18T12:30:00.000Z",
    updatedAt: "2026-07-22T15:05:00.000Z",
  },
  {
    id: "note-reading",
    title: "Reading list",
    body: `### Next up

1. *The Creative Act*
2. *A Philosophy of Software Design*
3. *Tomorrow, and Tomorrow, and Tomorrow*

Add thoughts here while reading.`,
    categoryId: "personal",
    pinned: false,
    createdAt: "2026-07-16T20:10:00.000Z",
    updatedAt: "2026-07-21T19:25:00.000Z",
  },
  {
    id: "note-capture",
    title: "A quieter capture flow",
    body: `The best capture UI should disappear.

**Idea:** one shortcut opens a clean note, focus starts in the title, and the second line is already the body. No modal and no setup.`,
    categoryId: "ideas",
    pinned: false,
    createdAt: "2026-07-15T07:18:00.000Z",
    updatedAt: "2026-07-19T09:14:00.000Z",
  },
];

export const initialNotesSettings: NotesSettings = {
  sort: "updated",
  previewLines: 2,
  defaultCategoryId: "personal",
  openInPreview: false,
  spellcheck: true,
};
