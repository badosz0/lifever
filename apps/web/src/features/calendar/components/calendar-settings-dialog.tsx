import { Plus, Tags, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CategoryColorPicker } from "@/features/calendar/components/category-color-picker";
import { calendarColorPresets } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type { CalendarCategory } from "@/features/calendar/model/types";

type CalendarSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CategoryRowProps = {
  category: CalendarCategory;
  eventCount: number;
  canDelete: boolean;
  autoFocus: boolean;
  onCommitName: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
};

function CategoryRow({
  category,
  eventCount,
  canDelete,
  autoFocus,
  onCommitName,
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
    if (cleanName !== category.name) onCommitName(cleanName);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background p-2 shadow-[0_1px_2px_rgb(0_0_0/.025)]">
      <CategoryColorPicker
        value={category.color}
        onValueChange={onColorChange}
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
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
        {eventCount} {eventCount === 1 ? "event" : "events"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`Delete ${category.name}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

export function CalendarSettingsDialog({
  open,
  onOpenChange,
}: CalendarSettingsDialogProps) {
  const {
    addCategory,
    categories,
    events,
    removeCategory,
    updateCategory,
  } = useCalendar();
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const previousOpen = useRef(open);

  useEffect(() => {
    if (previousOpen.current && !open) setNewCategoryId(null);
    previousOpen.current = open;
  }, [open]);

  const addNewCategory = () => {
    const unusedPreset = calendarColorPresets.find(
      (preset) =>
        !categories.some(
          (category) => category.color.toLowerCase() === preset.color,
        ),
    );
    const category = addCategory({
      name: "New category",
      color: unusedPreset?.color ?? calendarColorPresets[0]!.color,
    });
    setNewCategoryId(category.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] overflow-visible bg-popover p-0">
        <div className="border-b border-border/65 px-5 pt-5 pb-4">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Tags className="size-[18px]" />
          </div>
          <DialogTitle>Calendar categories</DialogTitle>
          <DialogDescription className="mt-1">
            Organize events with names and colors that fit your calendar.
          </DialogDescription>
        </div>

        <div className="max-h-[min(62vh,520px)] overflow-y-auto bg-muted/20 px-5 py-4">
          <div className="space-y-2">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                eventCount={
                  events.filter((event) => event.categoryId === category.id)
                    .length
                }
                canDelete={categories.length > 1}
                autoFocus={newCategoryId === category.id}
                onCommitName={(name) => {
                  updateCategory(category.id, { name });
                  setNewCategoryId(null);
                }}
                onColorChange={(color) =>
                  updateCategory(category.id, { color })
                }
                onDelete={() => {
                  if (!removeCategory(category.id)) return;
                  toast("Category deleted", {
                    description: "Its events were moved to the first category.",
                  });
                }}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-3 h-9 w-full border-dashed bg-background text-[12px]"
            onClick={addNewCategory}
          >
            <Plus className="size-3.5" />
            Add category
          </Button>
          <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
            Deleting a category moves its events to the first category in this list.
          </p>
        </div>

        <div className="flex justify-end border-t border-border/65 bg-popover px-5 py-3">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
