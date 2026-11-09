import {
  ArrowDown,
  ArrowUp,
  Columns3,
  FolderKanban,
  Plus,
  SlidersHorizontal,
  Tags,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SettingsCollectionRow } from "@/components/settings/settings-collection-row";
import {
  SettingsGroup,
  SettingsModal,
  SettingsSection,
  type SettingsDialogProps,
} from "@/components/settings/settings-modal";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { kanbanColorPresets } from "@/features/kanban/lib/properties";
import { useKanban } from "@/features/kanban/model/kanban-provider";

export function KanbanProjectSettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const {
    activeProjectId,
    addColumn,
    addLabel,
    columns,
    labels,
    projects,
    moveColumn,
    removeColumn,
    removeLabel,
    removeProject,
    updateColumn,
    updateLabel,
    updateProject,
  } = useKanban();
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [newItemId, setNewItemId] = useState<string | null>(null);
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

  return (
    <>
      <SettingsModal
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) setNewItemId(null);
        }}
        title="Project settings"
        description={project.name}
        icon={FolderKanban}
        iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        pages={[
          {
            id: "general",
            label: "General",
            icon: SlidersHorizontal,
            description: "Give this project an identity and a clear purpose.",
            content: (
              <>
                <SettingsSection title="Project details">
                  <SettingsGroup>
                    <div className="space-y-5 p-5">
                      <div>
                        <label
                          htmlFor="project-settings-name"
                          className="mb-2 block text-[13px] font-medium"
                        >
                          Project name
                        </label>
                        <div className="flex gap-3">
                          <ColorPicker
                            value={project.color}
                            onValueChange={(color) =>
                              updateProject(project.id, { color })
                            }
                            presets={kanbanColorPresets}
                            ariaLabel="Choose project color"
                          />
                          <Input
                            id="project-settings-name"
                            value={project.name}
                            maxLength={120}
                            onChange={(event) =>
                              updateProject(project.id, {
                                name: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="project-settings-description"
                          className="mb-2 block text-[13px] font-medium"
                        >
                          Description
                        </label>
                        <Textarea
                          id="project-settings-description"
                          value={project.description}
                          maxLength={5000}
                          onChange={(event) =>
                            updateProject(project.id, {
                              description: event.target.value,
                            })
                          }
                          className="min-h-28"
                          placeholder="What are you working toward?"
                        />
                      </div>
                    </div>
                  </SettingsGroup>
                </SettingsSection>
                <SettingsSection
                  title="Delete project"
                  destructive
                  description="Permanently remove this project and every status, label, and card inside it."
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
                    <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                      {projects.length <= 1
                        ? "Create another project before deleting this one."
                        : "This action can’t be undone."}
                    </p>
                    <Button
                      variant="outline"
                      className="border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={projects.length <= 1}
                      onClick={() => setDeleteProjectOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete project…
                    </Button>
                  </div>
                </SettingsSection>
              </>
            ),
          },
          {
            id: "workflow",
            label: "Workflow",
            icon: Columns3,
            description:
              "Arrange your statuses, set card limits, and define what counts as done.",
            content: (
              <SettingsSection
                title="Board statuses"
                description="Statuses appear on your board in this order."
                action={
                  <Button
                    variant="outline"
                    onClick={() => setNewItemId(addColumn(project.id).id)}
                  >
                    <Plus className="size-4" />
                    Add status
                  </Button>
                }
              >
                <div className="space-y-3">
                  {projectColumns.map((column, index) => (
                    <div
                      key={column.id}
                      className="overflow-hidden rounded-2xl border border-border/70 bg-card"
                    >
                      <SettingsCollectionRow
                        name={column.name}
                        color={column.color}
                        presets={kanbanColorPresets}
                        maxLength={80}
                        detail={`Status ${index + 1} of ${projectColumns.length}`}
                        autoFocus={newItemId === column.id}
                        onNameChange={(name) => {
                          updateColumn(column.id, { name });
                          setNewItemId(null);
                        }}
                        onColorChange={(color) =>
                          updateColumn(column.id, { color })
                        }
                        canDelete={projectColumns.length > 1}
                        onDelete={() => {
                          if (!removeColumn(column.id))
                            toast.error("A project needs at least one status");
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border/50 px-4 py-3">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Card limit
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            value={column.wipLimit ?? ""}
                            placeholder="None"
                            className="h-8 w-[72px] px-2 text-xs tabular-nums"
                            aria-label={`${column.name} card limit`}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateColumn(column.id, {
                                wipLimit: value
                                  ? Math.min(99, Math.max(1, Number(value)))
                                  : null,
                              });
                            }}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Completed
                          <Switch
                            checked={column.isDone}
                            onCheckedChange={(isDone) =>
                              updateColumn(column.id, { isDone })
                            }
                            aria-label={`${column.name} counts as complete`}
                          />
                        </label>
                        <div className="ml-auto flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === 0}
                            onClick={() => moveColumn(column.id, index - 1)}
                            aria-label={`Move ${column.name} earlier`}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={index === projectColumns.length - 1}
                            onClick={() => moveColumn(column.id, index + 1)}
                            aria-label={`Move ${column.name} later`}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsSection>
            ),
          },
          {
            id: "labels",
            label: "Labels",
            icon: Tags,
            description: "Make cards easier to recognize, filter, and group.",
            content: (
              <SettingsSection
                title="Project labels"
                description="Labels belong to this project. You can use more than one on a card."
                action={
                  <Button
                    variant="outline"
                    onClick={() => setNewItemId(addLabel(project.id).id)}
                  >
                    <Plus className="size-4" />
                    Add label
                  </Button>
                }
              >
                {projectLabels.length ? (
                  <SettingsGroup>
                    {projectLabels.map((label) => (
                      <SettingsCollectionRow
                        key={label.id}
                        name={label.name}
                        color={label.color}
                        presets={kanbanColorPresets}
                        maxLength={80}
                        autoFocus={newItemId === label.id}
                        onNameChange={(name) => {
                          updateLabel(label.id, { name });
                          setNewItemId(null);
                        }}
                        onColorChange={(color) =>
                          updateLabel(label.id, { color })
                        }
                        onDelete={() => removeLabel(label.id)}
                      />
                    ))}
                  </SettingsGroup>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNewItemId(addLabel(project.id).id)}
                    className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground outline-none hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Tags className="mb-1 size-6" />
                    Add your first label
                  </button>
                )}
              </SettingsSection>
            ),
          },
        ]}
      />
      <Dialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Delete “{project.name}”?</DialogTitle>
          <DialogDescription className="mt-1">
            Every card and project property will be permanently removed. This
            can’t be undone.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteProjectOpen(false)}>
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
