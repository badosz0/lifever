import { Check, ChevronDown, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KanbanProject } from "@/features/kanban/model/types";
import { cn } from "@/lib/cn";

type KanbanProjectPickerProps = {
  projects: KanbanProject[];
  activeProjectId: string;
  onProjectChange: (id: string) => void;
  onCreateProject: () => void;
  onManageProject: () => void;
};

export function KanbanProjectPicker({
  projects,
  activeProjectId,
  onProjectChange,
  onCreateProject,
  onManageProject,
}: KanbanProjectPickerProps) {
  const activeProject = projects.find(
    (project) => project.id === activeProjectId,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 min-w-0 max-w-[220px] justify-start px-2 text-[13px]"
        >
          <span
            className="size-2.5 shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
            style={{ backgroundColor: activeProject?.color }}
          />
          <span className="truncate">{activeProject?.name ?? "Projects"}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        {projects
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((project) => {
            const active = project.id === activeProjectId;
            return (
              <DropdownMenuItem
                key={project.id}
                onSelect={() => onProjectChange(project.id)}
              >
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: project.color }}
                />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                <Check
                  className={cn(
                    "size-3.5 text-primary",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  strokeWidth={2.6}
                />
              </DropdownMenuItem>
            );
          })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCreateProject}>
          <Plus className="size-3.5" />
          New project…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onManageProject}>
          <Settings2 className="size-3.5" />
          Project settings…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
