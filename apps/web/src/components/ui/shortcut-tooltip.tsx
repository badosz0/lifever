import type { ReactElement } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ShortcutTooltipProps = {
  label: string;
  shortcut: readonly string[];
  children: ReactElement;
};

export function ShortcutTooltip({
  label,
  shortcut,
  children,
}: ShortcutTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="flex items-center gap-2 py-1.5 pr-1.5 pl-2.5">
        <span>{label}</span>
        <span className="flex items-center gap-0.5" aria-label={shortcut.join(" ")}>
          {shortcut.map((key) => (
            <kbd
              key={key}
              className="flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-background/15 px-1 font-sans text-[10px] leading-none font-semibold text-background ring-1 ring-background/20"
            >
              {key}
            </kbd>
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
