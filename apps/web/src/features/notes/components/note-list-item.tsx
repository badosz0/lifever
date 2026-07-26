import { Pin } from "lucide-react";

import {
  noteDisplayTitle,
  notePlainText,
} from "@/features/notes/lib/notes";
import type { Note, NoteCategory, NotePreviewLines } from "@/features/notes/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { formatUserDate, formatUserTime } from "@/lib/date-time-format";
import { cn } from "@/lib/cn";

type NoteListItemProps = {
  note: Note;
  category: NoteCategory;
  previewLines: NotePreviewLines;
  selected: boolean;
  onSelect: () => void;
};

export function NoteListItem({
  note,
  category,
  previewLines,
  selected,
  onSelect,
}: NoteListItemProps) {
  const { dateFormat, timeFormat } = useUserPreferences();
  const updated = new Date(note.updatedAt);
  const today = new Date();
  const sameDay =
    updated.getFullYear() === today.getFullYear() &&
    updated.getMonth() === today.getMonth() &&
    updated.getDate() === today.getDate();
  const preview = notePlainText(note.body) || "No additional text";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full px-3 py-3.5 text-left outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] active:scale-[.992] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-colors motion-reduce:active:scale-100",
        !selected && "hover:bg-muted/45",
      )}
      style={
        selected
          ? {
              backgroundColor: `color-mix(in srgb, ${category.color} 9%, transparent)`,
            }
          : undefined
      }
      aria-current={selected ? "true" : undefined}
    >
      <div className="flex min-w-0 items-start gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[14px] leading-5 font-semibold tracking-[-0.01em]">
          {noteDisplayTitle(note)}
        </h2>
        {note.pinned ? (
          <Pin
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
            fill="currentColor"
            aria-label="Pinned"
          />
        ) : null}
      </div>
      <p
        className="mt-1 overflow-hidden text-[12px] leading-[18px] text-muted-foreground"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: previewLines,
        }}
      >
        {preview}
      </p>
      <div className="mt-2.5 flex min-w-0 items-center gap-1.5">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground">
          {category.name}
        </span>
        <time
          dateTime={note.updatedAt}
          className="shrink-0 text-[10px] tabular-nums text-muted-foreground/80"
        >
          {sameDay
            ? formatUserTime(updated, timeFormat)
            : formatUserDate(updated, dateFormat, {
                includeYear: updated.getFullYear() !== today.getFullYear(),
                length: "long",
              })}
        </time>
      </div>
    </button>
  );
}
