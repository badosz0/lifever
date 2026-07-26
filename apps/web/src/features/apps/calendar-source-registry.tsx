import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppCalendarSourceEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  location?: string;
  notes?: string;
  htmlLink?: string | null;
};

export type AppCalendarSource = {
  id: string;
  appId: string;
  name: string;
  color: string;
  defaultVisible: boolean;
  events: AppCalendarSourceEvent[];
};

type AppCalendarSourceRegistryValue = {
  sources: AppCalendarSource[];
  register: (source: AppCalendarSource) => () => void;
};

const AppCalendarSourceRegistry =
  createContext<AppCalendarSourceRegistryValue | null>(null);

export function AppCalendarSourceRegistryProvider({
  children,
}: PropsWithChildren) {
  const [sourceMap, setSourceMap] = useState(
    () => new Map<string, AppCalendarSource>(),
  );
  const register = useCallback((source: AppCalendarSource) => {
    setSourceMap((current) => {
      const next = new Map(current);
      next.set(source.id, source);
      return next;
    });
    return () => {
      setSourceMap((current) => {
        if (!current.has(source.id)) return current;
        const next = new Map(current);
        next.delete(source.id);
        return next;
      });
    };
  }, []);
  const value = useMemo(
    () => ({ sources: [...sourceMap.values()], register }),
    [register, sourceMap],
  );
  return (
    <AppCalendarSourceRegistry.Provider value={value}>
      {children}
    </AppCalendarSourceRegistry.Provider>
  );
}

export function useRegisterAppCalendarSource(source: AppCalendarSource) {
  const registry = useContext(AppCalendarSourceRegistry);
  if (!registry) {
    throw new Error(
      "useRegisterAppCalendarSource must be used inside AppCalendarSourceRegistryProvider",
    );
  }
  const { register } = registry;
  useEffect(() => register(source), [register, source]);
}

export function useAppCalendarSources() {
  const registry = useContext(AppCalendarSourceRegistry);
  if (!registry) {
    throw new Error(
      "useAppCalendarSources must be used inside AppCalendarSourceRegistryProvider",
    );
  }
  return registry.sources;
}
