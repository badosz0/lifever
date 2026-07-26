import {
  CalendarDays,
  Copy,
  LayoutPanelTop,
  Trash2,
  X,
} from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useKanbanCardActions } from "@/features/kanban/model/use-kanban-card-actions";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";
import { formatUserDate } from "@/lib/date-time-format";

type KanbanInspectorProps = {
  className?: string;
};

export function KanbanInspector({ className }: KanbanInspectorProps) {
  const {
    cards,
    canEditProject,
    columns,
    duplicateCard,
    labels,
    moveCard,
    selectedCardId,
    setSelectedCardId,
    updateCard,
  } = useKanban();
  const { deleteKanbanCard } = useKanbanCardActions();
  const { dateFormat } = useUserPreferences();
  const card = cards.find((item) => item.id === selectedCardId);
  const projectColumns = useMemo(
    () =>
      card
        ? columns
            .filter((column) => column.projectId === card.projectId)
            .sort((a, b) => a.position - b.position)
        : [],
    [card, columns],
  );
  const projectLabels = useMemo(
    () =>
      card
        ? labels
            .filter((label) => label.projectId === card.projectId)
            .sort((a, b) => a.position - b.position)
        : [],
    [card, labels],
  );

  if (!card) {
    return (
      <aside
        className={cn(
          "flex h-full w-[360px] shrink-0 items-center justify-center border-l border-border bg-card px-8 text-center",
          className,
        )}
      >
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <LayoutPanelTop className="size-[18px]" />
          </div>
          <p className="mt-3 text-sm font-medium">Select a card</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Its status, priority, dates, labels, and notes will stay close.
          </p>
        </div>
      </aside>
    );
  }

  const currentColumn = columns.find((column) => column.id === card.columnId);
  const canEdit = canEditProject(card.projectId);

  const deleteCard = () => {
    deleteKanbanCard(card.id);
  };

  return (
    <aside
      className={cn(
        "flex h-full w-[360px] shrink-0 flex-col overflow-hidden border-l border-border bg-card",
        className,
      )}
      aria-label="Card details"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: currentColumn?.color }}
          />
          <h2 className="truncate text-sm font-semibold">Card details</h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setSelectedCardId(null)}
          aria-label="Close details"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <Textarea
          value={card.title}
          onChange={(event) => updateCard(card.id, { title: event.target.value })}
          className="min-h-16 border-0 bg-transparent px-0 py-1 text-[17px] leading-6 font-semibold tracking-[-0.015em] shadow-none focus:ring-0"
          aria-label="Card title"
          readOnly={!canEdit}
        />

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <Textarea
              value={card.description}
              onChange={(event) =>
                updateCard(card.id, { description: event.target.value })
              }
              placeholder="Add context, links, or the next step"
              className="min-h-28"
              readOnly={!canEdit}
            />
          </div>

          <div className="rounded-xl border border-border bg-background p-3">
            <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
              <span className="text-xs font-medium text-muted-foreground">
                Status
              </span>
              <Select
                value={card.columnId}
                disabled={!canEdit}
                onValueChange={(columnId) => {
                  const count = cards.filter(
                    (item) => item.columnId === columnId,
                  ).length;
                  moveCard(card.id, columnId, count);
                }}
              >
                <SelectTrigger className="h-8" aria-label="Card status">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: currentColumn?.color }}
                    />
                    <SelectValue>{currentColumn?.name}</SelectValue>
                  </span>
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

              <span className="text-xs font-medium text-muted-foreground">
                Priority
              </span>
              <KanbanPrioritySelect
                value={card.priority}
                onValueChange={(priority) => updateCard(card.id, { priority })}
                disabled={!canEdit}
              />

              <span className="text-xs font-medium text-muted-foreground">
                Due
              </span>
              <div className="flex min-w-0 gap-1">
                <DatePicker
                  ariaLabel="Card due date"
                  dateFormat={dateFormat}
                  value={card.dueDate ?? ""}
                  onValueChange={(dueDate) => updateCard(card.id, { dueDate })}
                  disabled={!canEdit}
                />
                {card.dueDate && canEdit ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => updateCard(card.id, { dueDate: null })}
                    aria-label="Clear due date"
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>

              <span className="text-xs font-medium text-muted-foreground">
                Labels
              </span>
              <KanbanLabelPicker
                labels={projectLabels}
                value={card.labelIds}
                onValueChange={(labelIds) => updateCard(card.id, { labelIds })}
                compact
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
            <CalendarDays className="size-3" />
            Created{" "}
            {formatUserDate(card.createdAt, dateFormat, {
              includeYear: true,
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-t border-border/60 px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 justify-start rounded-md px-2 text-[12px] font-normal text-muted-foreground"
          onClick={() => duplicateCard(card.id)}
          disabled={!canEdit}
        >
          <Copy className="size-3.5" strokeWidth={1.8} />
          Duplicate
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 justify-start rounded-md px-2 text-[12px] font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={deleteCard}
          disabled={!canEdit}
        >
          <Trash2 className="size-3.5" strokeWidth={1.8} />
          Delete
        </Button>
      </div>
    </aside>
  );
}
