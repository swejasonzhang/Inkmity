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

const PENDING_LS = "ink_pending_threads_v1";
const threadKeyOf = (a: string, b: string) => [a, b].sort().join(":");
const UNREAD_LS = (uid: string) => `ink_unread_map_v1:${uid}`;

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
function loadUnread(uid: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(UNREAD_LS(uid)) || "{}");
  } catch {
    return {};
  }
}
function saveUnread(uid: string, v: Record<string, number>) {
  try {
    localStorage.setItem(UNREAD_LS(uid), JSON.stringify(v));
  } catch {}
}

export function useMessaging(currentUserId: string, authFetch: AuthFetch) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>(() =>
    currentUserId ? loadUnread(currentUserId) : {}
  );
  const [messagesOpen, setMessagesOpen] = useState(false);
  const mounted = useRef(false);

  const raw =
    (import.meta as any)?.env?.VITE_API_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5005/api";
  const apiBase = String(raw).replace(/\/$/, "");

  const getGate = useCallback(
    async (artistId: string) => {
      const res = await authFetch(`${apiBase}/messages/gate/${artistId}`, {
        method: "GET",
      });
      if (!res.ok)
        return {
          allowed: false,
          lastStatus: null,
          declines: 0,
          blocked: false,
        } as ConversationMeta;
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
    (data || []).forEach((c: Conversation) => base.set(c.participantId, c));

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
    setUnreadMap((m) => {
      const next = { ...m };
      nextConvs.forEach((c) => {
        if (next[c.participantId] == null) next[c.participantId] = 0;
      });
      return next;
    });
    setLoading(false);
  }, [apiBase, authFetch, currentUserId, getGate]);

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

  const markAsRead = useCallback((participantId: string) => {
    setUnreadMap((m) => (m[participantId] ? { ...m, [participantId]: 0 } : m));
  }, []);

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
      upsert(pid, (prev) => {
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
        setUnreadMap((map) => ({
          ...map,
          [pid]: Math.max(0, map[pid] || 0) + 1,
        }));
      }
    };

    const onPending = (p: {
      convoId: string;
      from: string;
      to: string;
      message: Message;
    }) => {
      const pid = currentUserId === p.to ? p.from : p.to;
      upsert(pid, (prev) => {
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
    };

    const onAccepted = (p: {
      convoId: string;
      clientId: string;
      artistId: string;
    }) => {
      const pid = currentUserId === p.clientId ? p.artistId : p.clientId;
      upsert(pid, (prev) => {
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
    };

    const onRemoved = () => {
      fetchAll();
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
  }, [currentUserId, expandedId, upsert, messagesOpen, fetchAll]);

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
    if (currentUserId) saveUnread(currentUserId, unreadMap);
  }, [currentUserId, unreadMap]);

  useEffect(() => {
    if (messagesOpen && expandedId) markAsRead(expandedId);
  }, [messagesOpen, expandedId, markAsRead]);

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
    },
    refresh: fetchAll,
    unreadMap,
    markAsRead,
    unreadTotal: Object.values(unreadMap).reduce((a, b) => a + (b || 0), 0),
  };
}