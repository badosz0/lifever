export type Note = {
  id: string;
  title: string;
  body: string;
  categoryId: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NoteCategory = {
  id: string;
  name: string;
  color: string;
};

export type NotesFilter = "all" | "pinned" | `category:${string}`;
export type NotesSort = "updated" | "created" | "title";
export type NotePreviewLines = 1 | 2 | 3;

export type NotesSettings = {
  sort: NotesSort;
  previewLines: NotePreviewLines;
  defaultCategoryId: string;
  openInPreview: boolean;
  spellcheck: boolean;
};
