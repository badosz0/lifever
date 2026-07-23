import { initialKanbanState } from "./seed";
import type { KanbanState } from "./types";

const STORAGE_KEY = "lifever-kanban-state-v1";

const isStateShape = (value: unknown): value is KanbanState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<KanbanState>;
  return (
    Array.isArray(state.projects) &&
    Array.isArray(state.columns) &&
    Array.isArray(state.labels) &&
    Array.isArray(state.cards)
  );
};

export function readKanbanState(): KanbanState {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (isStateShape(value) && value.projects.length > 0) return value;
  } catch {
    // A local storage issue should not prevent Kanban from opening.
  }
  return initialKanbanState;
}

export function writeKanbanState(state: KanbanState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The in-memory board remains usable when storage is unavailable.
  }
}
