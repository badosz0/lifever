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

import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

import { initialReminders } from "./seed";
import type { Reminder, ReminderViewId } from "./types";

type NewReminder = Pick<Reminder, "title" | "dueAt">;

type RemindersContextValue = {
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
  const { data: session } = authClient.useSession();
  const [reminders, setReminders] = useState<Reminder[]>(readStoredReminders);
  const [activeView, setActiveView] = useState<ReminderViewId>("today");
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const previousUserId = useRef<string | null>(null);
  const pendingApiUpdates = useRef(new Map<string, PendingApiUpdate>());
  const remindersRef = useRef(reminders);
  const sessionRef = useRef(session);
  remindersRef.current = reminders;
  sessionRef.current = session;

  const sendApiUpdate = useCallback((id: string, body: ApiReminderUpdate) => {
    if (Object.keys(body).length === 0) return;

    void apiRequest(`/api/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // Optimistic edits stay visible and can be retried by editing again.
    });
  }, []);

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
    const userId = session?.user.id ?? null;
    let cancelled = false;

    if (userId) {
      void apiRequest<{ reminders: ApiReminder[] }>("/api/reminders").then(
        ({ reminders: remoteReminders }) => {
          if (!cancelled) {
            setReminders(remoteReminders.map(fromApiReminder));
            setSelectedReminderId(null);
          }
        },
        () => {
          // Keep the local snapshot visible if the network is unavailable.
        },
      );
    } else if (previousUserId.current) {
      setReminders(readStoredReminders());
      setSelectedReminderId(null);
    }

    previousUserId.current = userId;
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!session) {
      const timeout = window.setTimeout(
        () => writeStoredReminders(reminders),
        TEXT_SYNC_DELAY,
      );
      return () => window.clearTimeout(timeout);
    }
  }, [reminders, session]);

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
    setReminders((current) => [reminder, ...current]);

    if (session) {
      void apiRequest<{ reminder: ApiReminder }>("/api/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          dueAt: input.dueAt,
        }),
      }).then(
        ({ reminder: savedReminder }) => {
          setReminders((current) =>
            current.map((item) =>
              item.id === reminder.id ? fromApiReminder(savedReminder) : item,
            ),
          );
          setSelectedReminderId((current) =>
            current === reminder.id ? savedReminder.id : current,
          );
        },
        () => {
          // The optimistic local reminder remains available for retry.
        },
      );
    }

    return reminder;
  }, [session]);

  const updateReminder = useCallback((id: string, patch: Partial<Reminder>) => {
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
      cancelApiUpdate(id);
      setReminders((current) => current.filter((item) => item.id !== id));
      setSelectedReminderId((current) => (current === id ? null : current));

      if (session) {
        void apiRequest(`/api/reminders/${id}`, { method: "DELETE" }).catch(() => {
          // Undo remains available from the toast if the remote delete fails.
        });
      }

      return reminder;
    },
    [cancelApiUpdate, reminders, session],
  );

  const clearCompletedReminders = useCallback(() => {
    const completedIds = new Set(
      reminders
        .filter((reminder) => reminder.completedAt)
        .map((reminder) => reminder.id),
    );
    if (completedIds.size === 0) return 0;

    for (const id of completedIds) cancelApiUpdate(id);
    setReminders((current) =>
      current.filter((reminder) => !completedIds.has(reminder.id)),
    );
    setSelectedReminderId((current) =>
      current && completedIds.has(current) ? null : current,
    );

    if (session) {
      void apiRequest("/api/reminders/completed", { method: "DELETE" }).catch(() => {
        // The local view remains responsive if the remote cleanup fails.
      });
    }

    return completedIds.size;
  }, [cancelApiUpdate, reminders, session]);

  const restoreReminder = useCallback((reminder: Reminder) => {
    setReminders((current) => [reminder, ...current]);

    if (session) {
      void apiRequest<{ reminder: ApiReminder }>("/api/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: reminder.title,
          notes: reminder.notes,
          dueAt: reminder.dueAt,
          important: reminder.important,
        }),
      }).then(({ reminder: restored }) => {
        setReminders((current) =>
          current.map((item) =>
            item.id === reminder.id ? fromApiReminder(restored) : item,
          ),
        );
      });
    }
  }, [session]);

  const value = useMemo(
    () => ({
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
