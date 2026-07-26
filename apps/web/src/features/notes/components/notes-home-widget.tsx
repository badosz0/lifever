import { Pin } from "lucide-react";
import { useMemo } from "react";

import { useNotes } from "@/features/notes/model/notes-provider";
import { formatUserDate } from "@/lib/date-time-format";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";

export function NotesHomeWidget() {
  const { categories, isReady, notes } = useNotes();
  const { dateFormat } = useUserPreferences();
  const recent = useMemo(
    () =>
      [...notes]
        .sort((left, right) => {
          if (left.pinned !== right.pinned) {
            return Number(right.pinned) - Number(left.pinned);
          }
          return right.updatedAt.localeCompare(left.updatedAt);
        })
        .slice(0, 3),
    [notes],
  );
  const pinnedCount = notes.filter((note) => note.pinned).length;

  if (!isReady) {
    return <p className="text-xs text-muted-foreground">Loading notes…</p>;
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        <strong className="text-[28px] leading-none font-bold tracking-[-0.04em]">
          {notes.length}
        </strong>
        <span className="pb-0.5 text-[11px] text-muted-foreground">
          notes · {pinnedCount} pinned
        </span>
      </div>

      <div className="mt-5 space-y-1">
        {recent.map((note) => {
          const category = categories.find(
            (item) => item.id === note.categoryId,
          );
          return (
            <div
              key={note.id}
              className="flex min-h-8 items-center gap-2 rounded-lg px-1"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: category?.color ?? "#f59e0b" }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                {note.title}
              </span>
              {note.pinned ? (
                <Pin className="size-3 shrink-0 text-amber-500" />
              ) : null}
              <span className="shrink-0 text-[9px] text-muted-foreground">
                {formatUserDate(note.updatedAt, dateFormat, {
                  includeYear: false,
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
