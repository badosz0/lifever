import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Settings2 } from "lucide-react";
import { useState } from "react";

import {
  AppHeader,
  AppHeaderToolbar,
} from "@/components/app-shell/app-header";
import { AppSettingsButton } from "@/components/app-shell/app-settings-button";
import { Button } from "@/components/ui/button";
import { useApps } from "@/features/apps/model/apps-provider";
import { HomeSettingsDialog } from "@/features/home/components/home-settings-dialog";
import { SortableHomeWidget } from "@/features/home/components/sortable-home-widget";
import { useUserPreferences } from "@/features/settings/model/user-preferences-provider";
import { formatUserDate } from "@/lib/date-time-format";

type HomeViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

export function HomeView({
  onOpenMobileSidebar,
  onToggleSidebar,
}: HomeViewProps) {
  const { dateFormat } = useUserPreferences();
  const {
    homeApps,
    homeAppOrder,
    setHomeAppOrder,
  } = useApps();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = homeAppOrder.indexOf(String(active.id));
    const to = homeAppOrder.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    setHomeAppOrder(arrayMove(homeAppOrder, from, to));
  };

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <AppHeader>
        <AppHeaderToolbar
          onOpenMobileSidebar={onOpenMobileSidebar}
          onToggleSidebar={onToggleSidebar}
        >
          <span className="text-[12px] font-medium text-muted-foreground">
            Home
          </span>
          <div className="flex-1" />
          <AppSettingsButton
            label="Home settings"
            onClick={() => setSettingsOpen(true)}
          />
        </AppHeaderToolbar>

        <div className="mt-6 min-w-0 px-1 sm:mt-8">
          <h1 className="text-[30px] leading-[1.08] font-bold tracking-[-0.03em] sm:text-[34px]">
            Today
          </h1>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {formatUserDate(new Date(), dateFormat, {
              length: "long",
              weekday: "long",
            })}
          </p>
        </div>
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-7">
        <div className="mx-auto max-w-[980px]">
          {homeApps.length ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={homeApps.map((app) => app.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 border-t border-border/55 lg:grid-cols-2">
                  {homeApps.map((app, index) => (
                    <SortableHomeWidget
                      key={app.id}
                      app={app}
                      index={index}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex min-h-[260px] flex-col items-start justify-center border-y border-border/55 bg-background px-1 sm:px-5">
              <Settings2 className="size-[18px] text-muted-foreground" />
              <h2 className="mt-4 text-[15px] font-semibold">
                Make Home yours
              </h2>
              <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                Choose the app summaries you want to see at a glance.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSettingsOpen(true)}
              >
                Open Home settings
              </Button>
            </div>
          )}
        </div>
      </div>

      <HomeSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </main>
  );
}
