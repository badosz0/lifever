import {
  CalendarDays,
  Cloud,
  MousePointerClick,
  Plus,
  RefreshCw,
  Tags,
  Unplug,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsCollectionRow } from "@/components/settings/settings-collection-row";
import {
  SettingsGroup,
  SettingsModal,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
  type SettingsDialogProps,
} from "@/components/settings/settings-modal";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calendarColorPresets } from "@/features/calendar/lib/categories";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import type { CalendarCollection } from "@/features/calendar/model/types";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

function SourceRow({
  calendar,
  onColorChange,
  onVisibilityChange,
}: {
  calendar: CalendarCollection;
  onColorChange: (color: string) => void;
  onVisibilityChange: (visible: boolean) => void;
}) {
  const sourceColor = calendar.sourceColor ?? calendar.color;
  const presets = calendarColorPresets.some(
    (preset) => preset.color.toLowerCase() === sourceColor.toLowerCase(),
  )
    ? calendarColorPresets
    : [
        { color: sourceColor, label: `${calendar.name} default` },
        ...calendarColorPresets.slice(0, -1),
      ];
  return (
    <div className="flex min-h-[76px] items-center gap-3 px-4 py-3">
      <ColorPicker
        value={calendar.color}
        presets={presets}
        onValueChange={onColorChange}
        ariaLabel={`Choose color for ${calendar.name}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium [overflow-wrap:anywhere]">
          {calendar.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {calendar.writable ? "Can edit" : "Read only"}
        </p>
      </div>
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
}: SettingsDialogProps) {
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
    setExternalCalendarColor,
    setCalendarVisibility,
    updateCalendar,
    updateCategory,
  } = useCalendar();
  const { data: session } = authClient.useSession();
  const { calendarClickToCreate, setCalendarClickToCreate } =
    useUserPreferences();
  const [newCalendarId, setNewCalendarId] = useState<string | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
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
    nativeCalendars.find((calendar) => calendar.id === categoryCalendarId) ??
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

  const sourceRow = (calendar: CalendarCollection) => (
    <SourceRow
      key={calendar.id}
      calendar={calendar}
      onColorChange={(color) => setExternalCalendarColor(calendar.id, color)}
      onVisibilityChange={(visible) =>
        setCalendarVisibility(calendar.id, visible)
      }
    />
  );

  return (
    <SettingsModal
      open={open}
      onOpenChange={onOpenChange}
      title="Calendar settings"
      description="Manage your calendars, categories, and connections."
      icon={CalendarDays}
      pages={[
        {
          id: "general",
          label: "General",
          icon: MousePointerClick,
          description:
            "Choose how you create events and interact with your schedule.",
          content: (
            <SettingsSection title="Creating events">
              <SettingsGroup>
                <SettingsToggle
                  title="Create events by clicking"
                  description="Click an empty time to create an event. Drag to choose its duration."
                  checked={calendarClickToCreate}
                  onCheckedChange={setCalendarClickToCreate}
                />
              </SettingsGroup>
            </SettingsSection>
          ),
        },
        {
          id: "calendars",
          label: "Calendars",
          icon: CalendarDays,
          description:
            "Give each part of your life its own calendar, color, and space.",
          content: (
            <>
              <SettingsSection
                title="My calendars"
                description="Rename calendars, choose colors, or hide them from your schedule."
                action={
                  <Button variant="outline" onClick={addNewCalendar}>
                    <Plus className="size-4" />
                    Add calendar
                  </Button>
                }
              >
                <SettingsGroup>
                  {nativeCalendars.map((calendar) => {
                    const count = nativeEvents.filter(
                      (event) => event.calendarId === calendar.id,
                    ).length;
                    return (
                      <SettingsCollectionRow
                        key={calendar.id}
                        name={calendar.name}
                        color={calendar.color}
                        presets={calendarColorPresets}
                        detail={`${count} ${count === 1 ? "event" : "events"}`}
                        maxLength={60}
                        canDelete={nativeCalendars.length > 1}
                        disabled={!calendar.writable}
                        autoFocus={newCalendarId === calendar.id}
                        onNameChange={(name) => {
                          updateCalendar(calendar.id, { name });
                          setNewCalendarId(null);
                        }}
                        onColorChange={(color) =>
                          updateCalendar(calendar.id, { color })
                        }
                        onDelete={() => {
                          if (!removeCalendar(calendar.id)) return;
                          if (categoryCalendarId === calendar.id)
                            setCategoryCalendarId(
                              nativeCalendars.find(
                                (item) => item.id !== calendar.id,
                              )?.id ?? null,
                            );
                          toast("Calendar deleted", {
                            description:
                              "Its events were moved to another Lifever calendar.",
                          });
                        }}
                      >
                        <Switch
                          checked={calendar.visible}
                          onCheckedChange={(visible) =>
                            setCalendarVisibility(calendar.id, visible)
                          }
                          aria-label={`Show ${calendar.name}`}
                        />
                      </SettingsCollectionRow>
                    );
                  })}
                </SettingsGroup>
                <p className="text-xs leading-5 text-muted-foreground">
                  Keep at least one calendar. Deleting a calendar moves its
                  events to another one.
                </p>
              </SettingsSection>
              {appCalendars.length > 0 ? (
                <SettingsSection
                  title="From your apps"
                  description="Show events from other Lifever apps alongside your schedule."
                >
                  <SettingsGroup>{appCalendars.map(sourceRow)}</SettingsGroup>
                </SettingsSection>
              ) : null}
            </>
          ),
        },
        {
          id: "categories",
          label: "Categories",
          icon: Tags,
          description: "Organize the events within each Lifever calendar.",
          content: (
            <>
              <SettingsGroup>
                <SettingsRow
                  title="Calendar"
                  description="Choose which calendar’s categories to edit."
                  controlId="category-calendar"
                >
                  <Select
                    value={categoryCalendar?.id}
                    onValueChange={setCategoryCalendarId}
                    disabled={!categoryCalendar}
                  >
                    <SelectTrigger id="category-calendar">
                      <SelectValue placeholder="Choose a calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {nativeCalendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id}>
                          {calendar.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>
              </SettingsGroup>
              <SettingsSection
                title="Event categories"
                description="Choose a name and color for each kind of event."
                action={
                  <Button
                    variant="outline"
                    onClick={addNewCategory}
                    disabled={!categoryCalendar?.writable}
                  >
                    <Plus className="size-4" />
                    Add category
                  </Button>
                }
              >
                <SettingsGroup>
                  {calendarCategories.map((category) => {
                    const count = nativeEvents.filter(
                      (event) => event.categoryId === category.id,
                    ).length;
                    return (
                      <SettingsCollectionRow
                        key={category.id}
                        name={category.name}
                        color={category.color}
                        presets={calendarColorPresets}
                        detail={`${count} ${count === 1 ? "event" : "events"}`}
                        canDelete={calendarCategories.length > 1}
                        autoFocus={newCategoryId === category.id}
                        onNameChange={(name) => {
                          updateCategory(category.id, { name });
                          setNewCategoryId(null);
                        }}
                        onColorChange={(color) =>
                          updateCategory(category.id, { color })
                        }
                        onDelete={() => {
                          if (removeCategory(category.id))
                            toast("Category deleted", {
                              description:
                                "Its events were moved to another category.",
                            });
                        }}
                      />
                    );
                  })}
                </SettingsGroup>
                <p className="text-xs leading-5 text-muted-foreground">
                  Keep at least one category per calendar. Deleting one moves
                  its events to another category.
                </p>
              </SettingsSection>
            </>
          ),
        },
        {
          id: "connections",
          label: "Connections",
          icon: Cloud,
          description: "Bring your Google calendars into Lifever.",
          content: (
            <SettingsSection
              title="Google Calendar"
              description="Connected calendars appear alongside your Lifever calendars."
            >
              <SettingsGroup>
                <SettingsRow
                  title={
                    google.connected
                      ? "Google Calendar is connected"
                      : "Connect Google Calendar"
                  }
                  description={
                    google.connected
                      ? `${googleCalendars.length} ${googleCalendars.length === 1 ? "calendar" : "calendars"} connected`
                      : !session
                        ? "Sign in to your Lifever account to connect."
                        : google.configured
                          ? "View and manage your Google events in Lifever."
                          : "Google Calendar is not available on this server yet."
                  }
                >
                  {google.connected ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void refresh()}
                        disabled={google.syncing}
                        aria-label="Refresh Google calendars"
                      >
                        <RefreshCw
                          className={cn(
                            "size-4",
                            google.syncing &&
                              "animate-spin motion-reduce:animate-none",
                          )}
                        />
                        {google.syncing ? "Syncing…" : "Refresh"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => void disconnect()}
                        disabled={google.syncing}
                        aria-label="Disconnect Google Calendar"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Unplug className="size-4" />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => void connect()}
                      disabled={!session || !google.configured}
                    >
                      Connect Google
                    </Button>
                  )}
                </SettingsRow>
                {google.connected ? googleCalendars.map(sourceRow) : null}
              </SettingsGroup>
            </SettingsSection>
          ),
        },
      ]}
    />
  );
}
