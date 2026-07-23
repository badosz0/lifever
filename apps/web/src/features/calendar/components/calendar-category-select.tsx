import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { getCalendarCategory } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { cn } from "@/lib/cn";

type CalendarCategorySelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

export function CalendarCategorySelect({
  value,
  onValueChange,
  ariaLabel = "Event category",
  className,
}: CalendarCategorySelectProps) {
  const { categories } = useCalendar();
  const selectedCategory = getCalendarCategory(categories, value);

  return (
    <Select value={selectedCategory.id} onValueChange={onValueChange}>
      <SelectTrigger aria-label={ariaLabel} className={cn("h-9", className)}>
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
            style={{ backgroundColor: selectedCategory.color }}
          />
          <span className="truncate text-[13px] font-medium">
            {selectedCategory.name}
          </span>
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate">{category.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
