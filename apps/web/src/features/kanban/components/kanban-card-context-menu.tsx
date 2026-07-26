import { Trash2 } from "lucide-react";
import type { ReactElement } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { KanbanCard } from "@/features/kanban/model/types";
import { useKanbanCardActions } from "@/features/kanban/model/use-kanban-card-actions";

type KanbanCardContextMenuProps = {
  card: KanbanCard;
  children: ReactElement;
  disabled?: boolean;
};

export function KanbanCardContextMenu({
  card,
  children,
  disabled = false,
}: KanbanCardContextMenuProps) {
  const { deleteKanbanCard } = useKanbanCardActions();

  if (disabled) return children;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-40">
        <ContextMenuItem
          className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          onSelect={() => deleteKanbanCard(card.id)}
        >
          <Trash2 className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
