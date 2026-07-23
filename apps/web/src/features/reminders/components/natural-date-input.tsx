import { forwardRef, type InputHTMLAttributes, useState } from "react";

import type { NaturalDateSuggestion } from "@/features/reminders/lib/natural-date";
import { cn } from "@/lib/cn";

type NaturalDateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value"> & {
  value: string;
  suggestion: NaturalDateSuggestion | null;
};

export const NaturalDateInput = forwardRef<HTMLInputElement, NaturalDateInputProps>(
  ({ value, suggestion, className, onScroll, style, ...props }, ref) => {
    const [scrollLeft, setScrollLeft] = useState(0);
    const before = suggestion ? value.slice(0, suggestion.index) : value;
    const match = suggestion?.text ?? "";
    const after = suggestion
      ? value.slice(suggestion.index + suggestion.text.length)
      : "";

    return (
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
        {value ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-[14px] leading-5 font-medium text-foreground"
          >
            <span
              className="inline-block"
              style={{ transform: `translateX(-${scrollLeft}px)` }}
            >
              <span>{before}</span>
              {match ? (
                <span className="rounded-[3px] bg-primary/15 text-primary">{match}</span>
              ) : null}
              <span>{after}</span>
            </span>
          </div>
        ) : null}
        <input
          ref={ref}
          value={value}
          onScroll={(event) => {
            setScrollLeft(event.currentTarget.scrollLeft);
            onScroll?.(event);
          }}
          style={{ fontSize: 14, fontWeight: 500, lineHeight: "20px", ...style }}
          className={cn(
            "absolute inset-0 z-10 h-5 w-full min-w-0 bg-transparent text-[14px] leading-5 font-medium text-transparent caret-foreground outline-none selection:bg-primary/20 placeholder:text-muted-foreground/70",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

NaturalDateInput.displayName = "NaturalDateInput";
