import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NoteInspector } from "@/features/notes/components/note-inspector";
import { useNotes } from "@/features/notes/model/notes-provider";
import { useMediaQuery } from "@/hooks/use-media-query";

export function NoteDetailsDialog() {
  const { selectedNoteId, setSelectedNoteId } = useNotes();
  const usesDialog = useMediaQuery("(max-width: 1279px)");

  if (!usesDialog) return null;

  return (
    <Dialog
      open={Boolean(selectedNoteId)}
      onOpenChange={(open) => {
        if (!open) setSelectedNoteId(null);
      }}
    >
      <DialogContent
        showClose={false}
        className="top-0 right-0 bottom-0 left-auto h-dvh w-[min(100%,720px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:translate-x-full data-[state=closed]:scale-100 sm:rounded-l-2xl"
      >
        <DialogTitle className="sr-only">Note editor</DialogTitle>
        <DialogDescription className="sr-only">
          Edit and preview the selected note.
        </DialogDescription>
        <NoteInspector className="border-l-0" />
      </DialogContent>
    </Dialog>
  );
}
