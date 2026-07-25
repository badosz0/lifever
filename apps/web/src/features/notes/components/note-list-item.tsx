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
        "group w-full rounded-xl border border-border/65 bg-card px-3.5 py-3 text-left shadow-[0_1px_2px_rgb(0_0_0/.025)] outline-none transition-[border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] active:scale-[.992] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100",
        !selected && "hover:border-border hover:shadow-sm",
      )}
      style={
        selected
          ? {
              backgroundColor: `color-mix(in srgb, ${category.color} 12%, var(--card))`,
              borderColor: `color-mix(in srgb, ${category.color} 34%, var(--border))`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${category.color} 9%, transparent), 0 1px 2px rgb(0 0 0 / .025)`,
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
