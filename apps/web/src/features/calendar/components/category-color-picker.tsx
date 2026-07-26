import { ColorPicker } from "@/components/ui/color-picker";
import type { ColorPickerPreset } from "@/components/ui/color-picker";
import { calendarColorPresets } from "@/features/calendar/lib/categories";

type CategoryColorPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  presets?: ColorPickerPreset[];
  disabled?: boolean;
};

export function CategoryColorPicker({
  value,
  onValueChange,
  ariaLabel = "Choose category color",
  presets = calendarColorPresets,
  disabled = false,
}: CategoryColorPickerProps) {
  return (
    <ColorPicker
      value={value}
      onValueChange={onValueChange}
      presets={presets}
      ariaLabel={ariaLabel}
      disabled={disabled}
    />
  );
}
