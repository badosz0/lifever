import { ChevronDown } from "lucide-react";
import type { PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

type ReminderSectionProps = PropsWithChildren<{
  title: string;
  count: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  showHeader?: boolean;
  tone?: "default" | "danger";
}>;

export function ReminderSection({
  title,
  count,
  collapsible = false,
  collapsed = false,
  onToggle,
  showHeader = true,
  tone = "default",
  children,
}: ReminderSectionProps) {
  if (count === 0) return null;

  const headingId = `section-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <section
      className="mb-6"
      aria-label={showHeader ? undefined : title}
      aria-labelledby={showHeader ? headingId : undefined}
    >
      {showHeader ? (
        <button
          type="button"
          disabled={!collapsible}
          onClick={onToggle}
          className={cn(
            "mb-1.5 flex h-7 w-full items-center gap-1.5 px-2 text-left text-[12px] font-semibold tracking-wide outline-none",
            tone === "danger" ? "text-destructive" : "text-muted-foreground",
            collapsible && "rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {collapsible ? (
            <ChevronDown
              className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")}
            />
          ) : null}
          <span id={headingId}>{title}</span>
          <span className="font-medium tabular-nums opacity-70">{count}</span>
        </button>
      ) : null}
      {collapsed ? null : <div className="space-y-0.5">{children}</div>}
    </section>
  );
}
