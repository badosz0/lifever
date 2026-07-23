import { Check, ChevronRight, Flag } from "lucide-react";
import {
  memo,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { InlineReminderSchedule } from "@/features/reminders/components/inline-reminder-schedule";
import {
  playReminderCompletionSound,
  prepareReminderCompletionSound,
} from "@/features/reminders/lib/completion-sound";
import type { Reminder } from "@/features/reminders/model/types";
import { cn } from "@/lib/cn";

type ReminderRowProps = {
  reminder: Reminder;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Reminder>) => void;
};

type InlineReminderTextProps = {
  value: string;
  placeholder?: string;
  ariaLabel: string;
  variant: "title" | "notes";
  completed?: boolean;
  onFocus: () => void;
  onCommit: (value: string) => void;
};

const resizeTextarea = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = "0px";
  element.style.height = `${element.scrollHeight}px`;
};

function InlineReminderText({
  value,
  placeholder,
  ariaLabel,
  variant,
  completed,
  onFocus,
  onCommit,
}: InlineReminderTextProps) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value), [value]);
  useLayoutEffect(() => resizeTextarea(textareaRef.current), [draft]);

  const commit = (rawValue: string) => {
    const nextValue = rawValue.trim();
    if (variant === "title" && !nextValue) {
      setDraft(value);
      return;
    }

    setDraft(nextValue);
    if (nextValue !== value) onCommit(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value);
      event.currentTarget.value = value;
      event.currentTarget.blur();
    }
  };

  const textStyle =
    variant === "title"
      ? {
          fontSize: 14,
          fontWeight: 500,
          lineHeight: "20px",
          letterSpacing: "-0.005em",
        }
      : { fontSize: 12, fontWeight: 400, lineHeight: "16px" };

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck
      style={textStyle}
      onFocus={onFocus}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "block min-h-0 w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none focus:ring-0",
        variant === "title"
          ? "text-foreground"
          : "mt-0.5 text-muted-foreground placeholder:text-muted-foreground/55",
        completed && variant === "title" &&
          "line-through decoration-muted-foreground/55",
      )}
    />
  );
}

export const ReminderRow = memo(function ReminderRow({
  reminder,
  selected,
  onSelect,
  onUpdate,
}: ReminderRowProps) {
  const completed = Boolean(reminder.completedAt);

  const toggleCompleted = () => {
    const nextCompletedAt = completed ? null : new Date().toISOString();

    if (!completed) {
      playReminderCompletionSound();
    }

    onUpdate(reminder.id, { completedAt: nextCompletedAt });

    if (!completed) {
      toast.success("Reminder completed", {
        description: reminder.title,
        action: {
          label: "Undo",
          onClick: () => onUpdate(reminder.id, { completedAt: null }),
        },
      });
    }
  };

  return (
    <div
      onClick={() => onSelect(reminder.id)}
      className={cn(
        "group relative flex min-h-[54px] items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-150",
        selected ? "bg-primary/[.08]" : "hover:bg-muted/65",
        completed && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleCompleted();
        }}
        onPointerDown={() => {
          if (!completed) prepareReminderCompletionSound();
        }}
        onKeyDown={(event) => {
          if (
            !completed &&
            (event.key === "Enter" || event.key === " ")
          ) {
            prepareReminderCompletionSound();
          }
        }}
        className={cn(
          "mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border-[1.5px] outline-none transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-90 motion-reduce:transition-colors motion-reduce:active:scale-100",
          completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/45 bg-background group-hover:border-primary/70",
        )}
        aria-label={completed ? `Mark ${reminder.title} incomplete` : `Complete ${reminder.title}`}
      >
        <Check
          className={cn(
            "size-3 transition-[opacity,transform] duration-150",
            completed ? "scale-100 opacity-100" : "scale-75 opacity-0",
          )}
          strokeWidth={3}
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <InlineReminderText
            value={reminder.title}
            variant="title"
            completed={completed}
            ariaLabel={`Edit title: ${reminder.title}`}
            onFocus={() => onSelect(reminder.id)}
            onCommit={(title) => onUpdate(reminder.id, { title })}
          />
          {reminder.important ? (
            <Flag className="mt-0.5 size-3.5 shrink-0 fill-orange-500 text-orange-500" aria-label="Important" />
          ) : null}
        </div>

        {reminder.notes || selected ? (
          <InlineReminderText
            value={reminder.notes}
            variant="notes"
            placeholder="Add notes"
            ariaLabel={`Edit notes for ${reminder.title}`}
            onFocus={() => onSelect(reminder.id)}
            onCommit={(notes) => onUpdate(reminder.id, { notes })}
          />
        ) : null}

        {reminder.dueAt || selected ? (
          <div className="mt-1">
            <InlineReminderSchedule
              value={reminder.dueAt}
              title={reminder.title}
              completed={completed}
              onSelect={() => onSelect(reminder.id)}
              onChange={(dueAt) => onUpdate(reminder.id, { dueAt })}
            />
          </div>
        ) : null}
      </div>

      <ChevronRight
        className={cn(
          "mt-0.5 size-4 shrink-0 text-muted-foreground/45 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      />
    </div>
  );
});
