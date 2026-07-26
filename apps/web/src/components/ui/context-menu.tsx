import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function ContextMenu({
  modal = false,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root modal={modal} {...props} />;
}

export function ContextMenuTrigger({
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger
      {...props}
      data-lifever-context-menu-trigger=""
    />
  );
}

export function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "z-50 min-w-44 origin-[var(--radix-context-menu-content-transform-origin)] rounded-xl border border-border/70 bg-popover/96 p-1.5 text-popover-foreground shadow-[0_12px_40px_rgba(0,0,0,.16)] backdrop-blur-xl transition-[opacity,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] data-[state=closed]:scale-[.97] data-[state=closed]:opacity-0",
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Item>) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "relative flex h-8 cursor-default select-none items-center gap-2 rounded-lg px-2.5 text-[13px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("-mx-0.5 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
