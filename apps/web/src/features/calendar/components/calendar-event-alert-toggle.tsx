import { BellRing } from "lucide-react";

import { cn } from "@/lib/cn";

type CalendarEventAlertToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function CalendarEventAlertToggle({
  checked,
  onCheckedChange,
  className,
}: CalendarEventAlertToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left outline-none transition-[border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:border-foreground/15 active:scale-[.995] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
        <BellRing className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">Event alerts</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
          30 minutes before and again when it starts
        </span>
      </span>
      <span
        className={cn(
          "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-primary" : "bg-muted-foreground/25",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}
