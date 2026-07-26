import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "role"
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({
  checked,
  className,
  disabled,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full bg-muted-foreground/25 outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] active:scale-[.96] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-colors motion-reduce:active:scale-100",
        checked && "bg-primary",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none",
          checked && "translate-x-4",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
