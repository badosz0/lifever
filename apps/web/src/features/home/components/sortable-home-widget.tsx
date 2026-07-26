import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpRight, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApps } from "@/features/apps/model/apps-provider";
import type { FeatureAppDefinition } from "@/features/apps/model/types";
import { cn } from "@/lib/cn";

type SortableHomeWidgetProps = {
  app: FeatureAppDefinition;
};

export function SortableHomeWidget({ app }: SortableHomeWidgetProps) {
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
        "relative min-h-[220px] rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.025)] transition-[box-shadow,opacity] duration-150 ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none",
        isDragging &&
          "z-10 opacity-90 shadow-[0_16px_40px_rgb(0_0_0/0.14)]",
      )}
    >
      <div className="mb-5 flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-3.5" strokeWidth={1.9} />
        </div>
        <h2 className="min-w-0 flex-1 truncate text-[12px] font-semibold">
          {app.label}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label={`Reorder ${app.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 text-muted-foreground"
          onClick={() => setActiveApp(app.id)}
          aria-label={`Open ${app.label}`}
        >
          <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
      <Content />
    </section>
  );
}
