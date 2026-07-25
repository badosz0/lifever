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

import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function ThemeProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme);
  const [hydratedMode, setHydratedMode] = useState<string | null>(null);
  const modeRef = useRef<string | null>(null);
  const mutationVersion = useRef(0);
  const writeChain = useRef(Promise.resolve());
  const pendingWrites = useRef(0);
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
        setHydratedMode(requestedMode);
      }
    } catch {
      if (modeRef.current === requestedMode) setHydratedMode(requestedMode);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    const userId = session?.user.id;
    const nextMode = userId ? `user:${userId}` : "local";
    modeRef.current = nextMode;
    mutationVersion.current = 0;
    setHydratedMode(null);
    if (userId) {
      setThemeState("system");
      void loadRemote(userId);
    } else {
      const stored = localStorage.getItem("lifever-theme");
      setThemeState(
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "system",
      );
      setHydratedMode("local");
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
    if (hydratedMode === "local" && !session && !isPending) {
      localStorage.setItem("lifever-theme", theme);
    }
  }, [hydratedMode, isPending, resolvedTheme, session, theme]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        pendingWrites.current === 0
      ) {
        void loadRemote(userId);
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadRemote, session?.user.id]);

  const setTheme = useCallback(
    (nextTheme: Theme) => {
      mutationVersion.current += 1;
      setThemeState(nextTheme);
      if (session) {
        pendingWrites.current += 1;
        const request = writeChain.current.then(() =>
          apiRequest("/api/preferences", {
            method: "PATCH",
            body: JSON.stringify({ theme: nextTheme }),
          }),
        );
        writeChain.current = request.then(
          () => undefined,
          () => undefined,
        );
        void request
          .catch(() => void loadRemote(session.user.id))
          .finally(() => {
            pendingWrites.current -= 1;
          });
      }
    },
    [loadRemote, session],
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
