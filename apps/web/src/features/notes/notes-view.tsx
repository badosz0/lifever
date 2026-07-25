import {
  FilePenLine,
  Menu,
  PanelLeft,
  Plus,
  Settings2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { NoteListItem } from "@/features/notes/components/note-list-item";
import { NotesNavigation } from "@/features/notes/components/notes-navigation";
import { NotesSettingsDialog } from "@/features/notes/components/notes-settings-dialog";
import {
  noteCategoryFilter,
  notePlainText,
  sortNotes,
} from "@/features/notes/lib/notes";
import { useNotes } from "@/features/notes/model/notes-provider";

type NotesViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

export function NotesView({
  onOpenMobileSidebar,
  onToggleSidebar,
}: NotesViewProps) {
  const {
    activeFilter,
    addNote,
    categories,
    isReady,
    notes,
    selectedNoteId,
    setSelectedNoteId,
    settings,
  } = useNotes();
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const openNewNote = useCallback(() => {
    if (isReady) addNote();
  }, [addNote, isReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches(
        "input, textarea, select, [contenteditable='true']",
      );
      const commandPressed = event.metaKey || event.ctrlKey;

      if (
        event.key.toLowerCase() === "n" &&
        !event.altKey &&
        (commandPressed || !isTyping)
      ) {
        event.preventDefault();
        openNewNote();
      }

      if (commandPressed && event.key.toLowerCase() === "f") {
        event.preventDefault();
        const searchInput = [
          desktopSearchRef.current,
          mobileSearchRef.current,
        ].find((input) => input?.offsetParent !== null);
        searchInput?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openNewNote]);

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = notes.filter((note) => {
      if (activeFilter === "pinned" && !note.pinned) return false;
      if (
        activeFilter.startsWith("category:") &&
        note.categoryId !== activeFilter.slice("category:".length)
      ) {
        return false;
      }
      if (!query) return true;
      const category = categories.find((item) => item.id === note.categoryId);
      return `${note.title} ${notePlainText(note.body)} ${category?.name ?? ""}`
        .toLocaleLowerCase()
        .includes(query);
    });
    return sortNotes(filtered, settings.sort);
  }, [activeFilter, categories, notes, search, settings.sort]);

  useEffect(() => {
    if (
      selectedNoteId &&
      !visibleNotes.some((note) => note.id === selectedNoteId)
    ) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId, setSelectedNoteId, visibleNotes]);

  const activeCategory =
    activeFilter.startsWith("category:")
      ? categories.find(
          (category) =>
            noteCategoryFilter(category.id) === activeFilter,
        )
      : null;
  const title =
    activeFilter === "pinned"
      ? "Pinned Notes"
      : activeCategory?.name ?? "Notes";
  const noteCountLabel =
    visibleNotes.length === 1 ? "1 note" : `${visibleNotes.length} notes`;

  return (
    <main className="notes-search-layout relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="scroll-edge relative z-10 shrink-0 bg-background/88 px-4 pt-3 pb-4 backdrop-blur-xl sm:px-7 sm:pt-5">
        <div className="flex min-h-9 items-center gap-2">
          <ShortcutTooltip label="Toggle Sidebar" shortcut={["⌘", "\\"]}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-muted-foreground md:inline-flex"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          </ShortcutTooltip>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground md:hidden"
            onClick={onOpenMobileSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>
          <NotesNavigation />
          <div className="flex-1" />
          <SearchField
            ref={desktopSearchRef}
            value={search}
            onValueChange={setSearch}
            label="Search notes"
            className="notes-toolbar-search w-[230px] shrink-0"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 text-muted-foreground"
            onClick={() => setSettingsOpen(true)}
            aria-label="Notes settings"
            title="Notes settings"
          >
            <Settings2 className="size-[17px]" />
          </Button>
          <ShortcutTooltip label="New Note" shortcut={["⌘", "N"]}>
            <Button
              size="icon-sm"
              className="size-7 rounded-full bg-amber-500 text-white hover:bg-amber-500/90 dark:bg-amber-500 dark:text-white"
              onClick={openNewNote}
              disabled={!isReady}
              aria-label="New note"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </Button>
          </ShortcutTooltip>
        </div>

        <div className="mt-6 min-w-0 px-1 sm:mt-8">
          <div className="flex items-center gap-2">
            {activeCategory ? (
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: activeCategory.color }}
                aria-hidden="true"
              />
            ) : null}
            <h1 className="truncate text-[30px] leading-[1.08] font-bold tracking-[-0.03em] sm:text-[34px]">
              {title}
            </h1>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {search ? `${noteCountLabel} matching “${search}”` : noteCountLabel}
          </p>
        </div>

        <SearchField
          ref={mobileSearchRef}
          value={search}
          onValueChange={setSearch}
          label="Search notes"
          className="notes-body-search mt-3"
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-24 sm:px-6">
        <div className="mx-auto max-w-3xl pt-2">
          {visibleNotes.length ? (
            <div className="space-y-2">
              {visibleNotes.map((note) => {
                const category =
                  categories.find((item) => item.id === note.categoryId) ??
                  categories[0]!;
                return (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    category={category}
                    previewLines={settings.previewLines}
                    selected={selectedNoteId === note.id}
                    onSelect={() => setSelectedNoteId(note.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center px-6 py-16 text-center">
              <div className="max-w-[280px]">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FilePenLine className="size-5" />
                </div>
                <h2 className="mt-4 text-[15px] font-semibold">
                  {search ? "No matching notes" : "No notes here yet"}
                </h2>
                <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
                  {search
                    ? "Try a different title, category, or phrase."
                    : "Capture a thought and organize it whenever you’re ready."}
                </p>
                {!search ? (
                  <Button
                    size="sm"
                    className="mt-4 bg-amber-500 text-white hover:bg-amber-500/90"
                    onClick={openNewNote}
                    disabled={!isReady}
                  >
                    <Plus className="size-3.5" />
                    New Note
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <NotesSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}
