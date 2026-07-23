import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

import { usePortalContainer } from "@/components/ui/portal-container";
import { cn } from "@/lib/cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  const portalContainer = usePortalContainer();

  return (
    <PopoverPrimitive.Portal container={portalContainer?.current}>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-[var(--radix-popover-content-transform-origin)] rounded-xl border border-border/70 bg-popover/96 p-4 text-popover-foreground shadow-[0_14px_42px_rgba(0,0,0,.18)] outline-none backdrop-blur-xl transition-[opacity,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] data-[state=closed]:scale-[.97] data-[state=closed]:opacity-0 motion-reduce:transition-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
