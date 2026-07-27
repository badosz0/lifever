import {
  Eye,
  FilePenLine,
  FileText,
  Pin,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LivePresence } from "@/features/collaboration/components/live-presence";
import { NoteMarkdown } from "@/features/notes/components/note-markdown";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import {
  countNoteWords,
  noteDisplayTitle,
} from "@/features/notes/lib/notes";
import { useNotes } from "@/features/notes/model/notes-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { formatUserDate, formatUserTime } from "@/lib/date-time-format";
import { cn } from "@/lib/cn";

type NoteInspectorProps = {
  className?: string;
};

type EditorMode = "edit" | "preview";

export function NoteInspector({ className }: NoteInspectorProps) {
  const {
    categories,
    liveCollaborators,
    notes,
    removeNote,
    restoreNote,
    selectedNoteId,
    setSelectedNoteId,
    settings,
    updateNote,
  } = useNotes();
  const { dateFormat, timeFormat } = useUserPreferences();
  const note = notes.find((item) => item.id === selectedNoteId);
  const [mode, setMode] = useState<EditorMode>(
    settings.openInPreview ? "preview" : "edit",
  );
  const [shareOpen, setShareOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(settings.openInPreview && note?.body ? "preview" : "edit");
    if (note && !note.title && !note.body) {
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [note?.id, settings.openInPreview]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!note || !(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      if (event.key.toLowerCase() !== "p") return;
      event.preventDefault();
      setMode((current) => (current === "edit" ? "preview" : "edit"));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [note]);

  const wordCount = useMemo(
    () => (note ? countNoteWords(`${note.title} ${note.body}`) : 0),
    [note],
  );

  if (!note) {
    return (
      <aside
        className={cn(
          "flex h-full w-full items-center justify-center border-l border-border bg-card px-8 text-center",
          className,
        )}
      >
        <div className="max-w-[260px]">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FileText className="size-[19px]" />
          </div>
          <p className="mt-3 text-sm font-semibold">Select a note</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Open a note to edit it or see its beautifully rendered Markdown.
          </p>
        </div>
      </aside>
    );
  }

  const category =
    categories.find((item) => item.id === note.categoryId) ?? categories[0]!;
  const editableCategories = categories.filter(
    (item) => item.owned !== false,
  );
  const updatedAt = new Date(note.updatedAt);
  const canEdit = note.access?.permission !== "read";
  const isOwner = note.access?.role !== "collaborator";

  const deleteNote = () => {
    const removed = removeNote(note.id);
    if (!removed) return;
    toast("Note deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreNote(removed);
          setSelectedNoteId(removed.id);
        },
      },
    });
  };

  return (
    <>
      <aside
      className={cn(
        "flex h-full w-full flex-col overflow-hidden border-l border-border bg-card",
        className,
      )}
      aria-label={`${noteDisplayTitle(note)} editor`}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/65 px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "size-8 text-muted-foreground",
            note.pinned && "text-amber-600 dark:text-amber-400",
          )}
          onClick={() => updateNote(note.id, { pinned: !note.pinned })}
          disabled={!canEdit}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          aria-pressed={note.pinned}
        >
          <Pin
            className="size-4"
            fill={note.pinned ? "currentColor" : "none"}
          />
        </Button>

        {note.access ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 text-muted-foreground"
            onClick={() => setShareOpen(true)}
            aria-label="Share note"
          >
            <Share2 className="size-4" />
          </Button>
        ) : null}

        <div className="mx-auto flex rounded-lg bg-muted p-0.5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            onClick={() => setMode("edit")}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              mode === "edit"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FilePenLine className="size-3.5" />
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            onClick={() => setMode("preview")}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              mode === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="size-3.5" />
            Preview
          </button>
        </div>

        <LivePresence peers={liveCollaborators} />

        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 text-muted-foreground"
          onClick={() => setSelectedNoteId(null)}
          aria-label="Close note"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-5 pt-5 sm:px-7 sm:pt-7">
          {mode === "edit" ? (
            <input
              ref={titleRef}
              value={note.title}
              onChange={(event) =>
                updateNote(note.id, { title: event.target.value })
              }
              placeholder="Untitled Note"
              maxLength={160}
              readOnly={!canEdit}
              className="w-full bg-transparent text-[26px] leading-[1.15] font-bold tracking-[-0.025em] outline-none placeholder:text-muted-foreground/45 sm:text-[30px]"
              aria-label="Note title"
            />
          ) : (
            <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.025em] sm:text-[30px]">
              {noteDisplayTitle(note)}
            </h1>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Select
              value={note.categoryId}
              disabled={!isOwner}
              onValueChange={(categoryId) =>
                updateNote(note.id, { categoryId })
              }
            >
              <SelectTrigger className="h-7 w-auto min-w-[112px] gap-1.5 border-0 bg-muted/75 px-2 text-[11px] shadow-none">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {editableCategories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              Edited {formatUserDate(updatedAt, dateFormat, {
                includeYear: false,
                length: "long",
              })}{" "}
              at {formatUserTime(updatedAt, timeFormat)}
            </span>
            <span className="text-[10px] text-muted-foreground/50">·</span>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>
        </div>

        {mode === "edit" ? (
          <textarea
            value={note.body}
            onChange={(event) => updateNote(note.id, { body: event.target.value })}
            placeholder={"Start writing…\n\nMarkdown is supported."}
            spellCheck={settings.spellcheck}
            readOnly={!canEdit}
            className="mt-4 min-h-0 flex-1 resize-none bg-transparent px-5 pb-24 text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground/45 sm:px-7"
            aria-label="Note body"
          />
        ) : (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-24 sm:px-7">
            {note.body.trim() ? (
              <NoteMarkdown>{note.body}</NoteMarkdown>
            ) : (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="mt-8 w-full rounded-2xl border border-dashed border-border bg-background px-5 py-10 text-center outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FilePenLine className="mx-auto size-5 text-muted-foreground" />
                <span className="mt-2 block text-[13px] font-semibold">
                  Nothing to preview yet
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Switch to editing and start writing.
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex h-10 shrink-0 items-center justify-between border-t border-border/60 bg-card px-3">
        <span className="text-[10px] text-muted-foreground">
          Markdown · ⌘⇧P to toggle preview
        </span>
        {isOwner ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={deleteNote}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            Shared by {note.access?.owner.name}
          </span>
        )}
      </div>
      </aside>
      {note.access ? (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          resourceType="note"
          resourceId={note.id}
          resourceName={noteDisplayTitle(note)}
          onLeft={() => setSelectedNoteId(null)}
        />
      ) : null}
    </>
  );
}
