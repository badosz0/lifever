import { Check } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import {
  formatUserTime,
  type TimeFormatPreference,
} from "@/lib/date-time-format";

type TimePickerProps = {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  minuteStep?: 15 | 30;
  timeFormat?: TimeFormatPreference;
};

type TimeOption = {
  label: string;
  value: string;
};

const formatTimeValue = (
  value: string,
  timeFormat: TimeFormatPreference,
) => {
  const [hour, minute] = value.split(":").map(Number);
  return formatUserTime(new Date(2000, 0, 1, hour, minute), timeFormat);
};

const parseTimeValue = (input: string) => {
  const normalized = input.trim().toLowerCase().replaceAll(".", "");
  const compactMatch = normalized.match(/^(\d{3,4})\s*(am|pm)?$/);
  const regularMatch = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);

  const hourText = compactMatch
    ? compactMatch[1]?.slice(0, -2)
    : regularMatch?.[1];
  const minuteText = compactMatch
    ? compactMatch[1]?.slice(-2)
    : regularMatch?.[2] ?? "0";
  const meridiem = compactMatch?.[2] ?? regularMatch?.[3];

  if (!hourText || !minuteText) return null;

  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "am") hour = hour === 12 ? 0 : hour;
    if (meridiem === "pm") hour = hour === 12 ? 12 : hour + 12;
  } else if (hour > 23) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const createTimeOptions = (
  minuteStep: 15 | 30,
  timeFormat: TimeFormatPreference,
): TimeOption[] =>
  Array.from({ length: (24 * 60) / minuteStep }, (_, index) => {
    const totalMinutes = index * minuteStep;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    return { label: formatTimeValue(value, timeFormat), value };
  });

const getInitialOptionIndex = (
  value: string | undefined,
  options: TimeOption[],
  minuteStep: 15 | 30,
) => {
  const selectedIndex = value
    ? options.findIndex((option) => option.value === value)
    : -1;
  if (selectedIndex >= 0) return selectedIndex;

  if (value) {
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isInteger(hours) && Number.isInteger(minutes)) {
      return Math.min(
        options.length - 1,
        Math.round(((hours ?? 0) * 60 + (minutes ?? 0)) / minuteStep),
      );
    }
  }

  const now = new Date();
  return (
    Math.ceil((now.getHours() * 60 + now.getMinutes()) / minuteStep) %
    options.length
  );
};

export function TimePicker({
  id,
  value,
  onValueChange,
  disabled,
  className,
  placeholder = "Add time",
  ariaLabel = "Time",
  minuteStep = 30,
  timeFormat = "system",
}: TimePickerProps) {
  const timeOptions = useMemo(
    () => createTimeOptions(minuteStep, timeFormat),
    [minuteStep, timeFormat],
  );
  const formattedValue = value ? formatTimeValue(value, timeFormat) : "";
  const [draft, setDraft] = useState(formattedValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    getInitialOptionIndex(value, timeOptions, minuteStep),
  );
  const activeOptionRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const optionIds = useMemo(
    () => timeOptions.map((option) => `${listboxId}-${option.value.replace(":", "")}`),
    [listboxId, timeOptions],
  );

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      activeOptionRef.current?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (open) activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const openOptions = () => {
    setActiveIndex(getInitialOptionIndex(value, timeOptions, minuteStep));
    setOpen(true);
  };

  const chooseOption = (index: number) => {
    const option = timeOptions[index];
    if (!option) return;

    setDraft(option.label);
    onValueChange(option.value);
    setOpen(false);
  };

  const commitDraft = () => {
    const nextValue = parseTimeValue(draft);
    if (!nextValue) {
      setDraft(formattedValue);
      return false;
    }

    onValueChange(nextValue);
    setDraft(formatTimeValue(nextValue, timeFormat));
    return true;
  };

  const moveActiveOption = (event: KeyboardEvent<HTMLInputElement>, offset: number) => {
    event.preventDefault();

    if (!open) {
      openOptions();
      return;
    }

    const parsedDraft = parseTimeValue(draft);
    const activeValue = timeOptions[activeIndex]?.value;
    let nextIndex: number;

    if (parsedDraft && parsedDraft !== activeValue) {
      const [hours, minutes] = parsedDraft.split(":").map(Number);
      const optionPosition =
        ((hours ?? 0) * 60 + (minutes ?? 0)) / minuteStep;
      nextIndex = offset > 0 ? Math.ceil(optionPosition) : Math.floor(optionPosition);
      nextIndex = Math.max(0, Math.min(timeOptions.length - 1, nextIndex));
    } else {
      nextIndex = (activeIndex + offset + timeOptions.length) % timeOptions.length;
    }

    setActiveIndex(nextIndex);
    setDraft(timeOptions[nextIndex]?.label ?? draft);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          type="text"
          role="combobox"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-activedescendant={open ? optionIds[activeIndex] : undefined}
          onChange={(event) => {
            const nextDraft = event.target.value;
            const parsedDraft = parseTimeValue(nextDraft);
            setDraft(nextDraft);
            if (parsedDraft) {
              setActiveIndex(
                getInitialOptionIndex(parsedDraft, timeOptions, minuteStep),
              );
            }
            if (!open) setOpen(true);
          }}
          onClick={() => {
            if (!open) openOptions();
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") moveActiveOption(event, 1);
            if (event.key === "ArrowUp") moveActiveOption(event, -1);
            if (event.key === "Enter") {
              event.preventDefault();
              if (commitDraft()) setOpen(false);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(formattedValue);
              setOpen(false);
            }
          }}
          className={cn(
            "h-8 w-[112px] cursor-text border-0 bg-transparent px-2 text-right text-[12px] leading-4 font-normal tabular-nums text-muted-foreground shadow-none focus:border-transparent focus:ring-0 disabled:bg-transparent",
            className,
          )}
        />
      </PopoverAnchor>

      <PopoverContent
        id={listboxId}
        role="listbox"
        align="end"
        sideOffset={2}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-[132px] overflow-hidden rounded-[10px] p-1 shadow-[0_12px_34px_rgba(0,0,0,.16)]"
      >
        <div className="max-h-56 overflow-y-auto overscroll-contain py-0.5">
          {timeOptions.map((option, index) => {
            const selected = value === option.value;
            const active = activeIndex === index;

            return (
              <button
                ref={active ? activeOptionRef : undefined}
                id={optionIds[index]}
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActiveIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(index)}
                className={cn(
                  "flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-[12px] font-normal tabular-nums text-popover-foreground outline-none transition-colors duration-100 motion-reduce:transition-none",
                  active && "bg-accent text-accent-foreground",
                )}
              >
                <span>{option.label}</span>
                <Check
                  aria-hidden="true"
                  className={cn("size-3.5 text-blue-500", !selected && "invisible")}
                />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
