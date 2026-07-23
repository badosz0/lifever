import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanSortableCard } from "@/features/kanban/components/kanban-card";
import type {
  KanbanCard,
  KanbanColumn as KanbanColumnModel,
  KanbanLabel,
} from "@/features/kanban/model/types";
import { cn } from "@/lib/cn";

type KanbanColumnProps = {
  column: KanbanColumnModel;
  cards: KanbanCard[];
  totalCardCount: number;
  labels: KanbanLabel[];
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
  onAddCard: (columnId: string) => void;
  onManageWorkflow: () => void;
};

export function KanbanColumn({
  column,
  cards,
  totalCardCount,
  labels,
  selectedCardId,
  onSelectCard,
  onAddCard,
  onManageWorkflow,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  const atLimit =
    column.wipLimit !== null && totalCardCount >= column.wipLimit;
  const filtered = totalCardCount !== cards.length;

  return (
    <section className="group/column flex w-[min(280px,calc(100vw-2rem))] shrink-0 flex-col self-start">
      <div className="flex h-10 shrink-0 items-center gap-2 px-1">
        <div
          className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1"
          style={{
            color: `color-mix(in srgb, ${column.color} 78%, var(--foreground))`,
            backgroundColor: `color-mix(in srgb, ${column.color} 12%, var(--background))`,
          }}
        >
          <span
            className="size-2 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
            style={{ backgroundColor: column.color }}
          />
          <h2 className="min-w-0 truncate text-[12px] leading-4 font-semibold">
            {column.name}
          </h2>
        </div>
        <span
          className={cn(
            "text-[11px] leading-4 font-medium tabular-nums text-muted-foreground",
            atLimit && "text-orange-600 dark:text-orange-400",
          )}
          title={
            column.wipLimit === null
              ? `${totalCardCount} cards`
              : `${totalCardCount} of ${column.wipLimit} card limit`
          }
        >
          {filtered ? `${cards.length}/${totalCardCount}` : totalCardCount}
          {!filtered && column.wipLimit !== null ? `/${column.wipLimit}` : ""}
        </span>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/column:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              aria-label={`${column.name} options`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onManageWorkflow}>
              Manage status…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-14 rounded-xl p-1 transition-[background-color,box-shadow] duration-150",
          isOver &&
            "bg-[color-mix(in_srgb,var(--project-color)_7%,var(--background))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--project-color)_24%,transparent)]",
        )}
      >
        <SortableContext
          items={cards.map((card) => `card:${card.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {cards.map((card) => (
              <KanbanSortableCard
                key={card.id}
                card={card}
                labels={labels}
                completed={column.isDone}
                selected={selectedCardId === card.id}
                onSelect={onSelectCard}
              />
            ))}
          </div>
        </SortableContext>

        {cards.length === 0 && totalCardCount === 0 ? (
          <div
            className={cn(
              "flex h-14 w-full items-center justify-center rounded-lg border border-dashed border-transparent px-4 text-center text-[11px] font-medium text-muted-foreground transition-[border-color,color] duration-150",
              isOver &&
                "border-[color-mix(in_srgb,var(--project-color)_28%,var(--border))] text-foreground",
            )}
          >
            {isOver ? "Drop card here" : null}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex h-14 w-full items-center justify-center px-4 text-center text-[11px] font-medium text-muted-foreground">
            No matching cards
          </div>
        ) : null}
      </div>

      <div className="mt-1 shrink-0 px-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start px-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => onAddCard(column.id)}
        >
          <Plus className="size-3.5" />
          Add card
        </Button>
      </div>
    </section>
  );
}
