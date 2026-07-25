import type { Note, NotesSort } from "../model/types";

export const noteDisplayTitle = (note: Pick<Note, "title">) =>
  note.title.trim() || "Untitled Note";

export const notePlainText = (markdown: string) =>
  markdown
    .replace(/!\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/(`{1,3})(.*?)\1/g, "$2")
    .replace(/^\s{0,3}(#{1,6}|>|[-+*]|\d+\.)\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const countNoteWords = (markdown: string) => {
  const text = notePlainText(markdown);
  return text ? text.split(/\s+/).length : 0;
};

export const sortNotes = (notes: Note[], sort: NotesSort) =>
  [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    if (sort === "title") {
      return noteDisplayTitle(a).localeCompare(noteDisplayTitle(b), undefined, {
        sensitivity: "base",
      });
    }
    return sort === "created"
      ? b.createdAt.localeCompare(a.createdAt)
      : b.updatedAt.localeCompare(a.updatedAt);
  });

export const noteCategoryFilter = (categoryId: string) =>
  `category:${categoryId}` as const;
