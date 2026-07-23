import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Formula1Inspector } from "@/features/formula1/components/formula1-inspector";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";
import { useMediaQuery } from "@/hooks/use-media-query";

export function Formula1DetailsDialog() {
  const { selectedRaceRound, setSelectedRaceRound } = useFormula1();
  const usesDialog = useMediaQuery("(max-width: 1279px)");

  if (!usesDialog) return null;

  return (
    <Dialog
      open={selectedRaceRound !== null}
      onOpenChange={(open) => {
        if (!open) setSelectedRaceRound(null);
      }}
    >
      <DialogContent
        showClose={false}
        className="top-0 right-0 bottom-0 left-auto h-dvh w-[min(100%,410px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:translate-x-full data-[state=closed]:scale-100 sm:rounded-l-2xl"
      >
        <DialogTitle className="sr-only">Race details</DialogTitle>
        <DialogDescription className="sr-only">
          Formula 1 race weekend schedule and result.
        </DialogDescription>
        <Formula1Inspector className="w-full border-l-0" />
      </DialogContent>
    </Dialog>
  );
}
