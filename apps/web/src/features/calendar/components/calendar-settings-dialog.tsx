import { MousePointerClick, Plus, Settings2, Trash2 } from "lucide-react";
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
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";

type CalendarSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PreferenceSwitchProps = {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
};

function PreferenceSwitch({
  checked,
  description,
  label,
  onCheckedChange,
}: PreferenceSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex min-h-16 w-full items-center gap-3 px-3 text-left outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
        <MousePointerClick className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
          {description}
        </span>
      </span>
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
  const { calendarClickToCreate, setCalendarClickToCreate } =
    useUserPreferences();
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
            <Settings2 className="size-[18px]" />
          </div>
          <DialogTitle>Calendar settings</DialogTitle>
          <DialogDescription className="mt-1">
            Choose how you create and organize calendar events.
          </DialogDescription>
        </div>

        <div className="max-h-[min(62vh,520px)] overflow-y-auto bg-muted/20 px-5 py-4">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <PreferenceSwitch
              checked={calendarClickToCreate}
              onCheckedChange={setCalendarClickToCreate}
              label="Create events by clicking"
              description="Click an empty slot in week or day view to open a new event"
            />
          </div>

          <div className="mt-5">
            <h3 className="text-[13px] font-semibold">Categories</h3>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Give each category a name and color.
            </p>
          </div>
          <div className="mt-2 space-y-2">
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
