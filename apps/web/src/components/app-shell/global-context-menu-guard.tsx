import { useEffect } from "react";

const nativeContextMenuSelector = [
  "a[href]",
  "input",
  "select",
  "textarea",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='textbox']",
].join(",");

const selectionContainsPoint = (
  selection: Selection | null,
  clientX: number,
  clientY: number,
) => {
  if (!selection || selection.isCollapsed || !selection.toString()) return false;

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index);
    for (const rect of range.getClientRects()) {
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return true;
      }
    }
  }

  return false;
};

export function GlobalContextMenuGuard() {
  useEffect(() => {
    let contextMenuStartedInsideSelection = false;

    const captureContextMenuIntent = (event: PointerEvent) => {
      const opensContextMenu =
        event.button === 2 || (event.button === 0 && event.ctrlKey);
      contextMenuStartedInsideSelection =
        opensContextMenu &&
        selectionContainsPoint(
          window.getSelection(),
          event.clientX,
          event.clientY,
        );
    };

    const preventNativeContextMenu = (event: MouseEvent) => {
      const startedInsideSelection = contextMenuStartedInsideSelection;
      contextMenuStartedInsideSelection = false;

      const target =
        event.target instanceof Element
          ? event.target
          : event.target instanceof Node
            ? event.target.parentElement
            : null;

      if (target?.closest("[data-lifever-context-menu-trigger]")) return;
      if (target?.closest(nativeContextMenuSelector)) return;
      if (startedInsideSelection) return;

      event.preventDefault();
    };

    document.addEventListener("pointerdown", captureContextMenuIntent, true);
    document.addEventListener("contextmenu", preventNativeContextMenu);
    return () => {
      document.removeEventListener("pointerdown", captureContextMenuIntent, true);
      document.removeEventListener("contextmenu", preventNativeContextMenu);
    };
  }, []);

  return null;
}
