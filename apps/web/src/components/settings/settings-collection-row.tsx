import { Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  type ColorPickerPreset,
} from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";

export function SettingsCollectionRow({
  name,
  color,
  presets,
  onNameChange,
  onColorChange,
  onDelete,
  canDelete = true,
  autoFocus = false,
  disabled = false,
  detail,
  children,
  maxLength = 40,
}: {
  name: string;
  color: string;
  presets: ColorPickerPreset[];
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  canDelete?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  detail?: string;
  children?: ReactNode;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const commit = () => {
    const next = draft.trim();
    if (!next) setDraft(name);
    else if (next !== name) onNameChange(next);
  };
  return (
    <div className="flex min-h-[76px] items-center gap-3 px-3 py-3 sm:px-4">
      <ColorPicker
        value={color}
        presets={presets}
        onValueChange={onColorChange}
        ariaLabel={`Choose color for ${name}`}
        disabled={disabled}
      />
      <div className="min-w-0 flex-1">
        <Input
          value={draft}
          data-settings-draft={draft !== name || undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setDraft(name);
            }
          }}
          autoFocus={autoFocus}
          disabled={disabled}
          maxLength={maxLength}
          aria-label={`${name} name`}
          className="h-9 border-transparent bg-transparent px-2 text-sm font-medium shadow-none hover:border-input focus:bg-background"
        />
        {detail ? (
          <p className="px-2 text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      {children}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || !canDelete}
        onClick={onDelete}
        aria-label={`Delete ${name}`}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
