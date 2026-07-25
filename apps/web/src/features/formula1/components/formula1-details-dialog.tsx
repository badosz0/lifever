import { ResponsiveDetailsDialog } from "@/components/app-shell/responsive-details-dialog";
import { Formula1Inspector } from "@/features/formula1/components/formula1-inspector";
import { useFormula1 } from "@/features/formula1/model/formula1-provider";

export function Formula1DetailsDialog() {
  const { selectedRaceRound, setSelectedRaceRound } = useFormula1();

  return (
    <ResponsiveDetailsDialog
      open={selectedRaceRound !== null}
      onOpenChange={(open) => {
        if (!open) setSelectedRaceRound(null);
      }}
      title="Race details"
      description="Formula 1 race weekend schedule and result."
      className="w-[min(100%,410px)]"
    >
      <Formula1Inspector className="w-full border-l-0" />
    </ResponsiveDetailsDialog>
  );
}
