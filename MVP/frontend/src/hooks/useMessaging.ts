import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";

export type Message = {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  meta?: any;
};
export type ConversationMeta = {
  allowed: boolean;
  lastStatus: "pending" | "accepted" | "declined" | null;
  declines: number;
  blocked: boolean;
};
export type Conversation = {
  participantId: string;
  username: string;
  messages: Message[];
  meta?: ConversationMeta;
};

type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>;

export type UnreadState = {
  unreadMessagesTotal: number;
  unreadByConversation: Record<string, number>;
  requestExists: boolean;
};

const PENDING_LS = "ink_pending_threads_v1";
const threadKeyOf = (a: string, b: string) => [a, b].sort().join(":");

function loadPending(): Record<string, { username: string }> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_LS) || "{}") as Record<
      string,
      { username: string }
    >;
  } catch {
    return {};
  }
}
function savePending(v: Record<string, { username: string }>) {
  try {
    localStorage.setItem(PENDING_LS, JSON.stringify(v));
  } catch {}
}

export function useMessaging(currentUserId: string, authFetch: AuthFetch) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [unreadState, setUnreadState] = useState<UnreadState | null>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [pendingRequestIds, setPendingRequestIds] = useState<string[]>([]);
  const mounted = useRef(false);

  const raw =
    (import.meta as any)?.env?.VITE_API_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5005/api";
  const apiBase = String(raw).replace(/\/$/, "");

  const getGate = useCallback(
    async (artistId: string): Promise<ConversationMeta> => {
      const res = await authFetch(`${apiBase}/messages/gate/${artistId}`, {
        method: "GET",
      });
      if (!res.ok)
        return {
          allowed: false,
          lastStatus: null,
          declines: 0,
          blocked: false,
        };
      return (await res.json()) as ConversationMeta;
    },
    [apiBase, authFetch]
  );

  const upsert = useCallback(
    (pid: string, apply: (prev?: Conversation) => Conversation) => {
      setConversations((prev) => {
        const map = new Map(prev.map((c) => [c.participantId, c]));
        map.set(pid, apply(map.get(pid)));
        return Array.from(map.values());
      });
    },
    []
  );

  const fetchIncomingRequests = useCallback(async () => {
    const res = await authFetch(`${apiBase}/messages/requests`, {
      method: "GET",
    });
    if (!res.ok) return;
    const data = await res.json();
    const ids = Array.isArray(data?.requests)
      ? data.requests.map((r: any) => String(r._id))
      : [];
    setPendingRequestIds(ids);
    window.dispatchEvent(new Event("ink:requests-reset"));
  }, [apiBase, authFetch]);

  const fetchUnread = useCallback(async () => {
    const res = await authFetch(`${apiBase}/messages/unread`, {
      method: "GET",
    });
    if (!res.ok) return;
    const raw = await res.json();

    let unreadByConversation: Record<string, number> = {};
    let unreadMessagesTotal = 0;
    let requestExists = false;

    if (
      "unreadByConversation" in raw ||
      "unreadMessagesTotal" in raw ||
      "requestExists" in raw
    ) {
      unreadByConversation = { ...(raw.unreadByConversation || {}) };
      unreadMessagesTotal = Number(raw.unreadMessagesTotal || 0);
      requestExists = Boolean(raw.requestExists);
    } else {
      const ids: string[] = Array.isArray(raw.unreadConversationIds)
        ? raw.unreadConversationIds
        : [];
      ids.forEach((id: string) => {
        unreadByConversation[id] = (unreadByConversation[id] || 0) + 1;
      });
      unreadMessagesTotal =
        (raw.counts && Number(raw.counts.unreadConversations)) ||
        ids.length ||
        0;

      const pendingLen =
        (raw.counts && Number(raw.counts.pendingRequests)) ||
        (Array.isArray(raw.pendingRequestIds)
          ? raw.pendingRequestIds.length
          : 0) ||
        0;
      requestExists = pendingLen > 0;
    }

    const normalized: UnreadState = {
      unreadMessagesTotal,
      unreadByConversation,
      requestExists,
    };
    setUnreadState(normalized);
    setUnreadMap({ ...unreadByConversation });
  }, [apiBase, authFetch]);

  const markReadBackend = useCallback(
    async (participantId: string) => {
      const res = await authFetch(`${apiBase}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: participantId }),
      });
      if (res.ok)
        window.dispatchEvent(
          new CustomEvent("ink:conversation-read", { detail: participantId })
        );
    },
    [apiBase, authFetch]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await authFetch(`${apiBase}/messages/user/${currentUserId}`, {
      method: "GET",
    });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as Conversation[];
    const base = new Map<string, Conversation>();
    (data || []).forEach((c) => base.set(c.participantId, c));

    const pending: Record<string, { username: string }> = loadPending();
    Object.entries(pending).forEach(([pid, v]) => {
      if (!base.has(pid))
        base.set(pid, {
          participantId: pid,
          username: v.username || "Conversation",
          messages: [],
        });
    });

    const convs = Array.from(base.values());
    const metas = await Promise.all(
      convs.map(async (c) => ({
        pid: c.participantId,
        meta: await getGate(c.participantId),
      }))
    );
    const metaMap = Object.fromEntries(metas.map((m) => [m.pid, m.meta]));
    const cleaned: Record<string, { username: string }> = { ...pending };
    convs.forEach((c) => {
      const m = metaMap[c.participantId];
      if (m?.blocked || m?.allowed) delete cleaned[c.participantId];
    });
    savePending(cleaned);

    const nextConvs = convs
      .filter((c) => !metaMap[c.participantId]?.blocked)
      .map((c) => ({ ...c, meta: metaMap[c.participantId] }));
    setConversations(nextConvs);
    setLoading(false);
    fetchUnread();
    fetchIncomingRequests();
  }, [
    apiBase,
    authFetch,
    currentUserId,
    getGate,
    fetchUnread,
    fetchIncomingRequests,
  ]);

  const removeConversation = useCallback((participantId: string) => {
    setConversations((prev) =>
      prev.filter((c) => c.participantId !== participantId)
    );
    setUnreadMap((m) => {
      if (!(participantId in m)) return m;
      const n = { ...m };
      delete n[participantId];
      return n;
    });
  }, []);

  const toggleCollapse = useCallback((participantId: string) => {
    setCollapsedMap((m) => ({ ...m, [participantId]: !m[participantId] }));
    setExpandedId((id) => (id === participantId ? null : participantId));
  }, []);

  const markAsRead = useCallback(
    (participantId: string) => {
      setUnreadMap((m) =>
        m[participantId] ? { ...m, [participantId]: 0 } : m
      );
      markReadBackend(participantId);
    },
    [markReadBackend]
  );

  const send = useCallback(
    async (receiverId: string, text: string) => {
      const res = await authFetch(`${apiBase}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ senderId: currentUserId, receiverId, text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUnreadMap((m) => (m[receiverId] ? { ...m, [receiverId]: 0 } : m));
    },
    [apiBase, authFetch, currentUserId]
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!currentUserId) return;
    const s = socket;

    const onConnect = () => {
      s.emit("register", currentUserId);
      if (expandedId)
        s.emit("thread:join", {
          threadKey: threadKeyOf(currentUserId, expandedId),
        });
    };

    const onMessageNew = (p: { convoId: string; message: Message }) => {
      const m = p.message;
      const pid = m.senderId === currentUserId ? m.receiverId : m.senderId;
      upsert(pid, (prev?: Conversation) => {
        const base: Conversation = prev || {
          participantId: pid,
          username: "Conversation",
          messages: [],
          meta: {
            allowed: false,
            lastStatus: null,
            declines: 0,
            blocked: false,
          },
        };
        const exists = base.messages.some(
          (x) =>
            x.timestamp === m.timestamp &&
            x.senderId === m.senderId &&
            x.text === m.text
        );
        const next = exists
          ? base
          : { ...base, messages: [...base.messages, m] };
        return next;
      });
      const isInbound = m.senderId !== currentUserId;
      const isActiveThread = expandedId === pid && messagesOpen;
      if (isInbound && !isActiveThread) {
        fetchUnread();
      }
    };

    const onPending = (p: {
      convoId: string;
      from: string;
      to: string;
      message: Message;
    }) => {
      const pid = currentUserId === p.to ? p.from : p.to;
      upsert(pid, (prev?: Conversation) => {
        const base: Conversation = prev || {
          participantId: pid,
          username: "Conversation",
          messages: [],
          meta: {
            allowed: false,
            lastStatus: "pending",
            declines: 0,
            blocked: false,
          },
        };
        const msgExists = base.messages.some(
          (x) =>
            x.timestamp === p.message.timestamp && x.meta?.kind === "request"
        );
        const msgs = msgExists ? base.messages : [p.message, ...base.messages];
        return {
          ...base,
          messages: msgs,
          meta: {
            ...(base.meta || { declines: 0, blocked: false }),
            lastStatus: "pending",
            allowed: false,
          },
        };
      });
      fetchUnread();
      fetchIncomingRequests();
    };

    const onAccepted = (p: {
      convoId: string;
      clientId: string;
      artistId: string;
    }) => {
      const pid = currentUserId === p.clientId ? p.artistId : p.clientId;
      upsert(pid, (prev?: Conversation) => {
        const base: Conversation = prev || {
          participantId: pid,
          username: "Conversation",
          messages: [],
          meta: {
            allowed: true,
            lastStatus: "accepted",
            declines: 0,
            blocked: false,
          },
        };
        return {
          ...base,
          meta: {
            ...(base.meta || { declines: 0, blocked: false }),
            allowed: true,
            lastStatus: "accepted",
          },
        };
      });
      fetchUnread();
      fetchIncomingRequests();
    };

    const onRemoved = () => {
      fetchAll();
      fetchIncomingRequests();
    };

    s.on("connect", onConnect);
    s.on("message:new", onMessageNew);
    s.on("conversation:pending", onPending);
    s.on("conversation:accepted", onAccepted);
    s.on("conversation:removed", onRemoved);
    if (!s.connected) s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("message:new", onMessageNew);
      s.off("conversation:pending", onPending);
      s.off("conversation:accepted", onAccepted);
      s.off("conversation:removed", onRemoved);
    };
  }, [
    currentUserId,
    expandedId,
    upsert,
    messagesOpen,
    fetchAll,
    fetchUnread,
    fetchIncomingRequests,
  ]);

  useEffect(() => {
    const onOpen = () => setMessagesOpen(true);
    const onClose = () => setMessagesOpen(false);
    window.addEventListener("ink:open-messages", onOpen);
    window.addEventListener("ink:close-messages", onClose);
    return () => {
      window.removeEventListener("ink:open-messages", onOpen);
      window.removeEventListener("ink:close-messages", onClose);
    };
  }, []);

  useEffect(() => {
    if (messagesOpen && expandedId) {
      window.dispatchEvent(
        new CustomEvent("ink:conversation-opened", { detail: expandedId })
      );
      markAsRead(expandedId);
      fetchUnread();
    }
  }, [messagesOpen, expandedId, markAsRead, fetchUnread]);

  return {
    loading,
    conversations,
    collapsedMap,
    expandedId,
    toggleCollapse,
    removeConversation,
    send,
    destroy: async (participantId: string) => {
      const res = await authFetch(`${apiBase}/messages/conversations`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ userId: currentUserId, participantId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      removeConversation(participantId);
      fetchUnread();
      fetchIncomingRequests();
    },
    refresh: fetchAll,
    unreadMap,
    markAsRead,
    unreadTotal: Object.values(unreadMap).reduce<number>(
      (a, b) => a + (b || 0),
      0
    ),
    unreadState,
    pendingRequestIds,
    pendingRequestsCount: pendingRequestIds.length,
  };
}