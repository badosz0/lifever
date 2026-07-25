import { ResponsiveDetailsDialog } from "@/components/app-shell/responsive-details-dialog";
import { KanbanInspector } from "@/features/kanban/components/kanban-inspector";
import { useKanban } from "@/features/kanban/model/kanban-provider";

export function KanbanDetailsDialog() {
  const { selectedCardId, setSelectedCardId } = useKanban();

  return (
    <ResponsiveDetailsDialog
      open={Boolean(selectedCardId)}
      onOpenChange={(open) => {
        if (!open) setSelectedCardId(null);
      }}
      title="Card details"
      description="Edit the selected Kanban card."
      className="w-[min(100%,420px)]"
    >
      <KanbanInspector className="w-full border-l-0" />
    </ResponsiveDetailsDialog>
  );
}
