import type { KanbanState } from "@/features/kanban/model/types";

const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const mergeCollection = <T extends { id: string }>(
  baseItems: T[],
  localItems: T[],
  remoteItems: T[],
) => {
  const base = new Map(baseItems.map((item) => [item.id, item]));
  const local = new Map(localItems.map((item) => [item.id, item]));
  const remote = new Map(remoteItems.map((item) => [item.id, item]));
  const ids = new Set([...base.keys(), ...remote.keys(), ...local.keys()]);
  const merged: T[] = [];

  for (const id of ids) {
    const before = base.get(id);
    const here = local.get(id);
    const there = remote.get(id);
    if (!before) {
      if (here && there) merged.push({ ...there, ...here });
      else if (here) merged.push(here);
      else if (there) merged.push(there);
      continue;
    }
    if (!here && !there) continue;
    if (!here) {
      if (there && !same(there, before)) merged.push(there);
      continue;
    }
    if (!there) {
      if (!same(here, before)) merged.push(here);
      continue;
    }

    const next = { ...there } as T;
    const writableNext = next as Record<keyof T, T[keyof T]>;
    for (const key of Object.keys(here) as Array<keyof T>) {
      if (!same(here[key], before[key])) {
        writableNext[key] = here[key];
      }
    }
    merged.push(next);
  }
  return merged;
};

export const mergeKanbanStates = (
  base: KanbanState,
  local: KanbanState,
  remote: KanbanState,
): KanbanState => {
  const projects = mergeCollection(
    base.projects,
    local.projects,
    remote.projects,
  );
  const projectIds = new Set(projects.map((project) => project.id));
  const columns = mergeCollection(
    base.columns,
    local.columns,
    remote.columns,
  ).filter((column) => projectIds.has(column.projectId));
  const columnIds = new Set(columns.map((column) => column.id));
  const labels = mergeCollection(
    base.labels,
    local.labels,
    remote.labels,
  ).filter((label) => projectIds.has(label.projectId));
  const labelIds = new Set(labels.map((label) => label.id));
  const cards = mergeCollection(base.cards, local.cards, remote.cards)
    .filter(
      (card) =>
        projectIds.has(card.projectId) && columnIds.has(card.columnId),
    )
    .map((card) => ({
      ...card,
      labelIds: card.labelIds.filter((id) => labelIds.has(id)),
    }));
  return { projects, columns, labels, cards };
};
