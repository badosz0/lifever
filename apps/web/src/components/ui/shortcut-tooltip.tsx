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
  const isApplePlatform =
    typeof navigator === "undefined" ||
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const localizedShortcut = shortcut.map((key) => {
    if (key === "⌘") return isApplePlatform ? key : "Ctrl";
    if (key === "⌫") return isApplePlatform ? key : "Backspace";
    return key;
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="flex items-center gap-2 py-1.5 pr-1.5 pl-2.5">
        <span>{label}</span>
        <span
          className="flex items-center gap-0.5"
          aria-label={localizedShortcut.join(" ")}
        >
          {localizedShortcut.map((key, index) => (
            <kbd
              key={`${key}-${index}`}
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
