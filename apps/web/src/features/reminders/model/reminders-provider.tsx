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

import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";
import { RESET_DEMO_DATA_EVENT } from "@/features/settings/lib/demo-data";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";

import { initialReminders } from "./seed";
import type { Reminder, ReminderViewId } from "./types";

type NewReminder = Pick<Reminder, "title" | "dueAt">;

type RemindersContextValue = {
  isReady: boolean;
  reminders: Reminder[];
  activeView: ReminderViewId;
  selectedReminderId: string | null;
  setActiveView: (view: ReminderViewId) => void;
  setSelectedReminderId: (id: string | null) => void;
  addReminder: (reminder: NewReminder) => Reminder;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  removeReminder: (id: string) => Reminder | null;
  clearCompletedReminders: () => number;
  restoreReminder: (reminder: Reminder) => void;
};

const RemindersContext = createContext<RemindersContextValue | null>(null);

type ApiReminder = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  completedAt: string | null;
  important: boolean;
  createdAt: string;
};

type ApiReminderUpdate = {
  title?: string;
  notes?: string;
  dueAt?: string | null;
  important?: boolean;
  completed?: boolean;
};

type PendingApiUpdate = {
  body: ApiReminderUpdate;
  timeout: number;
};

const TEXT_SYNC_DELAY = 400;

const fromApiReminder = (reminder: ApiReminder): Reminder => ({
  id: reminder.id,
  title: reminder.title,
  notes: reminder.notes ?? "",
  dueAt: reminder.dueAt,
  completedAt: reminder.completedAt,
  important: reminder.important,
  createdAt: reminder.createdAt,
});

type StoredReminder = Reminder & {
  flagged?: boolean;
  priority?: string;
};

function readStoredReminders() {
  try {
    const stored = localStorage.getItem("lifever-reminders");
    if (stored) {
      return (JSON.parse(stored) as StoredReminder[]).map((storedReminder) => {
        const reminder = { ...storedReminder };
        reminder.important ??= Boolean(reminder.flagged);
        delete reminder.flagged;
        delete reminder.priority;
        return reminder;
      });
    }
  } catch {
    // A corrupt or unavailable local store should never prevent the app opening.
  }
  return initialReminders;
}

function writeStoredReminders(reminders: Reminder[]) {
  try {
    localStorage.setItem("lifever-reminders", JSON.stringify(reminders));
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

export function RemindersProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeView, setActiveView] = useState<ReminderViewId>("today");
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const pendingCreates = useRef(new Map<string, Promise<void>>());
  const pendingDeletes = useRef(new Map<string, Promise<void>>());
  const apiWriteChains = useRef(new Map<string, Promise<void>>());
  const pendingApiUpdates = useRef(new Map<string, PendingApiUpdate>());
  const remindersRef = useRef(reminders);
  const sessionRef = useRef(session);
  remindersRef.current = reminders;
  sessionRef.current = session;

  const loadRemote = useCallback(
    async (userId: string, preserveSelection = false) => {
      const requestedMode = `user:${userId}`;
      const requestedVersion = mutationVersion.current;
      try {
        const { reminders: remoteReminders } = await apiRequest<{
          reminders: ApiReminder[];
        }>("/api/reminders");
        if (
          modeRef.current !== requestedMode ||
          requestedVersion !== mutationVersion.current
        ) {
          return;
        }
        const nextReminders = remoteReminders.map(fromApiReminder);
        setReminders(nextReminders);
        if (!preserveSelection) setSelectedReminderId(null);
        setHydratedMode(requestedMode);
      } catch {
        if (modeRef.current === requestedMode) {
          toast.error("Reminders could not sync", {
            id: "reminders-sync-error",
            description: "Check your connection and try again.",
          });
        }
      }
    },
    [],
  );

  const recoverRemote = useCallback(
    (userId: string) => {
      toast.error("Reminders could not save", {
        id: "reminders-sync-error",
        description: "Lifever is refreshing your latest synced copy.",
      });
      void loadRemote(userId, true);
    },
    [loadRemote],
  );

  const sendApiUpdate = useCallback(
    (id: string, body: ApiReminderUpdate) => {
      if (Object.keys(body).length === 0) return;
      const create = pendingCreates.current.get(id);
      const previous =
        apiWriteChains.current.get(id) ?? create ?? Promise.resolve();
      const request = previous
        .then(() =>
          apiRequest(`/api/reminders/${id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
            keepalive: true,
          }).then(() => undefined),
        )
        .catch(() => {
          const userId = session?.user.id;
          if (userId) recoverRemote(userId);
        });
      apiWriteChains.current.set(id, request);
      void request.finally(() => {
        if (apiWriteChains.current.get(id) === request) {
          apiWriteChains.current.delete(id);
        }
      });
    },
    [recoverRemote, session?.user.id],
  );

  const flushApiUpdate = useCallback(
    (id: string) => {
      const pending = pendingApiUpdates.current.get(id);
      if (!pending) return;

      window.clearTimeout(pending.timeout);
      pendingApiUpdates.current.delete(id);
      sendApiUpdate(id, pending.body);
    },
    [sendApiUpdate],
  );

  const queueApiUpdate = useCallback(
    (id: string, body: ApiReminderUpdate, deferred: boolean) => {
      if (Object.keys(body).length === 0) return;

      const pending = pendingApiUpdates.current.get(id);
      if (pending) window.clearTimeout(pending.timeout);
      const mergedBody = { ...pending?.body, ...body };

      if (!deferred) {
        pendingApiUpdates.current.delete(id);
        sendApiUpdate(id, mergedBody);
        return;
      }

      const timeout = window.setTimeout(() => flushApiUpdate(id), TEXT_SYNC_DELAY);
      pendingApiUpdates.current.set(id, { body: mergedBody, timeout });
    },
    [flushApiUpdate, sendApiUpdate],
  );

  const cancelApiUpdate = useCallback((id: string) => {
    const pending = pendingApiUpdates.current.get(id);
    if (!pending) return;
    window.clearTimeout(pending.timeout);
    pendingApiUpdates.current.delete(id);
  }, []);

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    setHydratedMode(null);
    setSelectedReminderId(null);
    if (userId) {
      setReminders([]);
      void loadRemote(userId);
    } else {
      setReminders(readStoredReminders());
      setHydratedMode("local");
    }
  }, [isPending, loadRemote, session?.user.id]);

  useEffect(() => {
    if (hydratedMode === "local" && !session && !isPending) {
      const timeout = window.setTimeout(
        () => writeStoredReminders(reminders),
        TEXT_SYNC_DELAY,
      );
      return () => window.clearTimeout(timeout);
    }
  }, [hydratedMode, isPending, reminders, session]);

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (
      userId &&
      pendingCreates.current.size === 0 &&
      pendingDeletes.current.size === 0 &&
      apiWriteChains.current.size === 0 &&
      pendingApiUpdates.current.size === 0
    ) {
      void loadRemote(userId, true);
    }
  }, Boolean(session?.user.id));

  useEffect(() => {
    const reset = () => {
      if (modeRef.current !== "local") return;
      setReminders(initialReminders.map((reminder) => ({ ...reminder })));
      setActiveView("today");
      setSelectedReminderId(null);
    };
    window.addEventListener(RESET_DEMO_DATA_EVENT, reset);
    return () => window.removeEventListener(RESET_DEMO_DATA_EVENT, reset);
  }, []);

  useEffect(() => {
    const flushPendingWork = () => {
      if (!sessionRef.current) writeStoredReminders(remindersRef.current);
      for (const id of pendingApiUpdates.current.keys()) flushApiUpdate(id);
    };

    window.addEventListener("pagehide", flushPendingWork);
    return () => {
      window.removeEventListener("pagehide", flushPendingWork);
      for (const pending of pendingApiUpdates.current.values()) {
        window.clearTimeout(pending.timeout);
      }
      pendingApiUpdates.current.clear();
    };
  }, [flushApiUpdate]);

  const addReminder = useCallback((input: NewReminder) => {
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: input.title,
      notes: "",
      dueAt: input.dueAt,
      completedAt: null,
      important: false,
      createdAt: new Date().toISOString(),
    };
    mutationVersion.current += 1;
    setReminders((current) => [reminder, ...current]);

    if (session) {
      const request = apiRequest<{ reminder: ApiReminder }>("/api/reminders", {
        method: "POST",
        body: JSON.stringify({
          id: reminder.id,
          title: input.title,
          dueAt: input.dueAt,
        }),
      })
        .then(() => undefined)
        .catch(() => recoverRemote(session.user.id))
        .finally(() => pendingCreates.current.delete(reminder.id));
      pendingCreates.current.set(reminder.id, request);
    }

    return reminder;
  }, [recoverRemote, session]);

  const updateReminder = useCallback((id: string, patch: Partial<Reminder>) => {
    mutationVersion.current += 1;
    setReminders((current) =>
      current.map((reminder) =>
        reminder.id === id ? { ...reminder, ...patch } : reminder,
      ),
    );

    if (session) {
      const body: ApiReminderUpdate = {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
        ...(patch.important !== undefined ? { important: patch.important } : {}),
        ...(patch.completedAt !== undefined
          ? { completed: Boolean(patch.completedAt) }
          : {}),
      };

      const textOnly = Object.keys(body).every(
        (key) => key === "title" || key === "notes",
      );
      queueApiUpdate(id, body, textOnly);
    }
  }, [queueApiUpdate, session]);

  const removeReminder = useCallback(
    (id: string) => {
      const reminder = reminders.find((item) => item.id === id) ?? null;
      mutationVersion.current += 1;
      cancelApiUpdate(id);
      setReminders((current) => current.filter((item) => item.id !== id));
      setSelectedReminderId((current) => (current === id ? null : current));

      if (session) {
        const previous =
          apiWriteChains.current.get(id) ??
          pendingCreates.current.get(id) ??
          Promise.resolve();
        const request = previous
          .then(() => apiRequest(`/api/reminders/${id}`, { method: "DELETE" }))
          .then(() => undefined)
          .catch(() => recoverRemote(session.user.id))
          .finally(() => pendingDeletes.current.delete(id));
        pendingDeletes.current.set(id, request);
      }

      return reminder;
    },
    [cancelApiUpdate, recoverRemote, reminders, session],
  );

  const clearCompletedReminders = useCallback(() => {
    const completedIds = new Set(
      reminders
        .filter((reminder) => reminder.completedAt)
        .map((reminder) => reminder.id),
    );
    if (completedIds.size === 0) return 0;

    mutationVersion.current += 1;
    setReminders((current) =>
      current.filter((reminder) => !completedIds.has(reminder.id)),
    );
    setSelectedReminderId((current) =>
      current && completedIds.has(current) ? null : current,
    );

    if (session) {
      for (const id of completedIds) flushApiUpdate(id);
      const pendingWrites = [...completedIds]
        .map(
          (id) =>
            apiWriteChains.current.get(id) ??
            pendingCreates.current.get(id),
        )
        .filter((request): request is Promise<void> => Boolean(request));
      void Promise.all(pendingWrites)
        .then(() =>
          apiRequest("/api/reminders/completed", { method: "DELETE" }),
        )
        .catch(() => recoverRemote(session.user.id));
    }

    return completedIds.size;
  }, [flushApiUpdate, recoverRemote, reminders, session]);

  const restoreReminder = useCallback((reminder: Reminder) => {
    mutationVersion.current += 1;
    setReminders((current) => [reminder, ...current]);

    if (session) {
      const deletion = pendingDeletes.current.get(reminder.id);
      void (deletion ?? Promise.resolve())
        .then(() =>
          apiRequest<{ reminder: ApiReminder }>("/api/reminders", {
            method: "POST",
            body: JSON.stringify({
              id: reminder.id,
              title: reminder.title,
              notes: reminder.notes,
              dueAt: reminder.dueAt,
              important: reminder.important,
            }),
          }),
        )
        .catch(() => recoverRemote(session.user.id));
    }
  }, [recoverRemote, session]);

  const value = useMemo(
    () => ({
      isReady: hydratedMode !== null,
      reminders,
      activeView,
      selectedReminderId,
      setActiveView,
      setSelectedReminderId,
      addReminder,
      updateReminder,
      removeReminder,
      clearCompletedReminders,
      restoreReminder,
    }),
    [
      activeView,
      addReminder,
      clearCompletedReminders,
      hydratedMode,
      reminders,
      removeReminder,
      restoreReminder,
      selectedReminderId,
      updateReminder,
    ],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders() {
  const context = useContext(RemindersContext);
  if (!context) throw new Error("useReminders must be used inside RemindersProvider");
  return context;
}
