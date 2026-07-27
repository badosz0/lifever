import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, MessageSquareText } from "lucide-react";

import { LivePresence } from "@/features/collaboration/components/live-presence";
import type { CollaborationPeer } from "@/features/collaboration/model/types";
import { KanbanCardContextMenu } from "@/features/kanban/components/kanban-card-context-menu";
import { getKanbanDueState, parseKanbanDate } from "@/features/kanban/lib/dates";
import { getKanbanPriority } from "@/features/kanban/lib/properties";
import type {
  KanbanCard,
  KanbanLabel,
} from "@/features/kanban/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { cn } from "@/lib/cn";
import { formatUserDate } from "@/lib/date-time-format";

type KanbanCardSurfaceProps = {
  card: KanbanCard;
  labels: KanbanLabel[];
  completed: boolean;
  selected?: boolean;
  overlay?: boolean;
  collaborators?: CollaborationPeer[];
};

export function KanbanCardSurface({
  card,
  labels,
  completed,
  selected,
  overlay,
  collaborators = [],
}: KanbanCardSurfaceProps) {
  const { dateFormat } = useUserPreferences();
  const priority = getKanbanPriority(card.priority);
  const dueState = getKanbanDueState(card.dueDate, completed);
  const PriorityIcon = priority.Icon;
  const cardLabels = labels.filter((label) => card.labelIds.includes(label.id));

  return (
    <div
      className={cn(
        "group/card relative flex w-full min-w-0 flex-col items-start rounded-lg border border-border/85 bg-card p-3 text-left shadow-[0_1px_2px_rgb(0_0_0/.045)] outline-none transition-[border-color,box-shadow,transform,opacity] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:border-foreground/15 hover:shadow-[0_2px_8px_rgb(0_0_0/.065)]",
        selected &&
          "border-[color-mix(in_srgb,var(--project-color)_42%,var(--border))] ring-2 ring-[color-mix(in_srgb,var(--project-color)_18%,transparent)]",
        overlay &&
          "scale-[1.02] border-foreground/15 shadow-[0_18px_45px_rgb(0_0_0/.2)]",
      )}
    >
      <LivePresence
        peers={collaborators}
        pointer
        size="xs"
        className="absolute -top-2 -right-1 z-10"
      />
      {cardLabels.length > 0 ? (
        <div className="mb-2 flex w-full flex-wrap gap-1.5">
          {cardLabels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[9px] leading-3 font-semibold"
              style={{
                color: `color-mix(in srgb, ${label.color} 76%, var(--foreground))`,
                backgroundColor: `color-mix(in srgb, ${label.color} 14%, var(--background))`,
              }}
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="truncate">{label.name}</span>
            </span>
          ))}
          {cardLabels.length > 3 ? (
            <span className="self-center text-[9px] font-medium text-muted-foreground">
              +{cardLabels.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex w-full items-start gap-2">
        <p
          className={cn(
            "min-w-0 flex-1 [overflow-wrap:anywhere] text-[13px] leading-[1.35] font-semibold tracking-[-0.005em]",
            completed && "text-muted-foreground line-through decoration-border",
          )}
        >
          {card.title}
        </p>
        <GripVertical className="mt-px size-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover/card:text-muted-foreground/45" />
      </div>

      {card.description ? (
        <p className="mt-1.5 line-clamp-2 w-full min-w-0 whitespace-pre-line [overflow-wrap:anywhere] text-[11px] leading-[1.45] text-muted-foreground">
          {card.description}
        </p>
      ) : null}

      {(card.priority !== "none" || card.dueDate || card.description) ? (
        <div className="mt-3 flex w-full min-w-0 items-center gap-2 text-[10px] font-medium text-muted-foreground">
          {card.priority !== "none" ? (
            <span
              className="flex items-center gap-1"
              style={{ color: priority.color }}
              title={priority.label}
            >
              <PriorityIcon className="size-3" strokeWidth={2.2} />
              <span>{priority.shortLabel}</span>
            </span>
          ) : null}
          {card.dueDate ? (
            <span
              className={cn(
                "ml-auto flex items-center gap-1 tabular-nums",
                dueState === "today" && "text-orange-600 dark:text-orange-400",
                dueState === "overdue" && "text-destructive",
              )}
            >
              <CalendarDays className="size-3" />
              {formatUserDate(parseKanbanDate(card.dueDate), dateFormat, {
                includeYear: false,
              })}
            </span>
          ) : card.description ? (
            <MessageSquareText className="ml-auto size-3" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type KanbanSortableCardProps = KanbanCardSurfaceProps & {
  onSelect: (id: string) => void;
  readOnly?: boolean;
};

export function KanbanSortableCard({
  card,
  labels,
  completed,
  selected,
  collaborators,
  onSelect,
  readOnly = false,
}: KanbanSortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${card.id}`,
    data: { type: "card", cardId: card.id, columnId: card.columnId },
    disabled: readOnly,
  });

  return (
    <KanbanCardContextMenu card={card} disabled={readOnly}>
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => onSelect(card.id)}
        className={cn(
          "block w-full cursor-pointer touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isDragging && "opacity-25",
        )}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        aria-label={
          readOnly
            ? card.title
            : `${card.title}. Drag to reorder or move to another status.`
        }
        {...(readOnly ? {} : attributes)}
        {...(readOnly ? {} : listeners)}
      >
        <KanbanCardSurface
          card={card}
          labels={labels}
          completed={completed}
          selected={selected}
          collaborators={collaborators}
        />
      </button>
    </KanbanCardContextMenu>
  );
}
