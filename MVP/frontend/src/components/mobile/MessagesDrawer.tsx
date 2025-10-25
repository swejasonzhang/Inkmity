import { useEffect, useState, useCallback } from "react";
import ChatWindow, { Conversation, Message } from "@/components/dashboard/shared/ChatWindow";
import { useApi } from "@/lib/api";
import { API_URL } from "@/lib/http";

type ApiConv = {
    participantId?: string;
    partnerId?: string;
    userId?: string;
    username?: string;
    handle?: string;
    avatarUrl?: string;
    messages?: Array<{
        senderId: string; receiverId: string; text: string; timestamp: number;
        createdAt?: number;
    }>;
};

export default function MessagesPanel({ currentUserId }: { currentUserId: string }) {
    const { request } = useApi();
    const authFetch = useCallback(
        (url: string, options?: RequestInit) => {
            const full = url.startsWith("http") ? url : `${API_URL}${url}`;
            return request(full, options);
        },
        [request]
    );

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await authFetch(`/api/messages/user/${currentUserId}`, { method: "GET" });
                if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
                const json = await res.json();

                const raw: ApiConv[] =
                    json?.conversations ??
                    json?.data ??
                    json ??
                    [];

                const convs: Conversation[] = raw.map((c) => {
                    const pid = c.participantId || c.partnerId || c.userId || "";
                    const uname = c.username || c.handle || "Unknown";
                    const msgs: Message[] = (c.messages || []).map((m) => ({
                        senderId: m.senderId,
                        receiverId: m.receiverId,
                        text: m.text,
                        timestamp: m.timestamp ?? m.createdAt ?? Date.now(),
                    }));
                    return { participantId: pid, username: uname, avatarUrl: c.avatarUrl, messages: msgs };
                }).filter(c => c.participantId);

                if (cancelled) return;
                setConversations(convs);
                if (convs.length) setExpandedId(convs[0].participantId);
                setCollapsedMap(Object.fromEntries(convs.map(c => [c.participantId, false])));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authFetch, currentUserId]);

    return (
        <ChatWindow
            conversations={conversations}
            collapsedMap={collapsedMap}
            currentUserId={currentUserId}
            loading={loading}
            expandedId={expandedId}
            onToggleCollapse={(id) => setCollapsedMap((m) => ({ ...m, [id]: !m[id] }))}
            onRemoveConversation={(id) => {
                setConversations((prev) => prev.filter((c) => c.participantId !== id));
                setCollapsedMap((m) => {
                    const { [id]: _, ...rest } = m; return rest;
                });
                if (expandedId === id) setExpandedId(null);
            }}
            authFetch={authFetch}
        />
    );
}