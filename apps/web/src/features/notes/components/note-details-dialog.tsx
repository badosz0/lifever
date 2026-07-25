import { ResponsiveDetailsDialog } from "@/components/app-shell/responsive-details-dialog";
import { NoteInspector } from "@/features/notes/components/note-inspector";
import { useNotes } from "@/features/notes/model/notes-provider";

export function NoteDetailsDialog() {
  const { selectedNoteId, setSelectedNoteId } = useNotes();

  return (
    <ResponsiveDetailsDialog
      open={Boolean(selectedNoteId)}
      onOpenChange={(open) => {
        if (!open) setSelectedNoteId(null);
      }}
      title="Note editor"
      description="Edit and preview the selected note."
      className="w-[min(100%,720px)]"
    >
      <NoteInspector className="border-l-0" />
    </ResponsiveDetailsDialog>
  );
}
