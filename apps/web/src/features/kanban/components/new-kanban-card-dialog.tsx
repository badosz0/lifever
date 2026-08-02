import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
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
import { Textarea } from "@/components/ui/textarea";
import { KanbanLabelPicker } from "@/features/kanban/components/kanban-label-picker";
import { KanbanPrioritySelect } from "@/features/kanban/components/kanban-priority-select";
import { useKanban } from "@/features/kanban/model/kanban-provider";
import type { KanbanPriority } from "@/features/kanban/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { useOnOpen } from "@/hooks/use-on-open";

type NewKanbanCardDialogProps = {
  open: boolean;
  initialColumnId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function NewKanbanCardDialog({
  open,
  initialColumnId,
  onOpenChange,
}: NewKanbanCardDialogProps) {
  const { activeProjectId, addCard, columns, labels } = useKanban();
  const { dateFormat } = useUserPreferences();
  const projectColumns = useMemo(
    () =>
      columns
        .filter((column) => column.projectId === activeProjectId)
        .sort((a, b) => a.position - b.position),
    [activeProjectId, columns],
  );
  const projectLabels = useMemo(
    () =>
      labels
        .filter((label) => label.projectId === activeProjectId)
        .sort((a, b) => a.position - b.position),
    [activeProjectId, labels],
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<KanbanPriority>("none");
  const [dueDate, setDueDate] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);

  useOnOpen(open, () => {
    setTitle("");
    setDescription("");
    setColumnId(
      initialColumnId &&
        projectColumns.some((column) => column.id === initialColumnId)
        ? initialColumnId
        : (projectColumns[0]?.id ?? ""),
    );
    setPriority("none");
    setDueDate("");
    setLabelIds([]);
  });

  useEffect(() => {
    if (
      !open ||
      projectColumns.some((column) => column.id === columnId)
    ) {
      return;
    }
    setColumnId(projectColumns[0]?.id ?? "");
  }, [columnId, open, projectColumns]);

  const createCard = () => {
    if (!title.trim() || !columnId) return;
    addCard({
      projectId: activeProjectId,
      columnId,
      title,
      description,
      priority,
      dueDate: dueDate || null,
      labelIds,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(720px,calc(100dvh-2rem))] max-w-[500px] overflow-visible p-0">
        <div className="px-5 pt-5 pr-12">
          <DialogTitle>New card</DialogTitle>
          <DialogDescription className="mt-1">
            Capture the work now; refine its details whenever you need.
          </DialogDescription>
        </div>

        <form
          className="mt-4 max-h-[min(590px,calc(100dvh-9rem))] space-y-4 overflow-y-auto px-5 pt-1 pb-5"
          onSubmit={(event) => {
            event.preventDefault();
            createCard();
          }}
        >
          <div>
            <label
              htmlFor="kanban-card-title"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Title
            </label>
            <Input
              id="kanban-card-title"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to happen?"
            />
          </div>
          <div>
            <label
              htmlFor="kanban-card-description"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Notes
            </label>
            <Textarea
              id="kanban-card-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add useful context, a decision, or a next step"
              className="min-h-24"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger aria-label="Card status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectColumns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        {column.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Priority
              </label>
              <KanbanPrioritySelect
                value={priority}
                onValueChange={setPriority}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Due date
              </label>
              <div className="flex gap-1.5">
                <DatePicker
                  ariaLabel="Card due date"
                  dateFormat={dateFormat}
                  value={dueDate}
                  onValueChange={setDueDate}
                />
                {dueDate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setDueDate("")}
                    aria-label="Clear due date"
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Labels
              </label>
              <KanbanLabelPicker
                labels={projectLabels}
                value={labelIds}
                onValueChange={setLabelIds}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !columnId}>
              Add card
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
