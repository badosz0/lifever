import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleCheck,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { kanbanColorPresets } from "@/features/kanban/lib/properties";
import { useKanban } from "@/features/kanban/model/kanban-provider";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import { cn } from "@/lib/cn";

type KanbanProjectSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KanbanProjectSettingsDialog({
  open,
  onOpenChange,
}: KanbanProjectSettingsDialogProps) {
  const {
    activeProjectId,
    addColumn,
    addLabel,
    canEditProject,
    columns,
    labels,
    projectAccess,
    projects,
    moveColumn,
    isProjectOwner,
    removeColumn,
    removeLabel,
    removeProject,
    updateColumn,
    updateLabel,
    updateProject,
  } = useKanban();
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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

  if (!project) return null;
  const canEdit = canEditProject(project.id);
  const isOwner = isProjectOwner(project.id);
  const ownedProjectCount = projects.filter((item) =>
    isProjectOwner(item.id),
  ).length;

  const deleteColumn = (id: string) => {
    if (!removeColumn(id)) {
      toast.error("A project needs at least one status");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(780px,calc(100dvh-2rem))] max-w-[680px] flex-col overflow-hidden p-0">
          <div className="shrink-0 px-5 pt-5 pb-4">
            <DialogTitle>Project settings</DialogTitle>
            <DialogDescription className="mt-1">
              Shape this project’s workflow and the properties available on its
              cards.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-y border-border/65 px-5 py-5">
            <fieldset disabled={!canEdit} className="contents">
              <section>
                <div className="mb-3">
                  <h3 className="text-[13px] font-semibold">General</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    A distinct name and color make projects easy to spot.
                  </p>
                </div>
                <div className="max-w-xl space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Name
                    </label>
                    <div className="flex gap-2">
                      <ColorPicker
                        value={project.color}
                        onValueChange={(color) =>
                          updateProject(project.id, { color })
                        }
                        presets={kanbanColorPresets}
                        ariaLabel="Choose project color"
                      />
                      <Input
                        value={project.name}
                        onChange={(event) =>
                          updateProject(project.id, {
                            name: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Description
                    </label>
                    <Textarea
                      value={project.description}
                      onChange={(event) =>
                        updateProject(project.id, {
                          description: event.target.value,
                        })
                      }
                      className="min-h-20"
                      placeholder="What is this project for?"
                    />
                  </div>
                </div>
              </section>
            </fieldset>

            <section className="mt-7 border-t border-border/65 pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[13px] font-semibold">Collaboration</h3>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {isOwner
                      ? "Invite people to view or edit this project."
                      : `Shared by ${projectAccess[project.id]?.owner.name ?? "the owner"}.`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="size-3.5" />
                  Manage access
                </Button>
              </div>
            </section>

            <fieldset disabled={!canEdit} className="contents">
            <section className="mt-7 border-t border-border/65 pt-6">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-semibold">Workflow</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Set card limits and mark the statuses that count as complete.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => addColumn(project.id)}
                >
                  <Plus className="size-3" />
                  Add status
                </Button>
              </div>

              <div className="space-y-2">
                {projectColumns.map((column, index) => (
                  <div
                    key={column.id}
                    className="grid items-center gap-2 rounded-xl border border-border bg-background p-2 sm:grid-cols-[auto_minmax(110px,1fr)_82px_auto_auto]"
                  >
                    <ColorPicker
                      value={column.color}
                      onValueChange={(color) =>
                        updateColumn(column.id, { color })
                      }
                      presets={kanbanColorPresets}
                      ariaLabel={`Choose ${column.name} color`}
                    />
                    <Input
                      value={column.name}
                      onChange={(event) =>
                        updateColumn(column.id, { name: event.target.value })
                      }
                      aria-label="Status name"
                    />
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={column.wipLimit ?? ""}
                        placeholder="No limit"
                        className="px-2 text-[11px] tabular-nums"
                        aria-label={`${column.name} card limit`}
                        onChange={(event) =>
                          updateColumn(column.id, {
                            wipLimit: event.target.value
                              ? Math.max(1, Number(event.target.value))
                              : null,
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateColumn(column.id, { isDone: !column.isDone })
                      }
                      className={cn(
                        "flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium outline-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[.97] focus-visible:ring-2 focus-visible:ring-ring",
                        column.isDone
                          ? "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400"
                          : "border-border bg-muted text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={column.isDone}
                    >
                      {column.isDone ? (
                        <CircleCheck className="size-3.5" />
                      ) : (
                        <Check className="size-3.5 opacity-50" />
                      )}
                      Done
                    </button>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground"
                        onClick={() => moveColumn(column.id, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move ${column.name} left`}
                      >
                        <ArrowUp className="size-3.5 -rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground"
                        onClick={() => moveColumn(column.id, index + 1)}
                        disabled={index === projectColumns.length - 1}
                        aria-label={`Move ${column.name} right`}
                      >
                        <ArrowDown className="size-3.5 -rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteColumn(column.id)}
                        disabled={projectColumns.length <= 1}
                        aria-label={`Delete ${column.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-7 border-t border-border/65 pt-6">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-semibold">Labels</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Labels belong to this project and can be combined on any
                    card.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => addLabel(project.id)}
                >
                  <Plus className="size-3" />
                  Add label
                </Button>
              </div>

              {projectLabels.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {projectLabels.map((label) => (
                    <div
                      key={label.id}
                      className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
                    >
                      <ColorPicker
                        value={label.color}
                        onValueChange={(color) =>
                          updateLabel(label.id, { color })
                        }
                        presets={kanbanColorPresets}
                        ariaLabel={`Choose ${label.name} color`}
                      />
                      <Input
                        value={label.name}
                        onChange={(event) =>
                          updateLabel(label.id, { name: event.target.value })
                        }
                        aria-label="Label name"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeLabel(label.id)}
                        aria-label={`Delete ${label.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addLabel(project.id)}
                  className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-border bg-background text-xs font-medium text-muted-foreground outline-none transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Add your first label
                </button>
              )}
            </section>
            </fieldset>

            {isOwner ? (
            <section className="mt-7 border-t border-border/65 pt-6">
              <h3 className="text-[13px] font-semibold text-destructive">
                Delete project
              </h3>
              <p className="mt-1 max-w-lg text-[11px] leading-5 text-muted-foreground">
                This permanently removes every status, label, and card in this
                project.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={ownedProjectCount <= 1}
                onClick={() => setDeleteProjectOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete project…
              </Button>
              {ownedProjectCount <= 1 ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Create another project before deleting this one.
                </p>
              ) : null}
            </section>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end px-5 py-3">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        resourceType="kanbanProject"
        resourceId={project.id}
        resourceName={project.name}
        onLeft={() => onOpenChange(false)}
      />

      <Dialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Delete “{project.name}”?</DialogTitle>
          <DialogDescription className="mt-1">
            Every card and project property will be permanently removed. This
            can’t be undone.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteProjectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removeProject(project.id)) return;
                setDeleteProjectOpen(false);
                onOpenChange(false);
                toast("Project deleted");
              }}
            >
              Delete project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
