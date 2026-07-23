import { useCallback, useEffect, useRef, useState } from "react";

type PersistentPanelWidthOptions = {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const readStoredWidth = ({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
}: PersistentPanelWidthOptions) => {
  try {
    const storedWidth = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(storedWidth) && storedWidth > 0) {
      return clamp(storedWidth, minWidth, maxWidth);
    }
  } catch {
    // Storage can be unavailable in privacy-restricted environments.
  }

  return defaultWidth;
};

export function usePersistentPanelWidth(options: PersistentPanelWidthOptions) {
  const { storageKey, defaultWidth, minWidth, maxWidth } = options;
  const [width, setWidthState] = useState(() => readStoredWidth(options));
  const widthRef = useRef(width);

  useEffect(() => {
    const storedWidth = readStoredWidth({ storageKey, defaultWidth, minWidth, maxWidth });
    widthRef.current = storedWidth;
    setWidthState(storedWidth);
  }, [defaultWidth, maxWidth, minWidth, storageKey]);

  const setWidth = useCallback(
    (nextWidth: number) => {
      const clampedWidth = clamp(Math.round(nextWidth), minWidth, maxWidth);
      widthRef.current = clampedWidth;
      setWidthState(clampedWidth);
    },
    [maxWidth, minWidth],
  );

  const persistWidth = useCallback(() => {
    try {
      localStorage.setItem(storageKey, String(widthRef.current));
    } catch {
      // Resizing should continue to work even if persistence is unavailable.
    }
  }, [storageKey]);

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
    try {
      localStorage.setItem(storageKey, String(defaultWidth));
    } catch {
      // Keep the in-memory reset when persistence is unavailable.
    }
  }, [defaultWidth, setWidth, storageKey]);

  return {
    width,
    setWidth,
    persistWidth,
    resetWidth,
  };
}
