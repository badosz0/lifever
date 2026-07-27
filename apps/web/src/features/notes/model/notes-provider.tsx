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

import { useApps } from "@/features/apps/model/apps-provider";
import type {
  CollaborationPeer,
} from "@/features/collaboration/model/types";
import {
  collaborationRoomKey,
  useLiveCollaboration,
} from "@/features/collaboration/model/use-live-collaboration";
import { SHARING_CHANGED_EVENT } from "@/features/sharing/model/types";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { authClient } from "@/lib/auth-client";
import { ApiRequestError, apiRequest } from "@/lib/api";
import { isDemoMode } from "@/lib/demo-mode";

import {
  initialNoteCategories,
  initialNotes,
  initialNotesSettings,
} from "./seed";
import type {
  Note,
  NoteCategory,
  NotesFilter,
  NotesSettings,
} from "./types";

type NewCategory = Pick<NoteCategory, "name" | "color">;

type NotesContextValue = {
  isReady: boolean;
  notes: Note[];
  categories: NoteCategory[];
  settings: NotesSettings;
  activeFilter: NotesFilter;
  selectedNoteId: string | null;
  liveCollaborators: CollaborationPeer[];
  setActiveFilter: (filter: NotesFilter) => void;
  setSelectedNoteId: (id: string | null) => void;
  addNote: () => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => Note | null;
  restoreNote: (note: Note) => void;
  addCategory: (category: NewCategory) => NoteCategory;
  updateCategory: (id: string, patch: Partial<NoteCategory>) => void;
  removeCategory: (id: string) => boolean;
  updateSettings: (patch: Partial<NotesSettings>) => void;
  canEditNote: (id: string) => boolean;
  isNoteOwner: (id: string) => boolean;
};

type HydratedNotesState = {
  notes: Note[];
  categories: NoteCategory[];
  settings: NotesSettings;
  activeFilter: NotesFilter;
};

type NotesPayload = {
  notes: Note[];
  categories: NoteCategory[];
  settings: NotesSettings;
};

type NotePatch = Partial<
  Pick<Note, "title" | "body" | "categoryId" | "pinned">
>;

type PendingNoteUpdate = {
  body: NotePatch;
  baseUpdatedAt: string;
  timeout: number;
};

const REMOTE_WRITE_DELAY = 400;
const NotesContext = createContext<NotesContextValue | null>(null);

const cloneDemoState = (): HydratedNotesState => ({
  notes: initialNotes.map((note) => ({ ...note })),
  categories: initialNoteCategories.map((category) => ({ ...category })),
  settings: { ...initialNotesSettings },
  activeFilter: "all",
});

export function NotesProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const { activeApp } = useApps();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [settings, setSettings] =
    useState<NotesSettings>(initialNotesSettings);
  const [activeFilter, setActiveFilter] = useState<NotesFilter>("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const pendingCreates = useRef(new Map<string, Promise<void>>());
  const pendingDeletes = useRef(new Map<string, Promise<void>>());
  const noteWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingCategoryCreates = useRef(new Map<string, Promise<void>>());
  const categoryWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingUpdates = useRef(new Map<string, PendingNoteUpdate>());
  const noteVersions = useRef(new Map<string, string>());
  const settingsTimeout = useRef<number | null>(null);
  const pendingSettingsPatch = useRef<Partial<NotesSettings>>({});
  const settingsWriteChain = useRef(Promise.resolve());
  const settingsWriteCount = useRef(0);
  const notesRef = useRef(notes);
  const categoriesRef = useRef(categories);
  const sessionRef = useRef(session);
  notesRef.current = notes;
  categoriesRef.current = categories;
  sessionRef.current = session;

  const loadRemote = useCallback(
    async (userId: string, preserveSelection = false) => {
      const requestedMode = `user:${userId}`;
      const requestedVersion = mutationVersion.current;
      try {
        const payload = await apiRequest<NotesPayload>("/api/notes");
        if (
          modeRef.current !== requestedMode ||
          requestedVersion !== mutationVersion.current
        ) {
          return;
        }
        setNotes(payload.notes);
        noteVersions.current = new Map(
          payload.notes.map((note) => [note.id, note.updatedAt]),
        );
        setCategories(payload.categories);
        setSettings(payload.settings);
        setActiveFilter((current) => {
          if (!preserveSelection) return "all";
          if (
            current.startsWith("category:") &&
            !payload.categories.some(
              (category) =>
                category.id === current.slice("category:".length),
            )
          ) {
            return "all";
          }
          return current;
        });
        setSelectedNoteId((current) =>
          preserveSelection &&
          current &&
          payload.notes.some((note) => note.id === current)
            ? current
            : null,
        );
        setHydratedMode(requestedMode);
      } catch {
        if (modeRef.current === requestedMode) {
          toast.error("Notes could not sync", {
            id: "notes-sync-error",
            description: "Your synced notes remain unchanged.",
          });
        }
      }
    },
    [],
  );

  const recoverRemote = useCallback(
    (userId: string) => {
      toast.error("Notes could not save", {
        id: "notes-sync-error",
        description: "Lifever is refreshing your latest synced copy.",
      });
      void loadRemote(userId, true);
    },
    [loadRemote],
  );

  const selectedSharedNote = useMemo(
    () =>
      notes.find(
        (note) => note.id === selectedNoteId && note.access?.shared,
      ) ?? null,
    [notes, selectedNoteId],
  );
  const collaborationRooms = useMemo(
    () =>
      activeApp === "notes" && selectedSharedNote
        ? [
            {
              resourceType: "note" as const,
              resourceId: selectedSharedNote.id,
              focus: {
                kind: "note" as const,
                id: selectedSharedNote.id,
              },
            },
          ]
        : [],
    [activeApp, selectedSharedNote],
  );
  const handleCollaborationChange = useCallback(
    (message: {
      change: { action: "delete" | "upsert"; data: unknown; entity: string };
      resourceId: string;
    }) => {
      if (message.change.entity === "note-category") {
        if (message.change.action === "delete") {
          const data = message.change.data as {
            categoryId?: unknown;
            replacementCategoryId?: unknown;
          };
          if (
            typeof data.categoryId !== "string" ||
            typeof data.replacementCategoryId !== "string"
          ) {
            return;
          }
          setCategories((current) =>
            current.filter(
              (category) => category.id !== data.categoryId,
            ),
          );
          setNotes((current) =>
            current.map((note) =>
              note.categoryId === data.categoryId
                ? {
                    ...note,
                    categoryId: data.replacementCategoryId as string,
                  }
                : note,
            ),
          );
          return;
        }
        const category = (
          message.change.data as { category?: NoteCategory }
        ).category;
        if (!category) return;
        setCategories((current) =>
          current.some((item) => item.id === category.id)
            ? current.map((item) =>
                item.id === category.id
                  ? { ...category, owned: item.owned }
                  : item,
              )
            : [
                ...current,
                {
                  ...category,
                  owned: selectedSharedNote?.access?.role !== "collaborator",
                },
              ],
        );
        return;
      }
      if (message.change.entity !== "note") return;
      if (message.change.action === "delete") {
        const noteId = (message.change.data as { noteId?: unknown }).noteId;
        if (typeof noteId !== "string") return;
        const pending = pendingUpdates.current.get(noteId);
        if (pending) window.clearTimeout(pending.timeout);
        pendingUpdates.current.delete(noteId);
        noteVersions.current.delete(noteId);
        setNotes((current) =>
          current.filter((note) => note.id !== noteId),
        );
        setSelectedNoteId((current) =>
          current === noteId ? null : current,
        );
        return;
      }

      const changeData = message.change.data as {
        category?: NoteCategory;
        note?: Note;
      };
      const remoteNote = changeData.note;
      if (!remoteNote || remoteNote.id !== message.resourceId) return;
      if (changeData.category) {
        const category = changeData.category;
        setCategories((current) =>
          current.some((item) => item.id === category.id)
            ? current.map((item) =>
                item.id === category.id
                  ? { ...category, owned: item.owned }
                  : item,
              )
            : [
                ...current,
                {
                  ...category,
                  owned:
                    selectedSharedNote?.access?.role !== "collaborator",
                },
              ],
        );
      }
      const hasLocalWrite =
        pendingUpdates.current.has(remoteNote.id) ||
        noteWriteChains.current.has(remoteNote.id);
      if (hasLocalWrite) return;
      noteVersions.current.set(remoteNote.id, remoteNote.updatedAt);
      setNotes((current) =>
        current.map((note) =>
          note.id === remoteNote.id
            ? { ...remoteNote, access: note.access }
            : note,
        ),
      );
    },
    [selectedSharedNote?.access?.role],
  );
  const { peersByRoom: collaborationPeers } = useLiveCollaboration({
    currentUserId: session?.user.id,
    enabled: Boolean(session && collaborationRooms.length > 0),
    rooms: collaborationRooms,
    onResourceChange: handleCollaborationChange,
    onAccessChanged: () => {
      if (session?.user.id) void loadRemote(session.user.id, true);
    },
  });
  const liveCollaborators = selectedSharedNote
    ? collaborationPeers[
        collaborationRoomKey("note", selectedSharedNote.id)
      ] ?? []
    : [];

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "demo";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    setHydratedMode(null);
    setSelectedNoteId(null);

    if (userId) {
      setNotes([]);
      setCategories([]);
      setSettings(initialNotesSettings);
      setActiveFilter("all");
      void loadRemote(userId);
      return;
    }

    if (isDemoMode) {
      const demoState = cloneDemoState();
      setNotes(demoState.notes);
      setCategories(demoState.categories);
      setSettings(demoState.settings);
      setActiveFilter(demoState.activeFilter);
      setHydratedMode("demo");
    } else {
      setNotes([]);
      setCategories([]);
      setSettings(initialNotesSettings);
      setActiveFilter("all");
      setHydratedMode("signed-out");
    }
  }, [isPending, loadRemote, session?.user.id]);

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (
      userId &&
      pendingCreates.current.size === 0 &&
      pendingDeletes.current.size === 0 &&
      noteWriteChains.current.size === 0 &&
      pendingCategoryCreates.current.size === 0 &&
      categoryWriteChains.current.size === 0 &&
      pendingUpdates.current.size === 0 &&
      settingsTimeout.current === null &&
      settingsWriteCount.current === 0
    ) {
      void loadRemote(userId, true);
    }
  }, Boolean(session?.user.id));

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const refresh = () => void loadRemote(userId, true);
    const interval = window.setInterval(() => {
      if (
        activeApp === "notes" &&
        document.visibilityState === "visible" &&
        pendingCreates.current.size === 0 &&
        pendingDeletes.current.size === 0 &&
        noteWriteChains.current.size === 0 &&
        pendingCategoryCreates.current.size === 0 &&
        categoryWriteChains.current.size === 0 &&
        pendingUpdates.current.size === 0 &&
        settingsTimeout.current === null &&
        settingsWriteCount.current === 0
      ) {
        refresh();
      }
    }, 30_000);
    window.addEventListener(SHARING_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(SHARING_CHANGED_EVENT, refresh);
    };
  }, [activeApp, loadRemote, session?.user.id]);

  const sendNoteUpdate = useCallback(
    (id: string, body: NotePatch, baseUpdatedAt: string) => {
      const create = pendingCreates.current.get(id);
      const previous =
        noteWriteChains.current.get(id) ?? create ?? Promise.resolve();
      const save = (version: string) =>
        apiRequest<{ note: Note }>(`/api/notes/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...body, baseUpdatedAt: version }),
          });
      const request = previous
        .then(async () => {
          try {
            return await save(baseUpdatedAt);
          } catch (error) {
            if (
              error instanceof ApiRequestError &&
              error.status === 409 &&
              error.payload &&
              typeof error.payload === "object" &&
              "note" in error.payload
            ) {
              const latest = error.payload.note as Note;
              return save(latest.updatedAt);
            }
            throw error;
          }
        })
        .then(({ note }) => {
          noteVersions.current.set(id, note.updatedAt);
          setNotes((current) =>
            current.map((item) =>
              item.id === id
                ? { ...note, access: item.access ?? note.access }
                : item,
            ),
          );
        })
        .catch(() => {
          const userId = session?.user.id;
          if (userId) recoverRemote(userId);
        });
      noteWriteChains.current.set(id, request);
      void request.finally(() => {
        if (noteWriteChains.current.get(id) === request) {
          noteWriteChains.current.delete(id);
        }
      });
    },
    [recoverRemote, session?.user.id],
  );

  const flushNoteUpdate = useCallback(
    (id: string) => {
      const pending = pendingUpdates.current.get(id);
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      pendingUpdates.current.delete(id);
      sendNoteUpdate(id, pending.body, pending.baseUpdatedAt);
    },
    [sendNoteUpdate],
  );

  const queueNoteUpdate = useCallback(
    (
      id: string,
      body: NotePatch,
      deferred: boolean,
      baseUpdatedAt: string,
    ) => {
      const pending = pendingUpdates.current.get(id);
      if (pending) window.clearTimeout(pending.timeout);
      const merged = { ...pending?.body, ...body };
      if (!deferred) {
        pendingUpdates.current.delete(id);
        sendNoteUpdate(id, merged, pending?.baseUpdatedAt ?? baseUpdatedAt);
        return;
      }
      const timeout = window.setTimeout(
        () => flushNoteUpdate(id),
        REMOTE_WRITE_DELAY,
      );
      pendingUpdates.current.set(id, {
        body: merged,
        baseUpdatedAt: pending?.baseUpdatedAt ?? baseUpdatedAt,
        timeout,
      });
    },
    [flushNoteUpdate, sendNoteUpdate],
  );

  useEffect(() => {
    const flush = () => {
      for (const id of pendingUpdates.current.keys()) flushNoteUpdate(id);
      const remoteSession = sessionRef.current;
      if (
        remoteSession &&
        Object.keys(pendingSettingsPatch.current).length > 0
      ) {
        if (settingsTimeout.current) {
          window.clearTimeout(settingsTimeout.current);
          settingsTimeout.current = null;
        }
        const body = pendingSettingsPatch.current;
        pendingSettingsPatch.current = {};
        settingsWriteCount.current += 1;
        settingsWriteChain.current = settingsWriteChain.current
          .then(() =>
            apiRequest("/api/notes/settings", {
              method: "PATCH",
              body: JSON.stringify(body),
              keepalive: true,
            }),
          )
          .then(() => undefined, () => undefined)
          .finally(() => {
            settingsWriteCount.current -= 1;
          });
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      for (const pending of pendingUpdates.current.values()) {
        window.clearTimeout(pending.timeout);
      }
      if (settingsTimeout.current) window.clearTimeout(settingsTimeout.current);
    };
  }, [flushNoteUpdate]);

  const addNote = useCallback(() => {
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title: "",
      body: "",
      categoryId: settings.defaultCategoryId,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      ...(session
        ? {
            access: {
              role: "owner" as const,
              permission: "write" as const,
              shareId: null,
              shared: false,
              owner: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                image: session.user.image ?? null,
              },
            },
          }
        : {}),
    };
    mutationVersion.current += 1;
    setNotes((current) => [note, ...current]);
    setActiveFilter("all");
    setSelectedNoteId(note.id);

    if (session) {
      const request = apiRequest<{ note: Note }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          id: note.id,
          title: note.title,
          body: note.body,
          categoryId: note.categoryId,
          pinned: note.pinned,
        }),
      })
        .then(({ note: savedNote }) => {
          noteVersions.current.set(note.id, savedNote.updatedAt);
        })
        .catch(() => recoverRemote(session.user.id))
        .finally(() => {
          pendingCreates.current.delete(note.id);
        });
      pendingCreates.current.set(note.id, request);
    }
    return note;
  }, [recoverRemote, session, settings.defaultCategoryId]);

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      const existing = notesRef.current.find((note) => note.id === id);
      if (!existing || existing.access?.permission === "read") return;
      const updatedAt = new Date().toISOString();
      mutationVersion.current += 1;
      setNotes((current) =>
        current.map((note) =>
          note.id === id ? { ...note, ...patch, updatedAt } : note,
        ),
      );
      if (session) {
        const body: NotePatch = {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.body !== undefined ? { body: patch.body } : {}),
          ...(patch.categoryId !== undefined
            ? { categoryId: patch.categoryId }
            : {}),
          ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        };
        const textOnly = Object.keys(body).every(
          (key) => key === "title" || key === "body",
        );
        queueNoteUpdate(
          id,
          body,
          textOnly,
          noteVersions.current.get(id) ?? existing.updatedAt,
        );
      }
    },
    [queueNoteUpdate, session],
  );

  const removeNote = useCallback(
    (id: string) => {
      const removed = notes.find((note) => note.id === id) ?? null;
      if (!removed) return null;
      if (removed.access?.role === "collaborator") return null;
      const nextNote = notes.find((note) => note.id !== id) ?? null;
      mutationVersion.current += 1;
      const pending = pendingUpdates.current.get(id);
      if (pending) {
        window.clearTimeout(pending.timeout);
        pendingUpdates.current.delete(id);
      }
      setNotes((current) => current.filter((note) => note.id !== id));
      setSelectedNoteId((current) =>
        current === id ? nextNote?.id ?? null : current,
      );
      if (session) {
        const previous =
          noteWriteChains.current.get(id) ??
          pendingCreates.current.get(id) ??
          Promise.resolve();
        const request = previous
          .then(() => apiRequest(`/api/notes/${id}`, { method: "DELETE" }))
          .then(() => undefined)
          .catch(() => recoverRemote(session.user.id))
          .finally(() => pendingDeletes.current.delete(id));
        pendingDeletes.current.set(id, request);
      }
      return removed;
    },
    [notes, recoverRemote, session],
  );

  const restoreNote = useCallback(
    (note: Note) => {
      mutationVersion.current += 1;
      setNotes((current) => [
        note,
        ...current.filter((item) => item.id !== note.id),
      ]);
      if (session) {
        const deletion = pendingDeletes.current.get(note.id);
        void (deletion ?? Promise.resolve())
          .then(() =>
            apiRequest("/api/notes", {
              method: "POST",
              body: JSON.stringify({
                id: note.id,
                title: note.title,
                body: note.body,
                categoryId: note.categoryId,
                pinned: note.pinned,
              }),
            }),
          )
          .catch(() => recoverRemote(session.user.id));
      }
    },
    [recoverRemote, session],
  );

  const addCategory = useCallback(
    (input: NewCategory) => {
      const category: NoteCategory = {
        id: crypto.randomUUID(),
        name: input.name,
        color: input.color,
      };
      mutationVersion.current += 1;
      setCategories((current) => [...current, category]);
      if (session) {
        const request = apiRequest("/api/notes/categories", {
          method: "POST",
          body: JSON.stringify(category),
        })
          .then(() => undefined)
          .catch(() => recoverRemote(session.user.id))
          .finally(() => pendingCategoryCreates.current.delete(category.id));
        pendingCategoryCreates.current.set(category.id, request);
      }
      return category;
    },
    [recoverRemote, session],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<NoteCategory>) => {
      const category = categoriesRef.current.find((item) => item.id === id);
      if (!category || category.owned === false) return;
      mutationVersion.current += 1;
      setCategories((current) =>
        current.map((category) =>
          category.id === id ? { ...category, ...patch, id } : category,
        ),
      );
      if (session) {
        const body = {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.color !== undefined ? { color: patch.color } : {}),
        };
        if (Object.keys(body).length > 0) {
          const previous =
            categoryWriteChains.current.get(id) ??
            pendingCategoryCreates.current.get(id) ??
            Promise.resolve();
          const request = previous
            .then(() =>
              apiRequest(`/api/notes/categories/${id}`, {
                method: "PATCH",
                body: JSON.stringify(body),
              }).then(() => undefined),
            )
            .catch(() => recoverRemote(session.user.id));
          categoryWriteChains.current.set(id, request);
          void request.finally(() => {
            if (categoryWriteChains.current.get(id) === request) {
              categoryWriteChains.current.delete(id);
            }
          });
        }
      }
    },
    [recoverRemote, session],
  );

  const removeCategory = useCallback(
    (id: string) => {
      const ownedCategories = categories.filter(
        (category) => category.owned !== false,
      );
      if (
        ownedCategories.length <= 1 ||
        !ownedCategories.some((category) => category.id === id)
      ) {
        return false;
      }
      const fallback = ownedCategories.find((category) => category.id !== id);
      if (!fallback) return false;
      mutationVersion.current += 1;
      setCategories((current) =>
        current.filter((category) => category.id !== id),
      );
      setNotes((current) =>
        current.map((note) =>
          note.categoryId === id
            ? {
                ...note,
                categoryId: fallback.id,
                updatedAt: new Date().toISOString(),
              }
            : note,
        ),
      );
      setSettings((current) => ({
        ...current,
        defaultCategoryId:
          current.defaultCategoryId === id
            ? fallback.id
            : current.defaultCategoryId,
      }));
      setActiveFilter((current) =>
        current === `category:${id}` ? "all" : current,
      );
      if (session) {
        const previous =
          categoryWriteChains.current.get(id) ??
          pendingCategoryCreates.current.get(id) ??
          Promise.resolve();
        void previous
          .then(() =>
            apiRequest(`/api/notes/categories/${id}`, {
              method: "DELETE",
            }),
          )
          .catch(() => recoverRemote(session.user.id));
      }
      return true;
    },
    [categories, recoverRemote, session],
  );

  const updateSettings = useCallback(
    (patch: Partial<NotesSettings>) => {
      mutationVersion.current += 1;
      setSettings((current) => ({ ...current, ...patch }));
      if (!session || Object.keys(patch).length === 0) return;
      pendingSettingsPatch.current = {
        ...pendingSettingsPatch.current,
        ...patch,
      };
      if (settingsTimeout.current) window.clearTimeout(settingsTimeout.current);
      settingsTimeout.current = window.setTimeout(() => {
        settingsTimeout.current = null;
        const body = pendingSettingsPatch.current;
        pendingSettingsPatch.current = {};
        settingsWriteCount.current += 1;
        const request = settingsWriteChain.current.then(() =>
          apiRequest("/api/notes/settings", {
            method: "PATCH",
            body: JSON.stringify(body),
          }),
        );
        settingsWriteChain.current = request.then(
          () => undefined,
          () => undefined,
        );
        void request
          .catch(() => recoverRemote(session.user.id))
          .finally(() => {
            settingsWriteCount.current -= 1;
          });
      }, REMOTE_WRITE_DELAY);
    },
    [recoverRemote, session],
  );

  const value = useMemo<NotesContextValue>(
    () => ({
      isReady: hydratedMode !== null && categories.length > 0,
      notes,
      categories,
      settings,
      activeFilter,
      selectedNoteId,
      liveCollaborators,
      setActiveFilter,
      setSelectedNoteId,
      addNote,
      updateNote,
      removeNote,
      restoreNote,
      addCategory,
      updateCategory,
      removeCategory,
      updateSettings,
      canEditNote: (id) =>
        notes.find((note) => note.id === id)?.access?.permission !== "read",
      isNoteOwner: (id) =>
        notes.find((note) => note.id === id)?.access?.role !== "collaborator",
    }),
    [
      activeFilter,
      addCategory,
      addNote,
      categories,
      hydratedMode,
      liveCollaborators,
      notes,
      removeCategory,
      removeNote,
      restoreNote,
      selectedNoteId,
      settings,
      updateCategory,
      updateNote,
      updateSettings,
    ],
  );

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) throw new Error("useNotes must be used inside NotesProvider");
  return context;
}
