import { useEffect, useState } from "react";

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

type NewKanbanProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewKanbanProjectDialog({
  open,
  onOpenChange,
}: NewKanbanProjectDialogProps) {
  const { addProject } = useKanban();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setColor("#3b82f6");
  }, [open]);

  const createProject = () => {
    if (!name.trim()) return;
    addProject({ name, description, color });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogTitle>New project</DialogTitle>
        <DialogDescription className="mt-1">
          Start with a flexible three-step workflow. You can tune every status
          and property later.
        </DialogDescription>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createProject();
          }}
        >
          <div>
            <label
              htmlFor="kanban-project-name"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Name
            </label>
            <div className="flex gap-2">
              <ColorPicker
                value={color}
                onValueChange={setColor}
                presets={kanbanColorPresets}
                ariaLabel="Choose project color"
              />
              <Input
                id="kanban-project-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website redesign"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="kanban-project-description"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Description
            </label>
            <Textarea
              id="kanban-project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you hoping to move forward?"
              className="min-h-20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
