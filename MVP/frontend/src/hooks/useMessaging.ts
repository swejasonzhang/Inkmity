import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";

export type Message = {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
};
export type Conversation = {
  participantId: string;
  username: string;
  messages: Message[];
};

type AuthFetch = (url: string, options?: RequestInit) => Promise<Response>;

export function useMessaging(currentUserId: string, authFetch: AuthFetch) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const mounted = useRef(false);

  const apiBase =
    (import.meta as any)?.env?.VITE_API_URL ||
    import.meta.env?.VITE_API_URL ||
    "http://localhost:5005/api";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const url = `${apiBase}/messages/user/${currentUserId}`;
    const res = await authFetch(url, { method: "GET" });
    if (!res.ok) {
      setLoading(false);
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as Conversation[];
    console.log("[booking] fetched ->", { url, conversations: data.length });
    data.forEach((c) =>
      c.messages.forEach((m) => {
        const clientId =
          m.senderId === currentUserId ? currentUserId : m.receiverId;
        const artistId =
          m.senderId === currentUserId ? m.receiverId : m.senderId;
        console.log("[booking] history ->", {
          message: m.text,
          clientId,
          artistId,
        });
      })
    );
    setConversations(data);
    setLoading(false);
  }, [apiBase, authFetch, currentUserId]);

  const upsertMessage = useCallback(
    (m: Message) => {
      const clientId =
        m.senderId === currentUserId ? currentUserId : m.receiverId;
      const artistId = m.senderId === currentUserId ? m.receiverId : m.senderId;
      console.log("[booking] recv ->", { message: m.text, clientId, artistId });
      setConversations((prev) => {
        const pid = m.senderId === currentUserId ? m.receiverId : m.senderId;
        const idx = prev.findIndex((c) => c.participantId === pid);
        if (idx === -1)
          return [
            ...prev,
            { participantId: pid, username: "Conversation", messages: [m] },
          ];
        const next = prev.slice();
        next[idx] = { ...next[idx], messages: [...next[idx].messages, m] };
        return next;
      });
    },
    [currentUserId]
  );

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
      const url = `${apiBase}/messages`;
      const payload = { receiverId, text };
      const clientId = currentUserId;
      const artistId = receiverId;
      console.log("[booking] send ->", {
        url,
        message: text,
        clientId,
        artistId,
      });
      const res = await authFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      try {
        const saved = (await res.json()) as Message | { message?: Message };
        const msg = ("senderId" in saved ? saved : saved?.message) as
          | Message
          | undefined;
        if (msg && msg.text) upsertMessage(msg);
      } catch {}
      await fetchAll();
    },
    [apiBase, authFetch, currentUserId, fetchAll, upsertMessage]
  );

  const destroy = useCallback(
    async (participantId: string) => {
      const url = `${apiBase}/messages/conversations`;
      const res = await authFetch(url, {
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
    fetchAll().catch(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    if (!currentUserId) return;
    (socket as any).auth = { userId: currentUserId };
    socket.connect();
    socket.emit("user:join", { userId: currentUserId });

    const onNew = (m: Message) => upsertMessage(m);
    const onBulk = (list: Message[]) => list.forEach(upsertMessage);
    const onDeleted = (p: { participantId: string }) =>
      removeConversation(p.participantId);

    socket.on("message:new", onNew);
    socket.on("messages:sync", onBulk);
    socket.on("conversation:deleted", onDeleted);

    return () => {
      socket.off("message:new", onNew);
      socket.off("messages:sync", onBulk);
      socket.off("conversation:deleted", onDeleted);
      socket.disconnect();
    };
  }, [currentUserId, upsertMessage, removeConversation]);

  return {
    loading,
    conversations,
    collapsedMap,
    expandedId,
    toggleCollapse,
    removeConversation,
    send,
    destroy,
  };
}
