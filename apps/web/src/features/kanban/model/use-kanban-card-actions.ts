import { toast } from "sonner";

import { useKanban } from "@/features/kanban/model/kanban-provider";

export function useKanbanCardActions() {
  const { removeCard, restoreCard, setSelectedCardId } = useKanban();

  const deleteKanbanCard = (id: string) => {
    const removed = removeCard(id);
    if (!removed) return;
    toast("Card deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          restoreCard(removed);
          setSelectedCardId(removed.id);
        },
      },
    });
  };

  return { deleteKanbanCard };
}
