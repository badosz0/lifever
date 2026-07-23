import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getKanbanPriority,
  kanbanPriorities,
} from "@/features/kanban/lib/properties";
import type { KanbanPriority } from "@/features/kanban/model/types";

type KanbanPrioritySelectProps = {
  value: KanbanPriority;
  onValueChange: (value: KanbanPriority) => void;
};

export function KanbanPrioritySelect({
  value,
  onValueChange,
}: KanbanPrioritySelectProps) {
  const current = getKanbanPriority(value);
  const CurrentIcon = current.Icon;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as KanbanPriority)}
    >
      <SelectTrigger aria-label="Priority">
        <span className="flex min-w-0 items-center gap-2">
          <CurrentIcon
            className="size-3.5 shrink-0"
            style={{ color: current.color }}
          />
          <SelectValue>{current.label}</SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent>
        {kanbanPriorities.map((priority) => {
          const Icon = priority.Icon;
          return (
            <SelectItem key={priority.value} value={priority.value}>
              <span className="flex items-center gap-2">
                <Icon
                  className="size-3.5"
                  style={{ color: priority.color }}
                />
                {priority.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
