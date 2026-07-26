import { Button } from "@/components/ui/button";
import { CategoryColorPicker } from "@/features/calendar/components/category-color-picker";
import { calendarColorPresets } from "@/features/calendar/lib/categories";
import type { CalendarCategory } from "@/features/calendar/model/types";
import { cn } from "@/lib/cn";

type CalendarEventColorControlProps = {
  category: Pick<CalendarCategory, "name" | "color">;
  value?: string | null;
  onValueChange: (color: string | null) => void;
  className?: string;
};

export function CalendarEventColorControl({
  category,
  value,
  onValueChange,
  className,
}: CalendarEventColorControlProps) {
  const effectiveColor = value ?? category.color;
  const defaultPreset = {
    color: category.color,
    label: `${category.name} category color`,
  };
  const presets = calendarColorPresets.some(
    (preset) =>
      preset.color.toLowerCase() === category.color.toLowerCase(),
  )
    ? calendarColorPresets
    : [defaultPreset, ...calendarColorPresets.slice(0, -1)];

  return (
    <div className={cn("flex min-h-9 items-center gap-2", className)}>
      <CategoryColorPicker
        value={effectiveColor}
        onValueChange={(color) =>
          onValueChange(
            color.toLowerCase() === category.color.toLowerCase()
              ? null
              : color,
          )
        }
        presets={presets}
        ariaLabel="Choose event color"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium">
          {value ? "Custom color" : "Category color"}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {value ? `Overrides ${category.name}` : `Follows ${category.name}`}
        </p>
      </div>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-[10px] text-muted-foreground"
          onClick={() => onValueChange(null)}
        >
          Use category
        </Button>
      ) : null}
    </div>
  );
}
