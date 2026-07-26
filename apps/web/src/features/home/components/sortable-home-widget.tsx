import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApps } from "@/features/apps/model/apps-provider";
import type { FeatureAppDefinition } from "@/features/apps/model/types";
import { cn } from "@/lib/cn";

type SortableHomeWidgetProps = {
  app: FeatureAppDefinition;
  index: number;
};

export function SortableHomeWidget({
  app,
  index,
}: SortableHomeWidgetProps) {
  const { setActiveApp } = useApps();
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: app.id });
  const Icon = app.icon;
  const Content = app.HomeWidget;

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "group relative border-b border-border/55 bg-background px-1 py-6 transition-[box-shadow,opacity] duration-150 ease-[cubic-bezier(.23,1,.32,1)] sm:px-5 lg:min-h-[190px] lg:px-6",
        index % 2 === 0 && "lg:border-r",
        isDragging &&
          "z-10 rounded-xl border-transparent bg-card opacity-95 shadow-[0_16px_40px_rgb(0_0_0/0.12)] ring-1 ring-border/70",
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1 h-7 min-w-0 gap-1.5 px-1 text-[12px] font-semibold"
          onClick={() => setActiveApp(app.id)}
        >
          <Icon
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.9}
          />
          <h2 className="truncate">{app.label}</h2>
          <ChevronRight className="size-3 text-muted-foreground/55 transition-transform duration-150 ease-[cubic-bezier(.23,1,.32,1)] group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 cursor-grab touch-none text-muted-foreground/55 active:cursor-grabbing sm:opacity-0 sm:transition-opacity sm:duration-150 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          aria-label={`Reorder ${app.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </Button>
      </div>
      <Content />
    </section>
  );
}
