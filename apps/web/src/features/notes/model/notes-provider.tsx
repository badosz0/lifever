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
};

type StoredNotesState = {
  notes?: Note[];
  categories?: NoteCategory[];
  settings?: Partial<NotesSettings>;
  activeFilter?: NotesFilter;
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
  timeout: number;
};

const STORAGE_KEY = "lifever-notes-v1";
const WRITE_DELAY = 250;
const REMOTE_WRITE_DELAY = 400;
const NotesContext = createContext<NotesContextValue | null>(null);

const cloneDemoState = (): HydratedNotesState => ({
  notes: initialNotes.map((note) => ({ ...note })),
  categories: initialNoteCategories.map((category) => ({ ...category })),
  settings: { ...initialNotesSettings },
  activeFilter: "all",
});

const readStoredState = (): HydratedNotesState => {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as StoredNotesState | null;
    const categories =
      stored?.categories?.length ? stored.categories : initialNoteCategories;
    const categoryIds = new Set(categories.map((category) => category.id));
    const notes = (Array.isArray(stored?.notes) ? stored.notes : initialNotes).map(
      (note) => ({
        ...note,
        categoryId: categoryIds.has(note.categoryId)
          ? note.categoryId
          : categories[0]!.id,
      }),
    );
    const requestedDefaultCategoryId = stored?.settings?.defaultCategoryId;
    const defaultCategoryId =
      requestedDefaultCategoryId &&
      categoryIds.has(requestedDefaultCategoryId)
        ? requestedDefaultCategoryId
        : categories[0]!.id;
    const activeFilter =
      stored?.activeFilter === "pinned" ||
      (stored?.activeFilter?.startsWith("category:") &&
        categoryIds.has(stored.activeFilter.slice("category:".length)))
        ? stored.activeFilter
        : "all";

    return {
      notes,
      categories,
      activeFilter,
      settings: {
        sort:
          stored?.settings?.sort === "created" ||
          stored?.settings?.sort === "title"
            ? stored.settings.sort
            : "updated",
        previewLines:
          stored?.settings?.previewLines === 1 ||
          stored?.settings?.previewLines === 3
            ? stored.settings.previewLines
            : 2,
        defaultCategoryId,
        openInPreview:
          typeof stored?.settings?.openInPreview === "boolean"
            ? stored.settings.openInPreview
            : initialNotesSettings.openInPreview,
        spellcheck:
          typeof stored?.settings?.spellcheck === "boolean"
            ? stored.settings.spellcheck
            : initialNotesSettings.spellcheck,
      },
    };
  } catch {
    return cloneDemoState();
  }
};

export function NotesProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
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
  const settingsTimeout = useRef<number | null>(null);
  const pendingSettingsPatch = useRef<Partial<NotesSettings>>({});
  const settingsWriteChain = useRef(Promise.resolve());
  const settingsWriteCount = useRef(0);
  const notesRef = useRef(notes);
  const categoriesRef = useRef(categories);
  const settingsRef = useRef(settings);
  const activeFilterRef = useRef(activeFilter);
  const sessionRef = useRef(session);
  notesRef.current = notes;
  categoriesRef.current = categories;
  settingsRef.current = settings;
  activeFilterRef.current = activeFilter;
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
        setCategories(payload.categories);
        setSettings(payload.settings);
        setActiveFilter("all");
        if (!preserveSelection) setSelectedNoteId(null);
        setHydratedMode(requestedMode);
      } catch {
        if (modeRef.current === requestedMode) {
          toast.error("Notes could not sync", {
            id: "notes-sync-error",
            description: "Your account data was not replaced with local demo data.",
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

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
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

    const localState = readStoredState();
    setNotes(localState.notes);
    setCategories(localState.categories);
    setSettings(localState.settings);
    setActiveFilter(localState.activeFilter);
    setHydratedMode("local");
  }, [isPending, loadRemote, session?.user.id]);

  useEffect(() => {
    if (hydratedMode !== "local" || session || isPending) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ notes, categories, settings, activeFilter }),
        );
      } catch {
        // Notes remain available in memory when persistent storage is blocked.
      }
    }, WRITE_DELAY);
    return () => window.clearTimeout(timeout);
  }, [
    activeFilter,
    categories,
    hydratedMode,
    isPending,
    notes,
    session,
    settings,
  ]);

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
    const reset = () => {
      if (modeRef.current !== "local") return;
      const demo = cloneDemoState();
      setNotes(demo.notes);
      setCategories(demo.categories);
      setSettings(demo.settings);
      setActiveFilter(demo.activeFilter);
      setSelectedNoteId(null);
    };
    window.addEventListener(RESET_DEMO_DATA_EVENT, reset);
    return () => window.removeEventListener(RESET_DEMO_DATA_EVENT, reset);
  }, []);

  const sendNoteUpdate = useCallback(
    (id: string, body: NotePatch) => {
      const create = pendingCreates.current.get(id);
      const previous =
        noteWriteChains.current.get(id) ?? create ?? Promise.resolve();
      const request = previous
        .then(() =>
          apiRequest(`/api/notes/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          }).then(() => undefined),
        )
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
      sendNoteUpdate(id, pending.body);
    },
    [sendNoteUpdate],
  );

  const queueNoteUpdate = useCallback(
    (id: string, body: NotePatch, deferred: boolean) => {
      const pending = pendingUpdates.current.get(id);
      if (pending) window.clearTimeout(pending.timeout);
      const merged = { ...pending?.body, ...body };
      if (!deferred) {
        pendingUpdates.current.delete(id);
        sendNoteUpdate(id, merged);
        return;
      }
      const timeout = window.setTimeout(
        () => flushNoteUpdate(id),
        REMOTE_WRITE_DELAY,
      );
      pendingUpdates.current.set(id, { body: merged, timeout });
    },
    [flushNoteUpdate, sendNoteUpdate],
  );

  useEffect(() => {
    const flush = () => {
      if (modeRef.current === "local") {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              notes: notesRef.current,
              categories: categoriesRef.current,
              settings: settingsRef.current,
              activeFilter: activeFilterRef.current,
            }),
          );
        } catch {
          // The latest in-memory state remains available until close.
        }
      }
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
        .then(() => undefined)
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
        queueNoteUpdate(id, body, textOnly);
      }
    },
    [queueNoteUpdate, session],
  );

  const removeNote = useCallback(
    (id: string) => {
      const removed = notes.find((note) => note.id === id) ?? null;
      if (!removed) return null;
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
      if (categories.length <= 1) return false;
      const fallback = categories.find((category) => category.id !== id);
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
    }),
    [
      activeFilter,
      addCategory,
      addNote,
      categories,
      hydratedMode,
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
