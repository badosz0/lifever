import { ColorPicker } from "@/components/ui/color-picker";
import {
  calendarColorPresets,
} from "@/features/calendar/lib/categories";

type CategoryColorPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
};

export function CategoryColorPicker({
  value,
  onValueChange,
  ariaLabel = "Choose category color",
}: CategoryColorPickerProps) {
  return (
    <ColorPicker
      value={value}
      onValueChange={onValueChange}
      presets={calendarColorPresets}
      ariaLabel={ariaLabel}
    />
  );
}
