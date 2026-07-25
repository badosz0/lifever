import { useEffect, useState } from "react";

import { PanelResizeHandle } from "@/components/app-shell/panel-resize-handle";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Titlebar } from "@/components/app-shell/titlebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { lifeverAppsById } from "@/features/apps/app-registry";
import { useApps } from "@/features/apps/model/apps-provider";
import type { AppId } from "@/features/apps/model/types";
import { useCalendar } from "@/features/calendar/model/calendar-provider";
import { usePersistentPanelWidth } from "@/hooks/use-persistent-panel-width";
import { cn } from "@/lib/cn";
import { isTauri } from "@/lib/runtime";

type OpenAppRequest = {
  app: AppId;
  eventId?: string;
};

const APPS_PANEL = {
  defaultWidth: 216,
  minWidth: 176,
  maxWidth: 320,
};

export function AppShell() {
  const { activeApp, setActiveApp } = useApps();
  const { setSelectedEventId } = useCalendar();
  const app = lifeverAppsById[activeApp];
  const ActiveView = app.View;
  const ActiveInspector = app.Inspector;
  const ActiveDetailsDialog = app.DetailsDialog;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("lifever-sidebar-collapsed") === "true",
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [resizingPanel, setResizingPanel] = useState<"apps" | "details" | null>(null);
  const appsPanel = usePersistentPanelWidth({
    storageKey: "lifever-apps-panel-width",
    ...APPS_PANEL,
  });
  const detailsPanel = usePersistentPanelWidth({
    storageKey: `lifever-${activeApp}-details-panel-width`,
    ...app.detailsPanel,
  });

  useEffect(() => {
    localStorage.setItem("lifever-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!isTauri) return;

    let disposed = false;
    let stopListening: (() => void) | undefined;
    void import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<OpenAppRequest>("lifever:open-app", (event) => {
          const request = event.payload;
          if (request.app in lifeverAppsById) {
            setActiveApp(request.app);
            if (request.app === "calendar" && request.eventId) {
              setSelectedEventId(request.eventId);
            }
          }
        }),
      )
      .then((unlisten) => {
        if (disposed) unlisten();
        else stopListening = unlisten;
      });

    return () => {
      disposed = true;
      stopListening?.();
    };
  }, [setActiveApp, setSelectedEventId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setSidebarCollapsed((value) => !value);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-background text-foreground">
      <Titlebar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          style={{ width: sidebarCollapsed ? 0 : appsPanel.width }}
          className={cn(
            "relative hidden h-full shrink-0 transition-[width,opacity] duration-200 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none md:block",
            sidebarCollapsed ? "opacity-0" : "opacity-100",
            resizingPanel === "apps" && "transition-none",
          )}
        >
          <aside className="h-full w-full overflow-hidden border-r border-border bg-sidebar">
            <Sidebar />
          </aside>
          {!sidebarCollapsed ? (
            <PanelResizeHandle
              edge="right"
              label="Resize Apps sidebar"
              width={appsPanel.width}
              minWidth={APPS_PANEL.minWidth}
              maxWidth={APPS_PANEL.maxWidth}
              onResize={appsPanel.setWidth}
              onResizeEnd={appsPanel.persistWidth}
              onReset={appsPanel.resetWidth}
              onResizingChange={(resizing) =>
                setResizingPanel(resizing ? "apps" : null)
              }
            />
          ) : null}
        </div>

        <ActiveView
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />

        <div
          className="relative hidden h-full shrink-0 xl:block"
          style={{ width: detailsPanel.width }}
        >
          <ActiveInspector className="h-full w-full" />
          <PanelResizeHandle
            edge="left"
            label="Resize Details sidebar"
            width={detailsPanel.width}
            minWidth={app.detailsPanel.minWidth}
            maxWidth={app.detailsPanel.maxWidth}
            onResize={detailsPanel.setWidth}
            onResizeEnd={detailsPanel.persistWidth}
            onReset={detailsPanel.resetWidth}
            onResizingChange={(resizing) =>
              setResizingPanel(resizing ? "details" : null)
            }
          />
        </div>
      </div>

      <Dialog open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <DialogContent
          showClose={false}
          className="top-0 bottom-0 left-0 h-dvh w-[min(82vw,240px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-l-0 p-0 data-[state=closed]:-translate-x-full data-[state=closed]:scale-100 md:hidden"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogDescription className="sr-only">Choose a Lifever app.</DialogDescription>
          <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
        </DialogContent>
      </Dialog>

      <ActiveDetailsDialog />
    </div>
  );
}
