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

type AuthFetch = (
  url: string,
  options?: RequestInit
) => Promise<Response | any>;

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
  const mounted = useRef(false);

  const getGate = useCallback(
    async (artistId: string) => {
      const res: any = await authFetch(`/messages/gate/${artistId}`, {
        method: "GET",
      });
      if (res && typeof res === "object" && "allowed" in res)
        return res as ConversationMeta;
      if (res && typeof res.json === "function") {
        const j = await res.json().catch(() => null);
        if (j) return j as ConversationMeta;
      }
      return {
        allowed: false,
        lastStatus: null,
        declines: 0,
        blocked: false,
      } as ConversationMeta;
    },
    [authFetch]
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
    const res: any = await authFetch(`/messages/user/${currentUserId}`, {
      method: "GET",
    });
    const data: Conversation[] = Array.isArray(res)
      ? (res as Conversation[])
      : await (res as Response).json().catch(() => []);
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

    const convs: Conversation[] = Array.from(base.values());
    const metas = await Promise.all(
      convs.map(async (c: Conversation) => ({
        pid: c.participantId,
        meta: await getGate(c.participantId),
      }))
    );
    const metaMap: Record<string, ConversationMeta> = Object.fromEntries(
      metas.map((m) => [m.pid, m.meta])
    );

    const cleaned: Record<string, { username: string }> = { ...pending };
    convs.forEach((c: Conversation) => {
      const m = metaMap[c.participantId];
      if (m?.blocked || m?.allowed) delete cleaned[c.participantId];
    });
    savePending(cleaned);

    setConversations(
      convs
        .filter((c: Conversation) => !metaMap[c.participantId]?.blocked)
        .map((c: Conversation) => ({ ...c, meta: metaMap[c.participantId] }))
    );
    setLoading(false);
  }, [authFetch, currentUserId, getGate]);

  const removeConversation = useCallback((participantId: string) => {
    setConversations((prev) =>
      prev.filter((c) => c.participantId !== participantId)
    );
  }, []);

  const toggleCollapse = useCallback((participantId: string) => {
    setCollapsedMap((m) => ({ ...m, [participantId]: !m[participantId] }));
    setExpandedId((id) => (id === participantId ? null : participantId));
  }, []);

  const send = useCallback(
    async (receiverId: string, text: string) => {
      const res: any = await authFetch(`/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ senderId: currentUserId, receiverId, text }),
      });
      if (res && typeof res.ok === "boolean" && !res.ok)
        throw new Error(`HTTP ${res.status || 500}`);
      if (res && typeof res.json === "function") {
        const j = await res.json().catch(() => null);
        if (!j) throw new Error("Failed to send");
      }
    },
    [authFetch, currentUserId]
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
        return exists ? base : { ...base, messages: [...base.messages, m] };
      });
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

    const onRemoved = (p: { convoId: string }) => {
      setConversations((prev) =>
        prev.filter(
          (c) => threadKeyOf(currentUserId, c.participantId) !== p.convoId
        )
      );
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
  }, [currentUserId, expandedId, upsert]);

  return {
    loading,
    conversations,
    collapsedMap,
    expandedId,
    toggleCollapse,
    removeConversation,
    send,
    destroy: async (participantId: string) => {
      const res: any = await authFetch(`/messages/conversations`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ userId: currentUserId, participantId }),
      });
      if (res && typeof res.ok === "boolean" && !res.ok)
        throw new Error(`HTTP ${res.status || 500}`);
      removeConversation(participantId);
    },
    refresh: fetchAll,
  };
}