import { useCallback, useEffect, useRef, useState } from "react";

export type Message = {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
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

function loadPending(): Record<string, { username: string }> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_LS) || "{}");
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

  const apiBase =
    (import.meta as any)?.env?.VITE_API_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5005";

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const url = `${apiBase}/messages/user/${currentUserId}`;
    const res = await authFetch(url, { method: "GET" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as Conversation[];

    const baseSet = new Map<string, Conversation>();
    data.forEach((c) => baseSet.set(c.participantId, c));

    const pending = loadPending();
    Object.entries(pending).forEach(([pid, v]) => {
      if (!baseSet.has(pid)) {
        baseSet.set(pid, {
          participantId: pid,
          username: v.username || "Conversation",
          messages: [],
        });
      }
    });

    const convs = Array.from(baseSet.values());
    const metas = await Promise.all(
      convs.map(async (c) => {
        const meta = await getGate(c.participantId);
        return { pid: c.participantId, meta };
      })
    );
    const metaMap = Object.fromEntries(metas.map((m) => [m.pid, m.meta]));

    const cleanedPending = { ...pending };
    convs.forEach((c) => {
      const meta = metaMap[c.participantId];
      if (!meta) return;
      if (meta.blocked || meta.allowed) delete cleanedPending[c.participantId];
    });
    savePending(cleanedPending);

    setConversations(
      convs
        .filter((c) => {
          const meta = metaMap[c.participantId];
          if (!meta) return true;
          if (meta.blocked) return false;
          return true;
        })
        .map((c) => ({ ...c, meta: metaMap[c.participantId] }))
    );
    setLoading(false);
  }, [apiBase, authFetch, currentUserId, getGate]);

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
      const res = await authFetch(`${apiBase}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ senderId: currentUserId, receiverId, text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAll();
    },
    [apiBase, authFetch, currentUserId, fetchAll]
  );

  const destroy = useCallback(
    async (participantId: string) => {
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
      await fetchAll();
    },
    [apiBase, authFetch, currentUserId, removeConversation, fetchAll]
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const onAddPending = (e: Event) => {
      const ev = e as CustomEvent<{ artistId: string; username: string }>;
      const { artistId, username } = ev.detail || ({} as any);
      if (!artistId) return;
      const pending = loadPending();
      pending[artistId] = { username: username || "Conversation" };
      savePending(pending);
      fetchAll();
    };
    window.addEventListener(
      "ink:add-pending-conversation",
      onAddPending as EventListener
    );
    return () =>
      window.removeEventListener(
        "ink:add-pending-conversation",
        onAddPending as EventListener
      );
  }, [fetchAll]);

  return {
    loading,
    conversations,
    collapsedMap,
    expandedId,
    toggleCollapse,
    removeConversation,
    send,
    destroy,
    refresh: fetchAll,
  };
}