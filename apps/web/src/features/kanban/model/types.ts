export type KanbanPriority = "none" | "low" | "medium" | "high" | "urgent";

export type KanbanProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type KanbanColumn = {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  wipLimit: number | null;
  isDone: boolean;
};

export type KanbanLabel = {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
};

export type KanbanCard = {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: KanbanPriority;
  dueDate: string | null;
  labelIds: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type KanbanState = {
  projects: KanbanProject[];
  columns: KanbanColumn[];
  labels: KanbanLabel[];
  cards: KanbanCard[];
};

export type NewKanbanProject = Pick<
  KanbanProject,
  "name" | "description" | "color"
>;

export type NewKanbanCard = Pick<
  KanbanCard,
  | "projectId"
  | "columnId"
  | "title"
  | "description"
  | "priority"
  | "dueDate"
  | "labelIds"
>;
