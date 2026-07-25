import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { RESET_DEMO_DATA_EVENT } from "@/features/settings/lib/demo-data";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

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
const REMOTE_WRITE_DELAY = 400;
const ACTIVE_PROJECT_KEY = "lifever-kanban-active-project";
const emptyKanbanState: KanbanState = {
  projects: [],
  columns: [],
  labels: [],
  cards: [],
};

type KanbanWorkspacePayload = {
  workspace: {
    state: KanbanState;
    updatedAt: string;
  };
};

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
  const { data: session, isPending } = authClient.useSession();
  const [state, setState] = useState<KanbanState>(emptyKanbanState);
  const [activeProjectId, setActiveProjectIdState] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const applyingRemoteState = useRef(false);
  const lastRemoteSnapshot = useRef("");
  const lastRemoteState = useRef<KanbanState | null>(null);
  const lastRemoteUpdatedAt = useRef("");
  const pendingRemoteSave = useRef<number | null>(null);
  const remoteSaveChain = useRef(Promise.resolve());
  const remoteSaveCount = useRef(0);
  const stateRef = useRef(state);
  const activeProjectIdRef = useRef(activeProjectId);
  const sessionRef = useRef(session);
  stateRef.current = state;
  activeProjectIdRef.current = activeProjectId;
  sessionRef.current = session;

  const loadRemote = useCallback(
    async (userId: string, preserveSelection = false) => {
      const requestedMode = `user:${userId}`;
      const requestedVersion = mutationVersion.current;
      try {
        const { workspace } =
          await apiRequest<KanbanWorkspacePayload>("/api/kanban");
        if (
          modeRef.current !== requestedMode ||
          requestedVersion !== mutationVersion.current
        ) {
          return;
        }
        const snapshot = JSON.stringify(workspace.state);
        applyingRemoteState.current = true;
        lastRemoteSnapshot.current = snapshot;
        lastRemoteState.current = workspace.state;
        lastRemoteUpdatedAt.current = workspace.updatedAt;
        setState(workspace.state);
        setActiveProjectIdState((current) =>
          workspace.state.projects.some((project) => project.id === current)
            ? current
            : workspace.state.projects[0]?.id ?? "",
        );
        if (!preserveSelection) setSelectedCardId(null);
        setHydratedMode(requestedMode);
      } catch {
        if (modeRef.current === requestedMode) {
          toast.error("Kanban could not sync", {
            id: "kanban-sync-error",
            description: "Check your connection and try again.",
          });
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    setHydratedMode(null);
    setSelectedCardId(null);
    if (pendingRemoteSave.current) {
      window.clearTimeout(pendingRemoteSave.current);
      pendingRemoteSave.current = null;
    }
    if (userId) {
      setState(emptyKanbanState);
      setActiveProjectIdState("");
      void loadRemote(userId);
    } else {
      const localState = readKanbanState();
      setState(localState);
      setActiveProjectIdState(readActiveProject(localState));
      setHydratedMode("local");
    }
  }, [isPending, loadRemote, session?.user.id]);

  useEffect(() => {
    if (hydratedMode !== "local" || session || isPending) return;
    const timeout = window.setTimeout(() => writeKanbanState(state), WRITE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [hydratedMode, isPending, session, state]);

  useEffect(() => {
    if (hydratedMode !== "local" || session || isPending || !activeProjectId) {
      return;
    }
    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    } catch {
      // The in-memory selection remains available.
    }
  }, [activeProjectId, hydratedMode, isPending, session]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || hydratedMode !== `user:${userId}`) return;
    if (applyingRemoteState.current) {
      applyingRemoteState.current = false;
      return;
    }
    const snapshot = JSON.stringify(state);
    if (snapshot === lastRemoteSnapshot.current) return;
    mutationVersion.current += 1;
    if (pendingRemoteSave.current) {
      window.clearTimeout(pendingRemoteSave.current);
    }
    pendingRemoteSave.current = window.setTimeout(() => {
      pendingRemoteSave.current = null;
      remoteSaveCount.current += 1;
      const request = remoteSaveChain.current.then(() =>
        apiRequest<KanbanWorkspacePayload>("/api/kanban", {
          method: "PUT",
          body: JSON.stringify({
            state,
            baseUpdatedAt: lastRemoteUpdatedAt.current,
          }),
          keepalive: true,
        }),
      );
      remoteSaveChain.current = request.then(
        () => undefined,
        () => undefined,
      );
      void request.then(
        ({ workspace }) => {
          lastRemoteSnapshot.current = snapshot;
          lastRemoteState.current = state;
          lastRemoteUpdatedAt.current = workspace.updatedAt;
        },
        () => {
          const remoteState = lastRemoteState.current;
          if (remoteState) {
            applyingRemoteState.current = true;
            setState(remoteState);
            setActiveProjectIdState((current) =>
              remoteState.projects.some((project) => project.id === current)
                ? current
                : remoteState.projects[0]?.id ?? "",
            );
            setSelectedCardId((current) =>
              current && remoteState.cards.some((card) => card.id === current)
                ? current
                : null,
            );
          }
          toast.error("Kanban could not save", {
            id: "kanban-sync-error",
            description:
              "The latest server version was restored so another device is not overwritten.",
          });
          void loadRemote(userId, true);
        },
      ).finally(() => {
        remoteSaveCount.current -= 1;
      });
    }, REMOTE_WRITE_DELAY);
    return () => {
      if (pendingRemoteSave.current) {
        window.clearTimeout(pendingRemoteSave.current);
        pendingRemoteSave.current = null;
      }
    };
  }, [hydratedMode, loadRemote, session?.user.id, state]);

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (
      userId &&
      pendingRemoteSave.current === null &&
      remoteSaveCount.current === 0
    ) {
      void loadRemote(userId, true);
    }
  }, Boolean(session?.user.id));

  useEffect(() => {
    const flush = () => {
      if (modeRef.current === "local") {
        writeKanbanState(stateRef.current);
        try {
          localStorage.setItem(
            ACTIVE_PROJECT_KEY,
            activeProjectIdRef.current,
          );
        } catch {
          // The latest in-memory selection remains available until close.
        }
        return;
      }
      if (!sessionRef.current) return;
      if (pendingRemoteSave.current) {
        window.clearTimeout(pendingRemoteSave.current);
        pendingRemoteSave.current = null;
      }
      void remoteSaveChain.current.then(() =>
        apiRequest("/api/kanban", {
          method: "PUT",
          body: JSON.stringify({
            state: stateRef.current,
            baseUpdatedAt: lastRemoteUpdatedAt.current,
          }),
          keepalive: true,
        }),
      );
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  useEffect(() => {
    const reset = () => {
      if (modeRef.current !== "local") return;
      const demo: KanbanState = {
        projects: initialKanbanState.projects.map((project) => ({ ...project })),
        columns: initialKanbanState.columns.map((column) => ({ ...column })),
        labels: initialKanbanState.labels.map((label) => ({ ...label })),
        cards: initialKanbanState.cards.map((card) => ({
          ...card,
          labelIds: [...card.labelIds],
        })),
      };
      setState(demo);
      setActiveProjectIdState(readActiveProject(demo));
      setSelectedCardId(null);
    };
    window.addEventListener(RESET_DEMO_DATA_EVENT, reset);
    return () => window.removeEventListener(RESET_DEMO_DATA_EVENT, reset);
  }, []);

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
