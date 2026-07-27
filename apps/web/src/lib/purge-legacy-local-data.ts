const legacyDataKeys = [
  "lifever-reminders",
  "lifever-notes-v1",
  "lifever-calendar-events",
  "lifever-calendar-categories",
  "lifever-calendars",
  "lifever-kanban-state-v1",
  "lifever-formula1-preferences-v1",
  "lifever-user-preferences",
];

export function purgeLegacyLocalData() {
  try {
    for (const key of legacyDataKeys) localStorage.removeItem(key);
  } catch {
    // Account-backed data remains authoritative when device storage is blocked.
  }
}
