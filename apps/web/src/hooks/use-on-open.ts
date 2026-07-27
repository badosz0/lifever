import { useEffect, useRef } from "react";

/**
 * Runs initialization once for each closed-to-open transition.
 *
 * Keeping the latest callback in a ref lets dialogs read fresh provider data
 * without reinitializing drafts whenever live collaboration refreshes it.
 */
export function useOnOpen(open: boolean, onOpen: () => void) {
  const onOpenRef = useRef(onOpen);
  const wasOpenRef = useRef(false);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (justOpened) onOpenRef.current();
  }, [open]);
}
