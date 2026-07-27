const STORAGE_KEY = "lifever-client-instance";

let cachedClientId: string | null = null;

export const getClientInstanceId = () => {
  if (cachedClientId) return cachedClientId;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedClientId = stored;
      return stored;
    }
  } catch {
    // A memory-only identifier still suppresses echoes for this page.
  }

  cachedClientId = crypto.randomUUID();
  try {
    sessionStorage.setItem(STORAGE_KEY, cachedClientId);
  } catch {
    // Keep the identifier in memory for restricted browser contexts.
  }
  return cachedClientId;
};
