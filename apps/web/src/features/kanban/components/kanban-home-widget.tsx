import { useMemo } from "react";

import { getKanbanDueState } from "@/features/kanban/lib/dates";
import { useKanban } from "@/features/kanban/model/kanban-provider";

const priorityRank = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
} as const;

export function KanbanHomeWidget() {
  const { activeProjectId, cards, columns, projects } = useKanban();
  const project = projects.find((item) => item.id === activeProjectId);
  const doneColumnIds = useMemo(
    () =>
      new Set(
        columns
          .filter(
            (column) =>
              column.projectId === activeProjectId && column.isDone,
          )
          .map((column) => column.id),
      ),
    [activeProjectId, columns],
  );
  const activeCards = useMemo(
    () =>
      cards
        .filter(
          (card) =>
            card.projectId === activeProjectId &&
            !doneColumnIds.has(card.columnId),
        )
        .sort((left, right) => {
          const priority =
            priorityRank[left.priority] - priorityRank[right.priority];
          if (priority) return priority;
          if (!left.dueDate) return 1;
          if (!right.dueDate) return -1;
          return left.dueDate.localeCompare(right.dueDate);
        }),
    [activeProjectId, cards, doneColumnIds],
  );
  const overdue = activeCards.filter(
    (card) => getKanbanDueState(card.dueDate, false) === "overdue",
  ).length;

  return (
    <div>
      <div className="flex items-end gap-2">
        <strong className="text-[28px] leading-none font-bold tracking-[-0.04em]">
          {activeCards.length}
        </strong>
        <span className="pb-0.5 text-[11px] text-muted-foreground">
          open in {project?.name ?? "project"}{overdue ? ` · ${overdue} overdue` : ""}
        </span>
      </div>

      <div className="mt-5 space-y-1">
        {activeCards.slice(0, 3).map((card) => {
          const column = columns.find((item) => item.id === card.columnId);
          return (
            <div
              key={card.id}
              className="flex min-h-8 items-center gap-2 rounded-lg px-1"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: column?.color ?? project?.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                {card.title}
              </span>
              <span className="shrink-0 text-[9px] text-muted-foreground">
                {column?.name}
              </span>
            </div>
          );
        })}
        {!activeCards.length ? (
          <p className="py-4 text-[12px] text-muted-foreground">
            This project is all clear.
          </p>
        ) : null}
      </div>
    </div>
  );
}
