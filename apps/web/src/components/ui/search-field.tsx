import { Search, X } from "lucide-react";
import {
  forwardRef,
  type ForwardedRef,
  useCallback,
  useRef,
} from "react";

import { cn } from "@/lib/cn";

type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
};

function assignRef(
  ref: ForwardedRef<HTMLInputElement>,
  value: HTMLInputElement | null,
) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { value, onValueChange, label, placeholder = label, className },
    forwardedRef,
  ) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const setInputRef = useCallback(
      (input: HTMLInputElement | null) => {
        inputRef.current = input;
        assignRef(forwardedRef, input);
      },
      [forwardedRef],
    );

    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={setInputRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="h-8 w-full rounded-lg border border-input bg-background pr-8 pl-8 text-[12px] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20"
          aria-label={label}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Clear ${label.toLocaleLowerCase()}`}
          >
            <X className="size-3" />
          </button>
        ) : null}
      </div>
    );
  },
);
