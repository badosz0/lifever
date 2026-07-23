import { Check, Pipette } from "lucide-react";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

export type ColorPickerPreset = {
  color: string;
  label: string;
};

type ColorPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  presets: ColorPickerPreset[];
  ariaLabel?: string;
};

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export function ColorPicker({
  value,
  onValueChange,
  presets,
  ariaLabel = "Choose color",
}: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);
  const [hexInput, setHexInput] = useState(value.toUpperCase());

  useEffect(() => {
    setCustomColor(value);
    setHexInput(value.toUpperCase());
  }, [value]);

  const commitColor = (color: string) => {
    const normalizedColor = color.toLowerCase();
    if (!isHexColor(normalizedColor)) return;
    setCustomColor(normalizedColor);
    setHexInput(normalizedColor.toUpperCase());
    onValueChange(normalizedColor);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-input bg-background outline-none transition-[border-color,box-shadow,transform] duration-150 hover:border-foreground/25 active:scale-[.94] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          aria-label={ariaLabel}
        >
          <span
            className="size-4 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.1)]"
            style={{ backgroundColor: value }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="w-[284px] bg-popover p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Suggested colors
          </p>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            <span
              className="size-2.5 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.1)]"
              style={{ backgroundColor: customColor }}
            />
            {customColor}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {presets.map((preset) => {
            const selected = value.toLowerCase() === preset.color.toLowerCase();
            return (
              <button
                key={preset.color}
                type="button"
                onClick={() => commitColor(preset.color)}
                className="flex size-8 items-center justify-center rounded-full outline-none transition-transform duration-150 hover:scale-105 active:scale-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
                style={{ backgroundColor: preset.color }}
                aria-label={preset.label}
                aria-pressed={selected}
              >
                <Check
                  className={cn(
                    "size-3.5 text-white drop-shadow-sm transition-opacity",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                  strokeWidth={3}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-border/65 pt-3">
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Pipette className="size-3" />
            Custom color
          </div>
          <HexColorPicker
            color={customColor}
            onChange={(color) => {
              setCustomColor(color);
              setHexInput(color.toUpperCase());
            }}
            onChangeEnd={commitColor}
            className="lifever-color-picker"
          />

          <div className="mt-3 flex items-center gap-2">
            <span
              className="size-9 shrink-0 rounded-lg border border-border shadow-[inset_0_0_0_1px_rgb(0_0_0/.06)]"
              style={{ backgroundColor: customColor }}
              aria-hidden="true"
            />
            <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-input bg-background px-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
              <input
                value={hexInput}
                onChange={(event) => {
                  const nextValue = `#${event.target.value
                    .replace(/[^0-9a-f]/gi, "")
                    .slice(0, 6)}`.toUpperCase();
                  setHexInput(nextValue);
                  if (isHexColor(nextValue)) commitColor(nextValue);
                }}
                onBlur={() => {
                  if (!isHexColor(hexInput)) setHexInput(value.toUpperCase());
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setHexInput(value.toUpperCase());
                    event.currentTarget.blur();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold tracking-[0.04em] text-foreground uppercase outline-none"
                aria-label="Custom hex color"
                inputMode="text"
                spellCheck={false}
              />
              <span className="text-[9px] font-medium text-muted-foreground">
                HEX
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
