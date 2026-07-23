export type Reminder = {
  id: string;
  title: string;
  notes: string;
  dueAt: string | null;
  completedAt: string | null;
  important: boolean;
  createdAt: string;
};

export type ReminderViewId = "today" | "all" | "completed";
