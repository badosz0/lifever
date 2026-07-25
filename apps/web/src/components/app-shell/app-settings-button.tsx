import { Settings2 } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type AppSettingsButtonProps = Omit<
  ComponentProps<typeof Button>,
  "aria-label" | "children" | "size" | "variant"
> & {
  label: string;
};

export function AppSettingsButton({
  className,
  label,
  title = label,
  ...props
}: AppSettingsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("size-7 text-muted-foreground", className)}
      aria-label={label}
      title={title}
      {...props}
    >
      <Settings2 className="size-[17px]" />
    </Button>
  );
}
