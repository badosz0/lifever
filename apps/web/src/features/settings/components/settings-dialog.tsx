import {
  CalendarDays,
  Check,
  Laptop,
  Mail,
  Moon,
  Palette,
  Settings2,
  Sun,
  UserRound,
} from "lucide-react";

import {
  SettingsGroup,
  SettingsModal,
  SettingsRow,
  SettingsSection,
  type SettingsDialogProps,
} from "@/components/settings/settings-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { authClient } from "@/lib/auth-client";
import { isDemoMode } from "@/lib/demo-mode";
import {
  formatUserDate,
  formatUserTime,
  type DateFormatPreference,
  type TimeFormatPreference,
} from "@/lib/date-time-format";
import { cn } from "@/lib/cn";
import { useTheme, type Theme } from "@/providers/theme-provider";

const themes: Array<{ id: Theme; label: string; icon: typeof Laptop }> = [
  { id: "system", label: "System", icon: Laptop },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];
const previewDate = new Date(2026, 6, 23, 21, 41);

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session, isPending } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat, setTimeFormat, timeFormat } =
    useUserPreferences();
  return (
    <SettingsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      description="Appearance, date formats, and your account."
      icon={Settings2}
      pages={[
        {
          id: "appearance",
          label: "Appearance",
          icon: Palette,
          description:
            "Choose a look that feels comfortable throughout your day.",
          content: (
            <SettingsSection
              title="Theme"
              description="System follows your device’s light and dark appearance."
            >
              <div
                className="grid grid-cols-3 gap-3"
                role="radiogroup"
                aria-label="Theme"
              >
                {themes.map(({ id, label, icon: Icon }) => (
                  <label key={id} className="relative min-w-0 cursor-pointer">
                    <input
                      className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
                      type="radio"
                      name="lifever-theme"
                      value={id}
                      checked={theme === id}
                      onChange={() => setTheme(id)}
                    />
                    <span className="block overflow-hidden rounded-2xl border border-border bg-card p-2 outline-none transition-[border-color,box-shadow] duration-150 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/15 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background motion-reduce:transition-none">
                      <span
                        className={cn(
                          "relative mb-3 flex h-24 overflow-hidden rounded-xl border border-black/10 sm:h-32",
                          id === "dark" ? "bg-zinc-900" : "bg-white",
                        )}
                      >
                        {id === "system" ? (
                          <span className="absolute inset-y-0 right-0 w-1/2 bg-zinc-900" />
                        ) : null}
                        <span
                          className={cn(
                            "relative w-1/4 border-r border-black/5",
                            id === "dark" ? "bg-white/5" : "bg-zinc-100",
                          )}
                        />
                        <span className="relative flex flex-1 flex-col gap-2 p-3 sm:p-4">
                          <span className="h-2 w-2/3 rounded-full bg-blue-500/65" />
                          <span
                            className={cn(
                              "h-1.5 rounded-full",
                              id === "dark" ? "bg-white/20" : "bg-zinc-300",
                            )}
                          />
                          <span
                            className={cn(
                              "h-1.5 w-3/4 rounded-full",
                              id === "dark" ? "bg-white/10" : "bg-zinc-200",
                            )}
                          />
                        </span>
                      </span>
                      <span className="flex items-center gap-2 px-1 pb-1 text-xs font-medium sm:text-sm">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        {label}
                        {theme === id ? (
                          <Check className="ml-auto size-3.5 text-primary" />
                        ) : null}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </SettingsSection>
          ),
        },
        {
          id: "formats",
          label: "Date & time",
          icon: CalendarDays,
          description:
            "Use familiar date and time formats across your schedule.",
          content: (
            <>
              <SettingsSection title="Regional preferences">
                <SettingsGroup>
                  <SettingsRow
                    title="Time format"
                    description="Used for reminders, events, and race sessions."
                    controlId="settings-time-format"
                  >
                    <Select
                      value={timeFormat}
                      onValueChange={(value) =>
                        setTimeFormat(value as TimeFormatPreference)
                      }
                    >
                      <SelectTrigger id="settings-time-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System default</SelectItem>
                        <SelectItem value="12-hour">12-hour</SelectItem>
                        <SelectItem value="24-hour">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                  <SettingsRow
                    title="Date format"
                    description="Choose the order of days, months, and years."
                    controlId="settings-date-format"
                  >
                    <Select
                      value={dateFormat}
                      onValueChange={(value) =>
                        setDateFormat(value as DateFormatPreference)
                      }
                    >
                      <SelectTrigger id="settings-date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System default</SelectItem>
                        <SelectItem value="month-day-year">
                          MM/DD/YYYY
                        </SelectItem>
                        <SelectItem value="day-month-year">
                          DD/MM/YYYY
                        </SelectItem>
                        <SelectItem value="year-month-day">
                          YYYY-MM-DD
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                </SettingsGroup>
              </SettingsSection>
              <SettingsSection title="Preview">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-6">
                  <p className="text-sm font-medium text-muted-foreground">
                    Your dates and times will look like this
                  </p>
                  <p className="mt-3 text-xl leading-8 font-semibold tracking-[-0.02em] tabular-nums">
                    {formatUserDate(previewDate, dateFormat)}
                    <span className="mx-3 text-muted-foreground/40">·</span>
                    {formatUserTime(previewDate, timeFormat)}
                  </p>
                </div>
              </SettingsSection>
            </>
          ),
        },
        {
          id: "account",
          label: "Account",
          icon: UserRound,
          description:
            "Your Lifever account keeps your everyday things together.",
          content: (
            <SettingsSection
              title={isDemoMode ? "Preview account" : "Signed in account"}
            >
              {isPending ? (
                <p className="text-sm text-muted-foreground">
                  Loading your account…
                </p>
              ) : (
                <SettingsGroup>
                  <SettingsRow
                    title={session?.user.name ?? "Showcase"}
                    description={
                      session?.user.email ?? "Explore Lifever with sample data."
                    }
                    inline
                  >
                    <Mail className="size-5 text-muted-foreground" />
                  </SettingsRow>
                  <div className="px-5 py-4 text-[13px] leading-6 text-muted-foreground">
                    {isDemoMode
                      ? "Preview changes are temporary. Sign in to use your own data."
                      : "Your reminders, calendars, notes, projects, and preferences follow you when you sign in on another device."}
                  </div>
                </SettingsGroup>
              )}
            </SettingsSection>
          ),
        },
      ]}
    />
  );
}
