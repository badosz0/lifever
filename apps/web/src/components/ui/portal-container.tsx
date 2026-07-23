import {
  createContext,
  type PropsWithChildren,
  type RefObject,
  useContext,
  useRef,
} from "react";

type PortalContainerRef = RefObject<HTMLDivElement | null>;

const PortalContainerContext = createContext<PortalContainerRef | null>(null);

export function PortalContainerProvider({ children }: PropsWithChildren) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <PortalContainerContext.Provider value={containerRef}>
      <div ref={containerRef} className="contents">
        {children}
      </div>
    </PortalContainerContext.Provider>
  );
}

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}
