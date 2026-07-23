import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyRemindersProps = {
  onCreate?: () => void;
  view?: "active" | "completed";
};

export function EmptyReminders({
  onCreate,
  view = "active",
}: EmptyRemindersProps) {
  const completed = view === "completed";

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center px-6 py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CheckCircle2 className="size-5" />
      </div>
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
        {completed ? "Nothing completed yet" : "Nothing here yet"}
      </h2>
      <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
        {completed
          ? "Finished reminders will appear here."
          : "A little space for whatever you don't want to forget."}
      </p>
      {onCreate ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={onCreate}
        >
          Add a reminder
        </Button>
      ) : null}
    </div>
  );
}
