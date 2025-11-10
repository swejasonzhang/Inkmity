import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";

export type Message = {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  meta?: any;
  delivered?: boolean;
  seen?: boolean;
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

const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
const extractUrls = (text: string) =>
  Array.from(
    new Set((text.match(urlRegex) || []).map((u) => u.replace(/[),.]+$/, "")))
  );

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
  const lastJoined = useRef<string | null>(null);

  const apiBase = String(
    (import.meta as any)?.env?.VITE_API_URL ??
      import.meta.env?.VITE_API_URL ??
      "http://localhost:5005/api"
  ).replace(/\/$/, "");

  const getGate = useCallback(
    async (artistId: string): Promise<ConversationMeta> => {
      const res = await authFetch(`${apiBase}/messages/gate/${artistId}`, {
        method: "GET",
      });
      if (!res.ok) {
        return {
          allowed: false,
          lastStatus: null,
          declines: 0,
          blocked: false,
        };
      }
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
      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent("ink:conversation-read", { detail: participantId })
        );
      }
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
    const pending = loadPending();
    Object.entries(pending).forEach(([pid, v]) => {
      if (!base.has(pid)) {
        base.set(pid, {
          participantId: pid,
          username: v.username || "Conversation",
          messages: [],
        });
      }
    });
    const convs = Array.from(base.values());
    const metas = await Promise.all(
      convs.map(async (c) => ({
        pid: c.participantId,
        meta: await getGate(c.participantId),
      }))
    );
    const metaMap = Object.fromEntries(metas.map((m) => [m.pid, m.meta]));
    const cleaned = { ...pending };
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
      const referenceUrls = extractUrls(text);
      const clientId = `${currentUserId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const optimistic: Message = {
        senderId: currentUserId,
        receiverId,
        text,
        timestamp: Date.now(),
        meta: { referenceUrls, clientId },
        delivered: false,
        seen: false,
      };
      upsert(receiverId, (prev?: Conversation) => {
        const base: Conversation = prev || {
          participantId: receiverId,
          username: "Conversation",
          messages: [],
          meta: {
            allowed: true,
            lastStatus: null,
            declines: 0,
            blocked: false,
          },
        };
        return { ...base, messages: [...base.messages, optimistic] };
      });
      setUnreadMap((m) => (m[receiverId] ? { ...m, [receiverId]: 0 } : m));
      try {
        const res = await authFetch(`${apiBase}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            senderId: currentUserId,
            receiverId,
            text,
            meta: { referenceUrls, clientId },
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        upsert(receiverId, (prev?: Conversation) => {
          if (!prev) return prev as any;
          return {
            ...prev,
            messages: prev.messages.filter(
              (m) => m.meta?.clientId !== clientId
            ),
          };
        });
        throw new Error("Failed to send");
      }
    },
    [apiBase, authFetch, currentUserId, upsert]
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!currentUserId) return;
    const s = socket;

    const joinIfNeeded = (peerId: string | null) => {
      if (!peerId) return;
      const key = threadKeyOf(currentUserId, peerId);
      if (lastJoined.current === key) return;
      if (lastJoined.current)
        s.emit("thread:leave", { threadKey: lastJoined.current });
      s.emit("thread:join", { threadKey: key });
      lastJoined.current = key;
    };

    const onConnect = () => {
      s.emit("register", currentUserId);
      joinIfNeeded(expandedId);
    };

    const normalizeRefs = (raw: any): Message => {
      const mergedRefs = Array.from(
        new Set([
          ...(raw?.meta?.referenceUrls || []),
          ...(raw?.meta?.workRefs || []),
          ...(raw?.referenceUrls || []),
          ...(raw?.workRefs || []),
          ...(raw?.meta?.refs || []),
        ])
      );
      return {
        ...raw,
        meta: { ...(raw.meta || {}), referenceUrls: mergedRefs },
      };
    };

    const onMessageNew = (p: { convoId: string; message: Message }) => {
      const m = normalizeRefs(p.message);
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
            (x.meta?.clientId && x.meta.clientId === m.meta?.clientId) ||
            (x.timestamp === m.timestamp &&
              x.senderId === m.senderId &&
              x.text === m.text)
        );
        const next = exists
          ? base
          : { ...base, messages: [...base.messages, m] };
        return next;
      });
      const isInbound = m.senderId !== currentUserId;
      const isActiveThread = expandedId === pid && messagesOpen;
      if (isInbound && isActiveThread) {
        markReadBackend(pid);
      }
      if (!isInbound) {
        upsert(pid, (prev?: Conversation) => {
          if (!prev) return prev as any;
          const msgs = [...prev.messages];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (
              msgs[i].senderId === currentUserId &&
              (msgs[i].meta?.clientId === m.meta?.clientId ||
                msgs[i].text === m.text)
            ) {
              msgs[i] = { ...msgs[i], delivered: true };
              break;
            }
          }
          return { ...prev, messages: msgs };
        });
      }
    };

    const onPending = (p: {
      convoId: string;
      from: string;
      to: string;
      message: Message;
    }) => {
      const pid = currentUserId === p.to ? p.from : p.to;
      const normalized = normalizeRefs(p.message);
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
            x.timestamp === normalized.timestamp && x.meta?.kind === "request"
        );
        const msgs = msgExists ? base.messages : [normalized, ...base.messages];
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

    const onAck = (p: {
      convoId: string;
      viewerId: string;
      participantId: string;
      delivered?: boolean;
      seen?: boolean;
    }) => {
      const pid = p.participantId;
      if (p.viewerId !== currentUserId) return;
      upsert(pid, (prev?: Conversation) => {
        if (!prev) return prev as any;
        const msgs = [...prev.messages];
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].senderId === currentUserId) {
            const next = { ...msgs[i] };
            if (p.seen) next.seen = true;
            if (p.delivered) next.delivered = true;
            msgs[i] = next;
            break;
          }
        }
        return { ...prev, messages: msgs };
      });
    };

    const onRemoved = () => {
      fetchAll();
      fetchIncomingRequests();
    };

    s.on("connect", onConnect);
    s.on("message:new", onMessageNew);
    s.on("conversation:pending", onPending);
    s.on("conversation:accepted", onAccepted);
    s.on("conversation:ack", onAck);
    s.on("conversation:removed", onRemoved);
    if (!s.connected) s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("message:new", onMessageNew);
      s.off("conversation:pending", onPending);
      s.off("conversation:accepted", onAccepted);
      s.off("conversation:ack", onAck);
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
    markReadBackend,
  ]);

  useEffect(() => {
    if (!expandedId || !currentUserId) return;
    const key = threadKeyOf(currentUserId, expandedId);
    if (lastJoined.current !== key) {
      socket.emit("thread:join", { threadKey: key });
      lastJoined.current = key;
    }
  }, [expandedId, currentUserId]);

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
    setExpandedId,
  };
}

export default useMessaging;