import {
  ArrowDown,
  ArrowUp,
  Circle,
  CircleAlert,
  Equal,
  type LucideIcon,
} from "lucide-react";

import { calendarColorPresets } from "@/features/calendar/lib/categories";
import type { KanbanPriority } from "@/features/kanban/model/types";

export const kanbanColorPresets = calendarColorPresets;

export const kanbanPriorities: {
  value: KanbanPriority;
  label: string;
  shortLabel: string;
  color: string;
  Icon: LucideIcon;
}[] = [
  {
    value: "none",
    label: "No priority",
    shortLabel: "None",
    color: "#8e8e93",
    Icon: Circle,
  },
  {
    value: "low",
    label: "Low priority",
    shortLabel: "Low",
    color: "#0ea5e9",
    Icon: ArrowDown,
  },
  {
    value: "medium",
    label: "Medium priority",
    shortLabel: "Medium",
    color: "#f59e0b",
    Icon: Equal,
  },
  {
    value: "high",
    label: "High priority",
    shortLabel: "High",
    color: "#f97316",
    Icon: ArrowUp,
  },
  {
    value: "urgent",
    label: "Urgent",
    shortLabel: "Urgent",
    color: "#ef4444",
    Icon: CircleAlert,
  },
];

export const getKanbanPriority = (priority: KanbanPriority) =>
  kanbanPriorities.find((item) => item.value === priority) ??
  kanbanPriorities[0]!;
