import { FileText, Plus, Settings2, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { noteColorPresets } from "@/features/notes/lib/categories";
import { useNotes } from "@/features/notes/model/notes-provider";
import type {
  NoteCategory,
  NotePreviewLines,
  NotesSort,
} from "@/features/notes/model/types";
import { cn } from "@/lib/cn";

type NotesSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CategoryRowProps = {
  category: NoteCategory;
  noteCount: number;
  canDelete: boolean;
  autoFocus: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
};

function CategoryRow({
  category,
  noteCount,
  canDelete,
  autoFocus,
  onNameChange,
  onColorChange,
  onDelete,
}: CategoryRowProps) {
  const [name, setName] = useState(category.name);

  useEffect(() => setName(category.name), [category.name]);

  const commitName = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setName(category.name);
      return;
    }
    if (cleanName !== category.name) onNameChange(cleanName);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-2 shadow-[0_1px_2px_rgb(0_0_0/.025)]">
      <ColorPicker
        value={category.color}
        onValueChange={onColorChange}
        presets={noteColorPresets}
        ariaLabel={`Choose color for ${category.name}`}
      />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setName(category.name);
            event.currentTarget.blur();
          }
        }}
        autoFocus={autoFocus}
        maxLength={40}
        className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-[13px] font-medium shadow-none focus:ring-0"
        aria-label="Category name"
      />
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {noteCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`Delete ${category.name}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function PreferenceSwitch({
  checked,
  onCheckedChange,
  label,
  description,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex min-h-14 w-full items-center gap-3 px-3 text-left outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
      <span
        className={cn(
          "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-primary" : "bg-muted-foreground/25",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

export function NotesSettingsDialog({
  open,
  onOpenChange,
}: NotesSettingsDialogProps) {
  const {
    addCategory,
    categories,
    notes,
    removeCategory,
    settings,
    updateCategory,
    updateSettings,
  } = useNotes();
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const editableCategories = categories.filter(
    (category) => category.owned !== false,
  );

  const addNewCategory = () => {
    const unusedColor =
      noteColorPresets.find(
        (preset) =>
          !editableCategories.some(
            (category) =>
              category.color.toLowerCase() === preset.color.toLowerCase(),
          ),
      )?.color ?? noteColorPresets[0]!.color;
    const category = addCategory({
      name: "New category",
      color: unusedColor,
    });
    setNewCategoryId(category.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setNewCategoryId(null);
      }}
    >
      <DialogContent className="flex max-h-[min(780px,calc(100vh-2rem))] max-w-[560px] flex-col overflow-hidden bg-popover p-0">
        <div className="border-b border-border/60 px-5 pt-5 pb-4">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
            <Settings2 className="size-[18px]" />
          </div>
          <DialogTitle>Notes settings</DialogTitle>
          <DialogDescription className="mt-1">
            Choose how notes are organized, edited, and previewed.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="flex min-h-14 items-center gap-3 border-b border-border/60 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Sort notes</p>
                <p className="hidden text-[10px] text-muted-foreground sm:block">
                  Pinned notes always stay first
                </p>
              </div>
              <Select
                value={settings.sort}
                onValueChange={(sort) =>
                  updateSettings({ sort: sort as NotesSort })
                }
              >
                <SelectTrigger className="h-8 w-[132px] text-[12px] sm:w-[148px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Date edited</SelectItem>
                  <SelectItem value="created">Date created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-h-14 items-center gap-3 border-b border-border/60 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">List preview</p>
                <p className="hidden text-[10px] text-muted-foreground sm:block">
                  Body lines shown below the title
                </p>
              </div>
              <Select
                value={String(settings.previewLines)}
                onValueChange={(previewLines) =>
                  updateSettings({
                    previewLines: Number(previewLines) as NotePreviewLines,
                  })
                }
              >
                <SelectTrigger className="h-8 w-[132px] text-[12px] sm:w-[148px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 line</SelectItem>
                  <SelectItem value="2">2 lines</SelectItem>
                  <SelectItem value="3">3 lines</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-h-14 items-center gap-3 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Tags className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">New note category</p>
                <p className="hidden text-[10px] text-muted-foreground sm:block">
                  Applied when a note is created
                </p>
              </div>
              <Select
                value={settings.defaultCategoryId}
                onValueChange={(defaultCategoryId) =>
                  updateSettings({ defaultCategoryId })
                }
              >
                <SelectTrigger className="h-8 w-[132px] text-[12px] sm:w-[148px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
            <PreferenceSwitch
              checked={settings.openInPreview}
              onCheckedChange={(openInPreview) =>
                updateSettings({ openInPreview })
              }
              label="Open in preview"
              description="Show rendered Markdown first when opening a note"
            />
            <div className="h-px bg-border/60" />
            <PreferenceSwitch
              checked={settings.spellcheck}
              onCheckedChange={(spellcheck) => updateSettings({ spellcheck })}
              label="Check spelling"
              description="Use the system spell checker while editing"
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold">Categories</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Give each collection a name and color.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addNewCategory}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            {editableCategories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                noteCount={
                  notes.filter((note) => note.categoryId === category.id).length
                }
                canDelete={editableCategories.length > 1}
                autoFocus={newCategoryId === category.id}
                onNameChange={(name) => {
                  updateCategory(category.id, { name });
                  setNewCategoryId(null);
                }}
                onColorChange={(color) =>
                  updateCategory(category.id, { color })
                }
                onDelete={() => {
                  if (!removeCategory(category.id)) return;
                  toast("Category deleted", {
                    description: "Its notes were moved to another category.",
                  });
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          <p className="text-[10px] text-muted-foreground">
            Changes are saved automatically.
          </p>
          <DialogClose asChild>
            <Button size="sm">Done</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
