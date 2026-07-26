import {
  Cloud,
  MousePointerClick,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Unplug,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CategoryColorPicker } from "@/features/calendar/components/category-color-picker";
import { calendarColorPresets } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type {
  CalendarCategory,
  CalendarCollection,
} from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

type CalendarSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditableRowProps = {
  item: Pick<CalendarCategory, "id" | "name" | "color">;
  countLabel: string;
  canDelete: boolean;
  autoFocus: boolean;
  onCommitName: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  visibility?: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  };
};

function EditableRow({
  item,
  countLabel,
  canDelete,
  autoFocus,
  onCommitName,
  onColorChange,
  onDelete,
  visibility,
}: EditableRowProps) {
  const [name, setName] = useState(item.name);

  useEffect(() => setName(item.name), [item.name]);

  const commitName = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setName(item.name);
      return;
    }
    if (cleanName !== item.name) onCommitName(cleanName);
  };

  return (
    <div className="flex min-h-12 items-center gap-2 border-b border-border/55 px-1 last:border-b-0">
      <CategoryColorPicker
        value={item.color}
        onValueChange={onColorChange}
        ariaLabel={`Choose color for ${item.name}`}
      />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setName(item.name);
            event.currentTarget.blur();
          }
        }}
        autoFocus={autoFocus}
        maxLength={40}
        className="h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-[13px] font-medium shadow-none focus:ring-0"
        aria-label={`${item.name} name`}
      />
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
        {countLabel}
      </span>
      {visibility ? (
        <Switch
          checked={visibility.checked}
          onCheckedChange={visibility.onCheckedChange}
          aria-label={`Show ${item.name}`}
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label={`Delete ${item.name}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

type SourceRowProps = {
  calendar: CalendarCollection;
  onVisibilityChange: (visible: boolean) => void;
};

function SourceRow({
  calendar,
  onVisibilityChange,
}: SourceRowProps) {
  return (
    <div className="flex min-h-12 items-center gap-3 border-b border-border/55 px-1 last:border-b-0">
      <span
        className="size-3 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
        style={{ backgroundColor: calendar.color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          {calendar.name}
        </span>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">
          {calendar.source === "google"
            ? calendar.writable
              ? "Google · can edit"
              : "Google · read only"
            : "From Formula 1 · read only"}
        </span>
      </span>
      <Switch
        checked={calendar.visible}
        onCheckedChange={onVisibilityChange}
        aria-label={`Show ${calendar.name}`}
      />
    </div>
  );
}

export function CalendarSettingsDialog({
  open,
  onOpenChange,
}: CalendarSettingsDialogProps) {
  const {
    activeCalendarId,
    addCalendar,
    addCategory,
    calendars,
    categories,
    connectGoogle,
    disconnectGoogle,
    google,
    nativeEvents,
    refreshGoogle,
    removeCalendar,
    removeCategory,
    setCalendarVisibility,
    updateCalendar,
    updateCategory,
  } = useCalendar();
  const { data: session } = authClient.useSession();
  const { calendarClickToCreate, setCalendarClickToCreate } =
    useUserPreferences();
  const [newCalendarId, setNewCalendarId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [section, setSection] = useState<"calendars" | "categories">(
    "calendars",
  );
  const [categoryCalendarId, setCategoryCalendarId] = useState<string | null>(
    null,
  );
  const previousOpen = useRef(open);
  const nativeCalendars = calendars.filter(
    (calendar) => calendar.source === "lifever",
  );
  const googleCalendars = calendars.filter(
    (calendar) => calendar.source === "google",
  );
  const appCalendars = calendars.filter(
    (calendar) => calendar.source === "app",
  );
  const categoryCalendar =
    nativeCalendars.find(
      (calendar) => calendar.id === categoryCalendarId,
    ) ??
    nativeCalendars.find((calendar) => calendar.id === activeCalendarId) ??
    nativeCalendars[0];
  const calendarCategories = categories.filter(
    (category) => category.calendarId === categoryCalendar?.id,
  );

  useEffect(() => {
    if (previousOpen.current && !open) {
      setNewCalendarId(null);
      setNewCategoryId(null);
    }
    previousOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || !categoryCalendar) return;
    setCategoryCalendarId(categoryCalendar.id);
  }, [categoryCalendar, open]);

  const nextUnusedColor = (usedColors: string[]) =>
    calendarColorPresets.find(
      (preset) => !usedColors.includes(preset.color.toLowerCase()),
    )?.color ?? calendarColorPresets[0]!.color;

  const addNewCalendar = () => {
    const calendar = addCalendar({
      name: "New calendar",
      color: nextUnusedColor(
        nativeCalendars.map((item) => item.color.toLowerCase()),
      ),
    });
    setNewCalendarId(calendar.id);
    setCategoryCalendarId(calendar.id);
  };

  const addNewCategory = () => {
    const category = addCategory({
      name: "New category",
      color: nextUnusedColor(
        calendarCategories.map((item) => item.color.toLowerCase()),
      ),
      calendarId: categoryCalendar!.id,
    });
    setNewCategoryId(category.id);
  };

  const connect = async () => {
    try {
      await connectGoogle();
      toast.success("Google Calendar connected");
    } catch (error) {
      toast.error("Couldn’t connect Google Calendar", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const refresh = async () => {
    try {
      await refreshGoogle();
      toast.success("Google calendars refreshed");
    } catch {
      toast.error("Couldn’t refresh Google Calendar");
    }
  };

  const disconnect = async () => {
    try {
      await disconnectGoogle();
      toast.success("Google Calendar disconnected");
    } catch {
      toast.error("Couldn’t disconnect Google Calendar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[580px] overflow-visible bg-popover p-0">
        <div className="px-5 pt-5 pb-3">
          <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings2 className="size-[18px]" />
          </div>
          <DialogTitle>Calendar settings</DialogTitle>
          <DialogDescription className="mt-1">
            Calendars and their categories.
          </DialogDescription>
        </div>

        <div className="border-b border-border/65 px-5 pb-3">
          <div className="flex h-8 w-fit items-center rounded-lg bg-muted p-0.5">
            {(["calendars", "categories"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSection(item)}
                className={cn(
                  "h-7 rounded-md px-3 text-[11px] font-semibold capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  section === item
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={section === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[min(62vh,540px)] overflow-y-auto px-5 py-3">
          {section === "calendars" ? (
            <>
              <div className="flex min-h-12 w-full items-center gap-3 border-b border-border/55 px-1">
                <MousePointerClick className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 text-[13px] font-medium">
                  Create events by clicking
                </span>
                <Switch
                  checked={calendarClickToCreate}
                  onCheckedChange={setCalendarClickToCreate}
                  aria-label="Create events by clicking"
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-muted-foreground">
                  MY CALENDARS
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1.5 text-[11px] text-muted-foreground"
                  onClick={addNewCalendar}
                >
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
              <div>
                {nativeCalendars.map((calendar) => (
                  <EditableRow
                    key={calendar.id}
                    item={calendar}
                    countLabel={`${nativeEvents.filter((event) => event.calendarId === calendar.id).length}`}
                    canDelete={nativeCalendars.length > 1}
                    autoFocus={newCalendarId === calendar.id}
                    visibility={{
                      checked: calendar.visible,
                      onCheckedChange: (visible) =>
                        setCalendarVisibility(calendar.id, visible),
                    }}
                    onCommitName={(name) => {
                      updateCalendar(calendar.id, { name });
                      setNewCalendarId(null);
                    }}
                    onColorChange={(color) =>
                      updateCalendar(calendar.id, { color })
                    }
                    onDelete={() => {
                      if (!removeCalendar(calendar.id)) return;
                      if (categoryCalendarId === calendar.id) {
                        setCategoryCalendarId(
                          nativeCalendars.find(
                            (item) => item.id !== calendar.id,
                          )?.id ?? null,
                        );
                      }
                      toast("Calendar deleted", {
                        description:
                          "Its events were moved to another Lifever calendar.",
                      });
                    }}
                  />
                ))}
              </div>

              <h3 className="mt-5 text-[11px] font-semibold text-muted-foreground">
                SOURCES
              </h3>
              <div className="mt-1 flex min-h-12 items-center gap-3 border-b border-border/55 px-1">
                <Cloud className="size-4 shrink-0 text-[#4285F4]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">
                    Google Calendar
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {google.connected
                      ? `${googleCalendars.length} connected`
                      : !session
                        ? "Sign in to connect"
                        : google.configured
                          ? "Not connected"
                          : "Server setup required"}
                  </span>
                </span>
                {session && google.configured && !google.connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => void connect()}
                  >
                    Connect
                  </Button>
                ) : google.connected ? (
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-muted-foreground"
                      onClick={() => void refresh()}
                      disabled={google.syncing}
                      aria-label="Refresh Google calendars"
                    >
                      <RefreshCw
                        className={cn(
                          "size-3.5",
                          google.syncing && "animate-spin",
                        )}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => void disconnect()}
                      disabled={google.syncing}
                      aria-label="Disconnect Google Calendar"
                    >
                      <Unplug className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
              {google.connected
                ? googleCalendars.map((calendar) => (
                    <SourceRow
                      key={calendar.id}
                      calendar={calendar}
                      onVisibilityChange={(visible) =>
                        setCalendarVisibility(calendar.id, visible)
                      }
                    />
                  ))
                : null}
              {appCalendars.length > 0
                ? appCalendars.map((calendar) => (
                    <SourceRow
                      key={calendar.id}
                      calendar={calendar}
                      onVisibilityChange={(visible) =>
                        setCalendarVisibility(calendar.id, visible)
                      }
                    />
                  ))
                : null}
            </>
          ) : (
            <div>
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold">Categories</h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Categories belong to one Lifever calendar.
                  </p>
                </div>
                {categoryCalendar ? (
                  <Select
                    value={categoryCalendar.id}
                    onValueChange={setCategoryCalendarId}
                  >
                    <SelectTrigger
                      aria-label="Categories for calendar"
                      className="h-8 w-40 text-[11px]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{ backgroundColor: categoryCalendar.color }}
                        />
                        <span className="truncate">
                          {categoryCalendar.name}
                        </span>
                      </span>
                    </SelectTrigger>
                    <SelectContent align="end">
                      {nativeCalendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-[3px]"
                              style={{ backgroundColor: calendar.color }}
                            />
                            {calendar.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
              <div className="mt-2">
                {calendarCategories.map((category) => (
                  <EditableRow
                    key={category.id}
                    item={category}
                    countLabel={`${nativeEvents.filter((event) => event.categoryId === category.id).length}`}
                    canDelete={calendarCategories.length > 1}
                    autoFocus={newCategoryId === category.id}
                    onCommitName={(name) => {
                      updateCategory(category.id, { name });
                      setNewCategoryId(null);
                    }}
                    onColorChange={(color) =>
                      updateCategory(category.id, { color })
                    }
                    onDelete={() => {
                      if (!removeCategory(category.id)) return;
                      toast("Category deleted", {
                        description:
                          "Its events were moved to another category.",
                      });
                    }}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="mt-1 h-8 px-1 text-[12px] text-muted-foreground"
                onClick={addNewCategory}
                disabled={!categoryCalendar}
              >
                <Plus className="size-3.5" />
                Add category
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border/65 bg-popover px-5 py-3">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
