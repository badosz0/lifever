import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function TooltipProvider({ delayDuration = 450, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={100} {...props} />;
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 origin-[var(--radix-tooltip-content-transform-origin)] rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-md transition-[opacity,transform] duration-125 data-[state=closed]:scale-[.97] data-[state=closed]:opacity-0",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

