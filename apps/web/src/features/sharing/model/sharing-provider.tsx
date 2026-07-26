import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";

import {
  SHARING_CHANGED_EVENT,
  type ResourceInvite,
} from "./types";

type SharingContextValue = {
  invites: ResourceInvite[];
  isLoading: boolean;
  refreshInvites: () => Promise<void>;
  respondToInvite: (
    id: string,
    response: "accept" | "reject",
  ) => Promise<void>;
};

const SharingContext = createContext<SharingContextValue | null>(null);

export function SharingProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const [invites, setInvites] = useState<ResourceInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshInvites = useCallback(async () => {
    if (!session) {
      setInvites([]);
      return;
    }
    setIsLoading(true);
    try {
      const payload = await apiRequest<{ invites: ResourceInvite[] }>(
        "/api/sharing/invites",
      );
      setInvites(payload.invites);
    } catch {
      // Invitation checks are background work and should not interrupt the app.
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isPending) return;
    void refreshInvites();
  }, [isPending, refreshInvites]);

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshInvites();
    }, 30_000);
    const refresh = () => void refreshInvites();
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshInvites, session]);

  const respondToInvite = useCallback(
    async (id: string, response: "accept" | "reject") => {
      await apiRequest(`/api/sharing/invites/${id}/${response}`, {
        method: "POST",
      });
      setInvites((current) => current.filter((invite) => invite.id !== id));
      if (response === "accept") {
        window.dispatchEvent(new CustomEvent(SHARING_CHANGED_EVENT));
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ invites, isLoading, refreshInvites, respondToInvite }),
    [invites, isLoading, refreshInvites, respondToInvite],
  );

  return (
    <SharingContext.Provider value={value}>{children}</SharingContext.Provider>
  );
}

export function useSharing() {
  const context = useContext(SharingContext);
  if (!context) {
    throw new Error("useSharing must be used inside SharingProvider");
  }
  return context;
}
