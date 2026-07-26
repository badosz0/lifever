import { Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KanbanLabel } from "@/features/kanban/model/types";

type KanbanLabelPickerProps = {
  labels: KanbanLabel[];
  value: string[];
  onValueChange: (value: string[]) => void;
  compact?: boolean;
  disabled?: boolean;
};

export function KanbanLabelPicker({
  labels,
  value,
  onValueChange,
  compact,
  disabled = false,
}: KanbanLabelPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={
            compact
              ? "h-9 w-full justify-start bg-background px-2.5 font-normal"
              : "h-9 w-full justify-between bg-background px-3 font-normal"
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <Tags className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {value.length === 0
                ? "No labels"
                : `${value.length} ${value.length === 1 ? "label" : "labels"}`}
            </span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Labels</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {labels.length === 0 ? (
          <p className="px-2.5 py-2 text-xs text-muted-foreground">
            Add labels in project settings.
          </p>
        ) : (
          labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              className="gap-2"
              checked={value.includes(label.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) =>
                onValueChange(
                  checked
                    ? [...value, label.id]
                    : value.filter((id) => id !== label.id),
                )
              }
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="truncate">{label.name}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
