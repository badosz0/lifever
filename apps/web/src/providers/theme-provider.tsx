import {
  createContext,
  type PropsWithChildren,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { useSerialTaskQueue } from "@/hooks/use-serial-task-queue";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "lifever-theme";

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark" || value === "system";

const getStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const pendingWrites = useRef(0);
  const enqueueWrite = useSerialTaskQueue();
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  const loadRemote = useCallback(async (userId: string) => {
    const requestedMode = `user:${userId}`;
    const requestedVersion = mutationVersion.current;
    try {
      const { preferences } = await apiRequest<{
        preferences: { theme: Theme };
      }>("/api/preferences");
      if (
        modeRef.current === requestedMode &&
        mutationVersion.current === requestedVersion
      ) {
        setThemeState(preferences.theme);
      }
    } catch {
      // Keep the cached startup theme when the synced preference is unavailable.
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "device";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    if (userId) {
      void loadRemote(userId);
    } else {
      setThemeState(getStoredTheme());
    }
  }, [isPending, loadRemote, session?.user.id]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolvedTheme === "dark" ? "#1c1c1e" : "#f5f5f7");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme application should not depend on storage availability.
    }
  }, [resolvedTheme, theme]);

  useRefreshOnFocus(() => {
    const userId = session?.user.id;
    if (userId && pendingWrites.current === 0) void loadRemote(userId);
  }, Boolean(session?.user.id));

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      mutationVersion.current += 1;
      setThemeState(nextTheme);
      if (session) {
        pendingWrites.current += 1;
        const request = enqueueWrite(() =>
          apiRequest("/api/preferences", {
            method: "PATCH",
            body: JSON.stringify({ theme: nextTheme }),
          }),
        );
        void request
          .catch(() => void loadRemote(session.user.id))
          .finally(() => {
            pendingWrites.current -= 1;
          });
      }
    },
    [enqueueWrite, loadRemote, session],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
