import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getAppointments, getUnreadState } from "@/api";
import { connectSocket, getSocket } from "@/lib/socket";

export type NavBadges = {
  /** Pending appointment requests awaiting action (time-sensitive). */
  appointments: number;
  /** Unread messages + pending chat requests + booking notifications. */
  notifications: number;
  /** True only until the very first fetch resolves (cached after that). */
  loading: boolean;
};

// Cached at module level so the badge shows instantly when the Header remounts
// on navigation — no re-shimmer / flashing on every page.
let cachedBadges = { appointments: 0, notifications: 0 };
let hasLoadedOnce = false;

const REALTIME_EVENTS = [
  "message:new",
  "unread:update",
  "conversation:pending",
  "conversation:accepted",
  "conversation:removed",
  "booking:updated",
  "booking:cancelled",
  "booking:denied",
];

/**
 * Live counts for the nav links. Refetches on the relevant socket events so the
 * badges update without a screen refresh.
 */
export function useNavBadges(): NavBadges {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [badges, setBadges] = useState(() => ({ ...cachedBadges }));
  const [loading, setLoading] = useState(!hasLoadedOnce);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    if (!isSignedIn || !user) {
      cachedBadges = { appointments: 0, notifications: 0 };
      hasLoadedOnce = true;
      setBadges({ ...cachedBadges });
      setLoading(false);
      return;
    }
    try {
      const token = await getToken();
      const [unread, appts] = await Promise.all([
        getUnreadState(token ?? undefined),
        getAppointments(undefined, token ?? undefined),
      ]);
      const notifications =
        (unread?.counts?.unreadConversations ?? 0) + (unread?.counts?.pendingRequests ?? 0);
      const appointments = Array.isArray(appts)
        ? appts.filter((a) => a.status === "pending").length
        : 0;
      cachedBadges = { appointments, notifications };
      setBadges(cachedBadges);
    } catch {
      /* keep previous counts on transient failure */
    } finally {
      hasLoadedOnce = true;
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const socket = getSocket();

    const ping = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void refetch(), 200);
    };

    let attached = false;
    const attach = () => {
      if (attached) return;
      REALTIME_EVENTS.forEach((e) => socket.on(e, ping));
      attached = true;
    };

    if (socket.connected) attach();
    socket.on("connect", attach);
    if (!socket.connected) void connectSocket(getToken, user.id);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.off("connect", attach);
      REALTIME_EVENTS.forEach((e) => socket.off(e, ping));
    };
  }, [isLoaded, isSignedIn, user, getToken, refetch]);

  return { ...badges, loading };
}
