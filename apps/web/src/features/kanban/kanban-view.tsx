import { Filter, Plus } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AppHeader,
  AppHeaderToolbar,
} from "@/components/app-shell/app-header";
import { AppSettingsButton } from "@/components/app-shell/app-settings-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/ui/search-field";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { KanbanBoard } from "@/features/kanban/components/kanban-board";
import { KanbanProjectPicker } from "@/features/kanban/components/kanban-project-picker";
import { KanbanProjectSettingsDialog } from "@/features/kanban/components/kanban-project-settings-dialog";
import { NewKanbanCardDialog } from "@/features/kanban/components/new-kanban-card-dialog";
import { NewKanbanProjectDialog } from "@/features/kanban/components/new-kanban-project-dialog";
import { getKanbanDueState } from "@/features/kanban/lib/dates";
import {
  kanbanPriorities,
} from "@/features/kanban/lib/properties";
import { useKanban } from "@/features/kanban/model/kanban-provider";
import type { KanbanPriority } from "@/features/kanban/model/types";
import { cn } from "@/lib/cn";

type KanbanViewProps = {
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
};

type PriorityFilter = "all" | Exclude<KanbanPriority, "none">;

export function KanbanView({
  onOpenMobileSidebar,
  onToggleSidebar,
}: KanbanViewProps) {
  const {
    activeProjectId,
    cards,
    columns,
    labels,
    projects,
    setActiveProjectId,
    setSelectedCardId,
  } = useKanban();
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const project = projects.find((item) => item.id === activeProjectId);
  const projectColumns = useMemo(
    () =>
      columns
        .filter((column) => column.projectId === activeProjectId)
        .sort((a, b) => a.position - b.position),
    [activeProjectId, columns],
  );
  const projectLabels = useMemo(
    () =>
      labels
        .filter((label) => label.projectId === activeProjectId)
        .sort((a, b) => a.position - b.position),
    [activeProjectId, labels],
  );
  const projectCards = useMemo(
    () => cards.filter((card) => card.projectId === activeProjectId),
    [activeProjectId, cards],
  );
  const doneColumnIds = useMemo(
    () =>
      new Set(
        projectColumns
          .filter((column) => column.isDone)
          .map((column) => column.id),
      ),
    [projectColumns],
  );

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return projectCards.filter((card) => {
      if (
        priorityFilter !== "all" &&
        card.priority !== priorityFilter
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      const labelNames = projectLabels
        .filter((label) => card.labelIds.includes(label.id))
        .map((label) => label.name)
        .join(" ");
      return `${card.title} ${card.description} ${labelNames}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [priorityFilter, projectCards, projectLabels, query]);

  const completedCount = projectCards.filter((card) =>
    doneColumnIds.has(card.columnId),
  ).length;
  const overdueCount = projectCards.filter(
    (card) =>
      getKanbanDueState(card.dueDate, doneColumnIds.has(card.columnId)) ===
      "overdue",
  ).length;
  const activeFilterCount =
    Number(Boolean(query.trim())) + Number(priorityFilter !== "all");

  const openCardComposer = useCallback(
    (columnId?: string) => {
      setSelectedCardId(null);
      setNewCardColumnId(columnId ?? projectColumns[0]?.id ?? null);
      setNewCardOpen(true);
    },
    [projectColumns, setSelectedCardId],
  );

  useEffect(() => {
    setQuery("");
    setPriorityFilter("all");
  }, [activeProjectId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches(
        "input, textarea, select, [contenteditable='true']",
      );
      const commandPressed = event.metaKey || event.ctrlKey;
      if (commandPressed && event.key.toLowerCase() === "f") {
        event.preventDefault();
        const searchInput = [
          desktopSearchRef.current,
          mobileSearchRef.current,
        ].find((input) => input?.offsetParent !== null);
        searchInput?.focus();
        return;
      }
      if (
        event.key.toLowerCase() === "n" &&
        !event.altKey &&
        (commandPressed || !isTyping)
      ) {
        event.preventDefault();
        openCardComposer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCardComposer]);

  if (!project) return null;

  const projectStyle = {
    "--project-color": project.color,
  } as CSSProperties;

  return (
    <main
      className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background"
      style={projectStyle}
    >
      <AppHeader elevated>
        <AppHeaderToolbar
          onOpenMobileSidebar={onOpenMobileSidebar}
          onToggleSidebar={onToggleSidebar}
        >
          <KanbanProjectPicker
            projects={projects}
            activeProjectId={activeProjectId}
            onProjectChange={setActiveProjectId}
            onCreateProject={() => setNewProjectOpen(true)}
            onManageProject={() => setSettingsOpen(true)}
          />

          <div className="flex-1" />

          <SearchField
            ref={desktopSearchRef}
            value={query}
            onValueChange={setQuery}
            label="Search cards"
            className="hidden w-[min(230px,24vw)] md:block"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "relative size-8 text-muted-foreground",
                  priorityFilter !== "all" && "text-foreground",
                )}
                aria-label="Filter cards"
              >
                <Filter className="size-3.5" />
                {activeFilterCount > 0 ? (
                  <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={priorityFilter}
                onValueChange={(value) =>
                  setPriorityFilter(value as PriorityFilter)
                }
              >
                <DropdownMenuRadioItem value="all">
                  All priorities
                </DropdownMenuRadioItem>
                {kanbanPriorities
                  .filter((priority) => priority.value !== "none")
                  .map((priority) => {
                    const PriorityIcon = priority.Icon;
                    return (
                      <DropdownMenuRadioItem
                        key={priority.value}
                        value={priority.value}
                      >
                        <span className="flex items-center gap-2">
                          <PriorityIcon
                            className="size-3.5"
                            style={{ color: priority.color }}
                          />
                          {priority.shortLabel}
                        </span>
                      </DropdownMenuRadioItem>
                    );
                  })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <AppSettingsButton
            label="Project settings"
            onClick={() => setSettingsOpen(true)}
          />
          <ShortcutTooltip label="New Card" shortcut={["⌘", "N"]}>
            <Button
              size="icon-sm"
              className="size-8 rounded-full"
              onClick={() => openCardComposer()}
              aria-label="New card"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </Button>
          </ShortcutTooltip>
        </AppHeaderToolbar>

        <div className="mt-5 flex items-end gap-3 px-1 sm:mt-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[27px] leading-[1.1] font-bold tracking-[-0.035em] sm:text-[31px]">
              {project.name}
            </h1>
            <p className="mt-1.5 truncate text-[12px] text-muted-foreground">
              {project.description || "Move the work that matters forward"}
              <span className="mx-1.5 text-border">·</span>
              {projectCards.length}{" "}
              {projectCards.length === 1 ? "card" : "cards"}
              {completedCount > 0 ? ` · ${completedCount} done` : ""}
              {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
            </p>
          </div>
        </div>

        <SearchField
          ref={mobileSearchRef}
          value={query}
          onValueChange={setQuery}
          label="Search cards"
          className="mt-3 md:hidden"
        />
      </AppHeader>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain pt-2">
        <KanbanBoard
          columns={projectColumns}
          cards={filteredCards}
          allCards={projectCards}
          labels={projectLabels}
          onAddCard={openCardComposer}
          onManageWorkflow={() => setSettingsOpen(true)}
        />
      </div>

      <NewKanbanCardDialog
        open={newCardOpen}
        initialColumnId={newCardColumnId}
        onOpenChange={setNewCardOpen}
      />
      <NewKanbanProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
      />
      <KanbanProjectSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </main>
  );
}
