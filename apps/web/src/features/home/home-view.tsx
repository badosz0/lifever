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
import { Menu, PanelLeft, Settings2 } from "lucide-react";
import { useState } from "react";

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
      <header className="scroll-edge relative z-10 shrink-0 bg-background/88 px-4 pt-3 pb-4 backdrop-blur-xl sm:px-7 sm:pt-5">
        <div className="flex min-h-9 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden text-muted-foreground md:inline-flex"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground md:hidden"
            onClick={onOpenMobileSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>
          <span className="text-[12px] font-medium text-muted-foreground">
            Home
          </span>
          <div className="flex-1" />
          <AppSettingsButton
            label="Home settings"
            onClick={() => setSettingsOpen(true)}
          />
        </div>

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
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-7">
        <div className="mx-auto max-w-[1040px]">
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
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {homeApps.map((app) => (
                    <SortableHomeWidget key={app.id} app={app} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex min-h-[260px] flex-col items-start justify-center rounded-2xl border border-dashed border-border bg-card px-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Settings2 className="size-[18px]" />
              </div>
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
