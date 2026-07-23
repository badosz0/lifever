import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { readKanbanState, writeKanbanState } from "./storage";
import { initialKanbanState } from "./seed";
import type {
  KanbanCard,
  KanbanColumn,
  KanbanLabel,
  KanbanProject,
  KanbanState,
  NewKanbanCard,
  NewKanbanProject,
} from "./types";

const WRITE_DELAY = 250;
const ACTIVE_PROJECT_KEY = "lifever-kanban-active-project";

type KanbanContextValue = KanbanState & {
  activeProjectId: string;
  selectedCardId: string | null;
  setActiveProjectId: (id: string) => void;
  setSelectedCardId: (id: string | null) => void;
  addProject: (input: NewKanbanProject) => KanbanProject;
  updateProject: (id: string, patch: Partial<NewKanbanProject>) => void;
  removeProject: (id: string) => boolean;
  addColumn: (
    projectId: string,
    input?: Partial<Pick<KanbanColumn, "name" | "color" | "wipLimit" | "isDone">>,
  ) => KanbanColumn;
  updateColumn: (
    id: string,
    patch: Partial<Pick<KanbanColumn, "name" | "color" | "wipLimit" | "isDone">>,
  ) => void;
  removeColumn: (id: string) => boolean;
  moveColumn: (id: string, destinationIndex: number) => void;
  addLabel: (
    projectId: string,
    input?: Partial<Pick<KanbanLabel, "name" | "color">>,
  ) => KanbanLabel;
  updateLabel: (
    id: string,
    patch: Partial<Pick<KanbanLabel, "name" | "color">>,
  ) => void;
  removeLabel: (id: string) => void;
  addCard: (input: NewKanbanCard) => KanbanCard;
  updateCard: (id: string, patch: Partial<KanbanCard>) => void;
  removeCard: (id: string) => KanbanCard | null;
  restoreCard: (card: KanbanCard) => void;
  duplicateCard: (id: string) => KanbanCard | null;
  moveCard: (id: string, columnId: string, destinationIndex: number) => void;
};

const KanbanContext = createContext<KanbanContextValue | null>(null);

const nextPosition = (items: { position: number }[]) =>
  items.reduce((largest, item) => Math.max(largest, item.position), -1) + 1;

const readActiveProject = (state: KanbanState) => {
  try {
    const stored = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (stored && state.projects.some((project) => project.id === stored)) {
      return stored;
    }
  } catch {
    // Fall through to the first project.
  }
  return (
    [...state.projects].sort((a, b) => a.position - b.position)[0]?.id ??
    initialKanbanState.projects[0]!.id
  );
};

const createDefaultColumns = (projectId: string): KanbanColumn[] => [
  {
    id: crypto.randomUUID(),
    projectId,
    name: "Backlog",
    color: "#64748b",
    position: 0,
    wipLimit: null,
    isDone: false,
  },
  {
    id: crypto.randomUUID(),
    projectId,
    name: "In progress",
    color: "#3b82f6",
    position: 1,
    wipLimit: 4,
    isDone: false,
  },
  {
    id: crypto.randomUUID(),
    projectId,
    name: "Done",
    color: "#10b981",
    position: 2,
    wipLimit: null,
    isDone: true,
  },
];

export function KanbanProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<KanbanState>(readKanbanState);
  const [activeProjectId, setActiveProjectIdState] = useState(() =>
    readActiveProject(state),
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => writeKanbanState(state), WRITE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    } catch {
      // The in-memory selection remains available.
    }
  }, [activeProjectId]);

  const setActiveProjectId = useCallback(
    (id: string) => {
      if (!state.projects.some((project) => project.id === id)) return;
      setActiveProjectIdState(id);
      setSelectedCardId(null);
    },
    [state.projects],
  );

  const addProject = useCallback(
    (input: NewKanbanProject) => {
      const timestamp = new Date().toISOString();
      const project: KanbanProject = {
        id: crypto.randomUUID(),
        name: input.name.trim() || "Untitled project",
        description: input.description.trim(),
        color: input.color,
        position: nextPosition(state.projects),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const columns = createDefaultColumns(project.id);
      setState((current) => ({
        ...current,
        projects: [...current.projects, project],
        columns: [...current.columns, ...columns],
      }));
      setActiveProjectIdState(project.id);
      setSelectedCardId(null);
      return project;
    },
    [state.projects],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<NewKanbanProject>) => {
      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === id
            ? { ...project, ...patch, updatedAt: new Date().toISOString() }
            : project,
        ),
      }));
    },
    [],
  );

  const removeProject = useCallback(
    (id: string) => {
      if (state.projects.length <= 1 || !state.projects.some((item) => item.id === id)) {
        return false;
      }
      const nextProject = [...state.projects]
        .sort((a, b) => a.position - b.position)
        .find((item) => item.id !== id);
      if (!nextProject) return false;
      setState((current) => ({
        projects: current.projects.filter((item) => item.id !== id),
        columns: current.columns.filter((item) => item.projectId !== id),
        labels: current.labels.filter((item) => item.projectId !== id),
        cards: current.cards.filter((item) => item.projectId !== id),
      }));
      if (activeProjectId === id) setActiveProjectIdState(nextProject.id);
      setSelectedCardId(null);
      return true;
    },
    [activeProjectId, state.projects],
  );

  const addColumn = useCallback(
    (
      projectId: string,
      input: Partial<
        Pick<KanbanColumn, "name" | "color" | "wipLimit" | "isDone">
      > = {},
    ) => {
      const projectColumns = state.columns.filter(
        (column) => column.projectId === projectId,
      );
      const column: KanbanColumn = {
        id: crypto.randomUUID(),
        projectId,
        name: input.name?.trim() || "New status",
        color: input.color ?? "#64748b",
        position: nextPosition(projectColumns),
        wipLimit: input.wipLimit ?? null,
        isDone: input.isDone ?? false,
      };
      setState((current) => ({
        ...current,
        columns: [...current.columns, column],
      }));
      return column;
    },
    [state.columns],
  );

  const updateColumn = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<KanbanColumn, "name" | "color" | "wipLimit" | "isDone">
      >,
    ) => {
      setState((current) => ({
        ...current,
        columns: current.columns.map((column) =>
          column.id === id ? { ...column, ...patch } : column,
        ),
      }));
    },
    [],
  );

  const removeColumn = useCallback(
    (id: string) => {
      const column = state.columns.find((item) => item.id === id);
      if (!column) return false;
      const siblings = state.columns
        .filter((item) => item.projectId === column.projectId && item.id !== id)
        .sort((a, b) => a.position - b.position);
      if (siblings.length === 0) return false;
      const replacement = siblings[0];
      if (!replacement) return false;
      const movedCards = state.cards
        .filter((card) => card.columnId === id)
        .sort((a, b) => a.position - b.position);
      const replacementCards = state.cards.filter(
        (card) => card.columnId === replacement.id,
      );
      setState((current) => ({
        ...current,
        columns: current.columns.filter((item) => item.id !== id),
        cards: current.cards.map((card) => {
          const offset = movedCards.findIndex((item) => item.id === card.id);
          return offset === -1
            ? card
            : {
                ...card,
                columnId: replacement.id,
                position: replacementCards.length + offset,
                updatedAt: new Date().toISOString(),
              };
        }),
      }));
      return true;
    },
    [state.cards, state.columns],
  );

  const moveColumn = useCallback(
    (id: string, destinationIndex: number) => {
      setState((current) => {
        const column = current.columns.find((item) => item.id === id);
        if (!column) return current;
        const siblings = current.columns
          .filter((item) => item.projectId === column.projectId)
          .sort((a, b) => a.position - b.position);
        const sourceIndex = siblings.findIndex((item) => item.id === id);
        if (sourceIndex < 0) return current;
        const boundedIndex = Math.max(
          0,
          Math.min(destinationIndex, siblings.length - 1),
        );
        const reordered = [...siblings];
        const [moved] = reordered.splice(sourceIndex, 1);
        if (!moved) return current;
        reordered.splice(boundedIndex, 0, moved);
        const positions = new Map(
          reordered.map((item, index) => [item.id, index]),
        );
        return {
          ...current,
          columns: current.columns.map((item) =>
            positions.has(item.id)
              ? { ...item, position: positions.get(item.id)! }
              : item,
          ),
        };
      });
    },
    [],
  );

  const addLabel = useCallback(
    (
      projectId: string,
      input: Partial<Pick<KanbanLabel, "name" | "color">> = {},
    ) => {
      const projectLabels = state.labels.filter(
        (label) => label.projectId === projectId,
      );
      const label: KanbanLabel = {
        id: crypto.randomUUID(),
        projectId,
        name: input.name?.trim() || "New label",
        color: input.color ?? "#8b5cf6",
        position: nextPosition(projectLabels),
      };
      setState((current) => ({
        ...current,
        labels: [...current.labels, label],
      }));
      return label;
    },
    [state.labels],
  );

  const updateLabel = useCallback(
    (id: string, patch: Partial<Pick<KanbanLabel, "name" | "color">>) => {
      setState((current) => ({
        ...current,
        labels: current.labels.map((label) =>
          label.id === id ? { ...label, ...patch } : label,
        ),
      }));
    },
    [],
  );

  const removeLabel = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      labels: current.labels.filter((label) => label.id !== id),
      cards: current.cards.map((card) =>
        card.labelIds.includes(id)
          ? { ...card, labelIds: card.labelIds.filter((labelId) => labelId !== id) }
          : card,
      ),
    }));
  }, []);

  const addCard = useCallback(
    (input: NewKanbanCard) => {
      const timestamp = new Date().toISOString();
      const columnCards = state.cards.filter(
        (card) => card.columnId === input.columnId,
      );
      const card: KanbanCard = {
        id: crypto.randomUUID(),
        ...input,
        title: input.title.trim() || "Untitled card",
        description: input.description.trim(),
        position: nextPosition(columnCards),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setState((current) => ({ ...current, cards: [...current.cards, card] }));
      setSelectedCardId(card.id);
      return card;
    },
    [state.cards],
  );

  const updateCard = useCallback((id: string, patch: Partial<KanbanCard>) => {
    setState((current) => ({
      ...current,
      cards: current.cards.map((card) =>
        card.id === id
          ? { ...card, ...patch, updatedAt: new Date().toISOString() }
          : card,
      ),
    }));
  }, []);

  const removeCard = useCallback(
    (id: string) => {
      const card = state.cards.find((item) => item.id === id) ?? null;
      setState((current) => ({
        ...current,
        cards: current.cards.filter((item) => item.id !== id),
      }));
      setSelectedCardId((current) => (current === id ? null : current));
      return card;
    },
    [state.cards],
  );

  const restoreCard = useCallback((card: KanbanCard) => {
    setState((current) => {
      if (current.cards.some((item) => item.id === card.id)) return current;
      return { ...current, cards: [...current.cards, card] };
    });
  }, []);

  const duplicateCard = useCallback(
    (id: string) => {
      const source = state.cards.find((card) => card.id === id);
      if (!source) return null;
      return addCard({
        projectId: source.projectId,
        columnId: source.columnId,
        title: `${source.title} copy`,
        description: source.description,
        priority: source.priority,
        dueDate: source.dueDate,
        labelIds: source.labelIds,
      });
    },
    [addCard, state.cards],
  );

  const moveCard = useCallback(
    (id: string, columnId: string, destinationIndex: number) => {
      setState((current) => {
        const card = current.cards.find((item) => item.id === id);
        const destinationColumn = current.columns.find(
          (item) => item.id === columnId,
        );
        if (!card || !destinationColumn || card.projectId !== destinationColumn.projectId) {
          return current;
        }

        const sourceCards = current.cards
          .filter((item) => item.columnId === card.columnId && item.id !== id)
          .sort((a, b) => a.position - b.position);
        const destinationCards =
          card.columnId === columnId
            ? sourceCards
            : current.cards
                .filter((item) => item.columnId === columnId && item.id !== id)
                .sort((a, b) => a.position - b.position);
        const boundedIndex = Math.max(
          0,
          Math.min(destinationIndex, destinationCards.length),
        );
        const reorderedDestination = [...destinationCards];
        reorderedDestination.splice(boundedIndex, 0, {
          ...card,
          columnId,
          updatedAt: new Date().toISOString(),
        });
        const destinationPositions = new Map(
          reorderedDestination.map((item, index) => [item.id, index]),
        );
        const sourcePositions =
          card.columnId === columnId
            ? new Map<string, number>()
            : new Map(sourceCards.map((item, index) => [item.id, index]));

        return {
          ...current,
          cards: current.cards.map((item) => {
            if (destinationPositions.has(item.id)) {
              return {
                ...item,
                columnId,
                position: destinationPositions.get(item.id)!,
                ...(item.id === id
                  ? { updatedAt: new Date().toISOString() }
                  : {}),
              };
            }
            if (sourcePositions.has(item.id)) {
              return { ...item, position: sourcePositions.get(item.id)! };
            }
            return item;
          }),
        };
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      activeProjectId,
      selectedCardId,
      setActiveProjectId,
      setSelectedCardId,
      addProject,
      updateProject,
      removeProject,
      addColumn,
      updateColumn,
      removeColumn,
      moveColumn,
      addLabel,
      updateLabel,
      removeLabel,
      addCard,
      updateCard,
      removeCard,
      restoreCard,
      duplicateCard,
      moveCard,
    }),
    [
      activeProjectId,
      addCard,
      addColumn,
      addLabel,
      addProject,
      duplicateCard,
      moveCard,
      moveColumn,
      removeCard,
      removeColumn,
      removeLabel,
      removeProject,
      restoreCard,
      selectedCardId,
      setActiveProjectId,
      state,
      updateCard,
      updateColumn,
      updateLabel,
      updateProject,
    ],
  );

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>;
}

export function useKanban() {
  const context = useContext(KanbanContext);
  if (!context) throw new Error("useKanban must be used inside KanbanProvider");
  return context;
}
