import { CalendarDays, Clock3, Laptop, Moon, Settings2, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import {
  formatUserDate,
  formatUserTime,
  type DateFormatPreference,
  type TimeFormatPreference,
} from "@/lib/date-time-format";
import { cn } from "@/lib/cn";
import { useTheme, type Theme } from "@/providers/theme-provider";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const themes: Array<{
  id: Theme;
  label: string;
  icon: typeof Laptop;
}> = [
  { id: "system", label: "System", icon: Laptop },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

const previewDate = new Date(2026, 6, 23, 21, 41);

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat, setTimeFormat, timeFormat } =
    useUserPreferences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] overflow-hidden p-0">
        <div className="border-b border-border/60 px-5 pt-5 pb-4">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="size-[18px]" />
          </div>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="mt-1">
            Personalize how Lifever looks and formats your schedule.
          </DialogDescription>
        </div>

        <div className="space-y-4 px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-muted-foreground">
              Theme
            </legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
              {themes.map((option) => {
                const Icon = option.icon;
                const selected = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(option.id)}
                    className={cn(
                      "flex h-16 flex-col items-start justify-between rounded-xl border bg-card px-3 py-2.5 text-left outline-none transition-[border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100",
                      selected
                        ? "border-primary/45 ring-2 ring-primary/15"
                        : "border-border hover:border-border/90",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        selected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="text-[12px] font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="flex min-h-14 items-center gap-3 border-b border-border/60 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <Clock3 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Time format</p>
                <p className="text-[10px] text-muted-foreground">Used by reminders and events</p>
              </div>
              <Select
                value={timeFormat}
                onValueChange={(value) =>
                  setTimeFormat(value as TimeFormatPreference)
                }
              >
                <SelectTrigger className="h-8 w-[156px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System default</SelectItem>
                  <SelectItem value="12-hour">12-hour</SelectItem>
                  <SelectItem value="24-hour">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-h-14 items-center gap-3 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <CalendarDays className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Date format</p>
                <p className="text-[10px] text-muted-foreground">Controls displayed date order</p>
              </div>
              <Select
                value={dateFormat}
                onValueChange={(value) =>
                  setDateFormat(value as DateFormatPreference)
                }
              >
                <SelectTrigger className="h-8 w-[156px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System default</SelectItem>
                  <SelectItem value="month-day-year">MM/DD/YYYY</SelectItem>
                  <SelectItem value="day-month-year">DD/MM/YYYY</SelectItem>
                  <SelectItem value="year-month-day">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="text-[9px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              Preview
            </p>
            <p className="mt-1 text-[13px] font-semibold tabular-nums">
              {formatUserDate(previewDate, dateFormat)}
              <span className="mx-1.5 text-muted-foreground/55">·</span>
              {formatUserTime(previewDate, timeFormat)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          <p className="text-[10px] text-muted-foreground">
            Changes are saved automatically on this device.
          </p>
          <DialogClose asChild>
            <Button size="sm">Done</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
