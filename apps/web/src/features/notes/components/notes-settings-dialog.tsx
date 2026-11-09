import { FileText, PencilLine, Plus, Tags } from "lucide-react";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { noteColorPresets } from "@/features/notes/lib/categories";
import { useNotes } from "@/features/notes/model/notes-provider";
import type { NotePreviewLines, NotesSort } from "@/features/notes/model/types";

export function NotesSettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const {
    addCategory,
    categories,
    notes,
    removeCategory,
    settings,
    updateCategory,
    updateSettings,
  } = useNotes();
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const addNewCategory = () => {
    const color =
      noteColorPresets.find(
        (preset) =>
          !categories.some(
            (category) =>
              category.color.toLowerCase() === preset.color.toLowerCase(),
          ),
      )?.color ?? noteColorPresets[0]!.color;
    setNewCategoryId(addCategory({ name: "New category", color }).id);
  };

  return (
    <SettingsModal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setNewCategoryId(null);
      }}
      title="Notes settings"
      description="Organize your notes and personalize the editor."
      icon={FileText}
      iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      pages={[
        {
          id: "general",
          label: "Reading & writing",
          icon: PencilLine,
          description: "Set up your note list and choose how the editor opens.",
          content: (
            <>
              <SettingsSection title="Note list">
                <SettingsGroup>
                  <SettingsRow
                    title="Sort notes"
                    description="Pinned notes always stay at the top."
                    controlId="notes-sort"
                  >
                    <Select
                      value={settings.sort}
                      onValueChange={(sort) =>
                        updateSettings({ sort: sort as NotesSort })
                      }
                    >
                      <SelectTrigger id="notes-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated">Date edited</SelectItem>
                        <SelectItem value="created">Date created</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                  <SettingsRow
                    title="List preview"
                    description="How much of each note appears below its title."
                    controlId="notes-preview-lines"
                  >
                    <Select
                      value={String(settings.previewLines)}
                      onValueChange={(value) =>
                        updateSettings({
                          previewLines: Number(value) as NotePreviewLines,
                        })
                      }
                    >
                      <SelectTrigger id="notes-preview-lines">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3].map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value} {value === 1 ? "line" : "lines"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                  <SettingsRow
                    title="Default category"
                    description="New notes start in this collection."
                    controlId="notes-default-category"
                  >
                    <Select
                      value={settings.defaultCategoryId}
                      onValueChange={(defaultCategoryId) =>
                        updateSettings({ defaultCategoryId })
                      }
                    >
                      <SelectTrigger id="notes-default-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                </SettingsGroup>
              </SettingsSection>
              <SettingsSection title="Editor">
                <SettingsGroup>
                  <SettingsToggle
                    title="Open in preview"
                    description="Start with rendered Markdown when you open a note."
                    checked={settings.openInPreview}
                    onCheckedChange={(openInPreview) =>
                      updateSettings({ openInPreview })
                    }
                  />
                  <SettingsToggle
                    title="Check spelling"
                    description="Use your system spell checker while you write."
                    checked={settings.spellcheck}
                    onCheckedChange={(spellcheck) =>
                      updateSettings({ spellcheck })
                    }
                  />
                </SettingsGroup>
              </SettingsSection>
            </>
          ),
        },
        {
          id: "categories",
          label: "Categories",
          icon: Tags,
          description:
            "Keep your notes organized with named, color-coded collections.",
          content: (
            <SettingsSection
              title="Your categories"
              description="Rename a category or choose its color. Deleting one moves its notes to another category."
              action={
                <Button variant="outline" onClick={addNewCategory}>
                  <Plus className="size-4" />
                  Add category
                </Button>
              }
            >
              <SettingsGroup>
                {categories.map((category) => {
                  const count = notes.filter(
                    (note) => note.categoryId === category.id,
                  ).length;
                  return (
                    <SettingsCollectionRow
                      key={category.id}
                      name={category.name}
                      color={category.color}
                      presets={noteColorPresets}
                      detail={`${count} ${count === 1 ? "note" : "notes"}`}
                      canDelete={categories.length > 1}
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
                              "Its notes were moved to another category.",
                          });
                      }}
                    />
                  );
                })}
              </SettingsGroup>
            </SettingsSection>
          ),
        },
      ]}
    />
  );
}
