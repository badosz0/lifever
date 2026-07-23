import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { KanbanInspector } from "@/features/kanban/components/kanban-inspector";
import { useKanban } from "@/features/kanban/model/kanban-provider";
import { useMediaQuery } from "@/hooks/use-media-query";

export function KanbanDetailsDialog() {
  const { selectedCardId, setSelectedCardId } = useKanban();
  const usesDialog = useMediaQuery("(max-width: 1279px)");

  if (!usesDialog) return null;

  return (
    <Dialog
      open={Boolean(selectedCardId)}
      onOpenChange={(open) => {
        if (!open) setSelectedCardId(null);
      }}
    >
      <DialogContent
        showClose={false}
        className="top-0 right-0 bottom-0 left-auto h-dvh w-[min(100%,420px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:translate-x-full data-[state=closed]:scale-100 sm:rounded-l-2xl"
      >
        <DialogTitle className="sr-only">Card details</DialogTitle>
        <DialogDescription className="sr-only">
          Edit the selected Kanban card.
        </DialogDescription>
        <KanbanInspector className="w-full border-l-0" />
      </DialogContent>
    </Dialog>
  );
}
