import { CalendarClock, Circle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { NaturalDateInput } from "@/features/reminders/components/natural-date-input";
import {
  parseNaturalDate,
  removeNaturalDate,
  type NaturalDateSuggestion,
} from "@/features/reminders/lib/natural-date";
import { useReminders } from "@/features/reminders/model/reminders-provider";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";

type NewReminderComposerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewReminderComposer({ open, onOpenChange }: NewReminderComposerProps) {
  const { activeView, addReminder, setActiveView, setSelectedReminderId } = useReminders();
  const { dateFormat, timeFormat } = useUserPreferences();
  const [title, setTitle] = useState("");
  const [ignoredSuggestionKey, setIgnoredSuggestionKey] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{
    input: string;
    suggestion: NaturalDateSuggestion | null;
  }>({ input: "", suggestion: null });
  const inputRef = useRef<HTMLInputElement>(null);
  const parsedSuggestion = parsed.input === title ? parsed.suggestion : null;
  const suggestion =
    parsedSuggestion?.key === ignoredSuggestionKey ? null : parsedSuggestion;

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open || title.trim().length < 2) return;

    let cancelled = false;
    const input = title;
    const timeout = window.setTimeout(() => {
      void parseNaturalDate(input, { dateFormat, timeFormat }).then(
        (nextSuggestion) => {
          if (!cancelled) setParsed({ input, suggestion: nextSuggestion });
        },
        () => {
          if (!cancelled) setParsed({ input, suggestion: null });
        },
      );
    }, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [dateFormat, open, timeFormat, title]);

  if (!open) return null;

  const save = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const titleWithoutDate = suggestion
      ? removeNaturalDate(title, suggestion)
      : cleanTitle;

    const reminder = addReminder({
      title: titleWithoutDate || cleanTitle,
      dueAt: suggestion?.dueAt ?? null,
    });
    if (activeView === "completed") setActiveView("all");
    setTitle("");
    setIgnoredSuggestionKey(null);
    setSelectedReminderId(reminder.id);
  };

  const cancel = () => {
    setTitle("");
    setIgnoredSuggestionKey(null);
    onOpenChange(false);
  };

  return (
    <div className="mb-5 rounded-xl bg-primary/[.06] px-2 py-2.5 ring-1 ring-primary/15">
      <div className="flex min-h-5 items-start gap-3">
        <Circle className="mt-0.5 size-[19px] shrink-0 text-primary/55" strokeWidth={1.7} />
        <NaturalDateInput
          ref={inputRef}
          value={title}
          maxLength={240}
          suggestion={suggestion}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) save();
            if (event.key === "Escape") cancel();
          }}
          onBlur={() => {
            if (!title.trim()) onOpenChange(false);
          }}
          placeholder="What do you want to remember?"
          aria-label="New reminder title"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mt-1 -mr-1 size-7 text-muted-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={cancel}
          aria-label="Cancel new reminder"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {suggestion ? (
        <div className="mt-2 ml-8 flex items-center" role="status" aria-live="polite">
          <div className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-lg bg-primary/10 px-2 text-xs font-medium text-primary ring-1 ring-primary/15">
            <CalendarClock className="size-3.5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{suggestion.label}</span>
            <button
              type="button"
              className="-mr-1 flex size-5 shrink-0 items-center justify-center rounded-md text-primary/65 outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIgnoredSuggestionKey(suggestion.key)}
              aria-label={`Remove suggested date ${suggestion.label}`}
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
