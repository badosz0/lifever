import { useEffect } from "react";

export function GlobalContextMenuGuard() {
  useEffect(() => {
    const preventNativeContextMenu = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target
          : event.target instanceof Node
            ? event.target.parentElement
            : null;

      if (target?.closest("[data-lifever-context-menu-trigger]")) return;

      event.preventDefault();
    };

    document.addEventListener("contextmenu", preventNativeContextMenu);
    return () => {
      document.removeEventListener("contextmenu", preventNativeContextMenu);
    };
  }, []);

  return null;
}
