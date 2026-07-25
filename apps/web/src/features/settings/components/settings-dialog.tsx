import {
  CalendarDays,
  Clock3,
  Laptop,
  Mail,
  Moon,
  RotateCcw,
  Settings2,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { resetDemoData } from "@/features/settings/lib/demo-data";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { authClient } from "@/lib/auth-client";
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
  const { data: session, isPending } = authClient.useSession();
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat, setTimeFormat, timeFormat } =
    useUserPreferences();
  const accountName = session?.user.name ?? "Local profile";
  const accountDetail =
    session?.user.email ??
    (session ? "Signed in with Discord" : "Data is stored on this device");
  const AccountIcon = session ? Mail : Laptop;

  const confirmReset = () => {
    resetDemoData();
    setResetConfirmationOpen(false);
    toast.success("Demo data restored", {
      description: "Reminders, Calendar, Kanban, and Notes are back to their examples.",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[540px] flex-col overflow-hidden p-0">
        <div className="border-b border-border/60 px-5 pt-5 pb-4">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="size-[18px]" />
          </div>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="mt-1">
            Personalize how Lifever looks and formats your schedule.
          </DialogDescription>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
          {!isPending ? (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-muted-foreground">
                Account
              </legend>
              <div className="flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-card px-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <AccountIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {accountName}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {accountDetail}
                  </p>
                </div>
              </div>
            </fieldset>
          ) : null}

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

          {!isPending && !session ? (
            <div className="overflow-hidden rounded-xl border border-destructive/20 bg-card">
              <button
                type="button"
                className="flex min-h-16 w-full items-center gap-3 px-3 text-left outline-none transition-colors hover:bg-destructive/[0.045] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                onClick={() => setResetConfirmationOpen(true)}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <RotateCcw className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">Reset demo data</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    Replace local reminders, events, boards, and notes with the original examples.
                  </p>
                </div>
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          <p className="text-[10px] text-muted-foreground">
            {session
              ? "Your account data syncs through Lifever."
              : "Demo data and preferences are stored on this device."}
          </p>
          <DialogClose asChild>
            <Button size="sm">Done</Button>
          </DialogClose>
        </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetConfirmationOpen}
        onOpenChange={setResetConfirmationOpen}
      >
        <DialogContent className="max-w-[420px] p-0">
          <div className="px-5 pt-5 pb-4">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-[18px]" />
            </div>
            <DialogTitle>Reset all demo data?</DialogTitle>
            <DialogDescription className="mt-1 leading-5">
              This permanently replaces your local reminders, calendar events,
              kanban projects, and notes with the original demo content.
            </DialogDescription>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" size="sm" onClick={confirmReset}>
              Reset demo data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
