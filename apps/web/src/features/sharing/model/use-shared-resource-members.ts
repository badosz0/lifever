import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

import {
  SHARING_CHANGED_EVENT,
  type SharedResourceMember,
  type SharedResourceMembersPayload,
  type SharedResourceType,
} from "./types";

type SharedResourceMembersOptions = {
  enabled: boolean;
  resourceId: string | null;
  resourceType: SharedResourceType;
};

export function useSharedResourceMembers({
  enabled,
  resourceId,
  resourceType,
}: SharedResourceMembersOptions) {
  const { data: session } = authClient.useSession();
  const [members, setMembers] = useState<SharedResourceMember[]>([]);

  useEffect(() => {
    if (!enabled || !resourceId || !session) {
      setMembers([]);
      return;
    }

    let active = true;
    const refresh = () => {
      void apiRequest<SharedResourceMembersPayload>(
        `/api/sharing/resources/${resourceType}/${encodeURIComponent(resourceId)}`,
      ).then(
        (payload) => {
          if (active) setMembers(payload.members);
        },
        () => {
          if (active) setMembers([]);
        },
      );
    };
    refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    window.addEventListener(SHARING_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener(SHARING_CHANGED_EVENT, refresh);
    };
  }, [enabled, resourceId, resourceType, session]);

  return members;
}
