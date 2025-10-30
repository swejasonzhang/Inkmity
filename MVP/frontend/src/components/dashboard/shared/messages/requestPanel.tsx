import type { FC } from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import ChatWindow from "../ChatWindow";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import type { Conversation } from "@/hooks/useMessaging";

type Props = {
    currentUserId: string;
    isArtist: boolean;
    expandAllOnMount?: boolean;
};

const RequestPanel: FC<Props> = ({ currentUserId, isArtist, expandAllOnMount = false }) => {
    const { getToken } = useAuth();

    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const authFetch = useCallback(
        async (path: string, init: RequestInit = {}) => {
            const token = await getToken();
            const base = API_URL.replace(/\/$/, "");
            const cleaned = path.replace(/^\/api/, "");
            const url = path.startsWith("http") ? path : `${base}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
            const headers = new Headers(init.headers || {});
            headers.set("Accept", "application/json");
            headers.set("Content-Type", "application/json");
            if (token) headers.set("Authorization", `Bearer ${token}`);
            return fetch(url, { ...init, headers, credentials: "include" });
        },
        [getToken]
    );

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                if (!currentUserId) {
                    if (mounted) setConversations([]);
                    return;
                }
                const res = await authFetch(`/messages/user/${currentUserId}`, { method: "GET" });
                if (!res.ok) {
                    if (mounted) setConversations([]);
                    return;
                }
                const data = await res.json();
                const arr: Conversation[] = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : [];
                if (mounted) setConversations(arr);
                if (mounted) {
                    const next: Record<string, number> = {};
                    for (const c of arr) next[c.participantId] = next[c.participantId] ?? 0;
                    setUnreadMap(m => ({ ...next, ...m }));
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [authFetch, currentUserId]);

    useEffect(() => {
        if (!expandAllOnMount || !conversations.length) return;
        const map: Record<string, boolean> = {};
        for (const c of conversations) map[c.participantId] = false;
        setCollapsedMap(map);
    }, [expandAllOnMount, conversations]);

    const onToggleCollapse = (participantId: string) => setCollapsedMap(m => ({ ...m, [participantId]: !m[participantId] }));

    const onRemoveConversation = (participantId: string) => setConversations(list => list.filter(c => c.participantId !== participantId));

    const onMarkRead = useCallback((participantId: string) => {
        setUnreadMap(m => (m[participantId] ? { ...m, [participantId]: 0 } : m));
    }, []);

    const onAcceptPending = useCallback((participantId: string) => {
        setConversations(list =>
            list.map(c => {
                if (c.participantId !== participantId) return c;
                const metaAny: any = c.meta || {};
                const newMeta: any = {
                    ...metaAny,
                    lastStatus: "accepted",
                    allowed: true,
                    declines: typeof metaAny.declines === "number" ? metaAny.declines : 0,
                    blocked: typeof metaAny.blocked === "boolean" ? metaAny.blocked : false
                };
                return { ...c, meta: newMeta } as Conversation;
            })
        );
    }, []);

    const onDeclinePending = useCallback((participantId: string) => {
        setConversations(list =>
            list.map(c => {
                if (c.participantId !== participantId) return c;
                const metaAny: any = c.meta || {};
                const newMeta: any = {
                    ...metaAny,
                    lastStatus: "declined",
                    allowed: false,
                    declines: typeof metaAny.declines === "number" ? metaAny.declines : 0,
                    blocked: typeof metaAny.blocked === "boolean" ? metaAny.blocked : false
                };
                return { ...c, meta: newMeta } as Conversation;
            })
        );
    }, []);

    const derivedRequests = useMemo(() => {
        if (!isArtist) return [];
        return conversations
            .filter((c: any) => c.meta && c.meta.lastStatus === "pending" && !c.meta.allowed)
            .map((c: any) => {
                const firstReqMsg =
                    [...c.messages].reverse().find((m: any) => (m as any)?.meta?.kind === "request") || c.messages[0];
                return {
                    id: c.participantId,
                    from: { clerkId: c.participantId, username: c.username },
                    text: (firstReqMsg as any)?.text || "Message request",
                    timestamp: (firstReqMsg as any)?.timestamp || Date.now()
                };
            });
    }, [conversations, isArtist]);

    if (loading) {
        return (
            <div className="h-full grid place-items-center">
                <CircularProgress sx={{ color: "var(--fg)" }} />
            </div>
        );
    }

    const hasRequests = isArtist && derivedRequests.length > 0;

    return (
        <div className="h-full min-h-0 w-full flex flex-col gap-3">
            {hasRequests ? (
                <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="lg:col-span-2 h-full min-h-0 flex">
                        <ChatWindow
                            conversations={conversations as unknown as any}
                            collapsedMap={collapsedMap}
                            currentUserId={currentUserId}
                            loading={false}
                            onToggleCollapse={onToggleCollapse}
                            onRemoveConversation={onRemoveConversation}
                            authFetch={authFetch}
                            unreadMap={unreadMap}
                            onMarkRead={onMarkRead}
                            isArtist
                            expandedId={expandedId}
                            onAcceptPending={onAcceptPending}
                            onDeclinePending={onDeclinePending}
                        />
                    </div>

                    <div className="h-full min-h-0 rounded-xl border border-app bg-card p-3 overflow-y-auto">
                        <div className="text-sm font-semibold mb-1 text-app">Message requests</div>
                        <div className="text-xs text-muted-foreground mb-3">Review new requests. View to open the thread.</div>
                        <ul className="space-y-2">
                            {derivedRequests.map((r: any) => (
                                <li
                                    key={`${r.id}-${r.from?.clerkId}`}
                                    className="flex items-center justify-between rounded-lg border border-app px-3 py-2 bg-elevated"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm text-app truncate">{r.from?.username || r.from?.clerkId}</div>
                                        <div className="text-xs text-muted-foreground truncate">{r.text || "Message request"}</div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground"
                                            onClick={() => setExpandedId(r.from?.clerkId || null)}
                                            aria-label="View request"
                                        >
                                            View
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="h-full min-h-0 flex-1">
                    <ChatWindow
                        conversations={conversations as unknown as any}
                        collapsedMap={collapsedMap}
                        currentUserId={currentUserId}
                        loading={false}
                        onToggleCollapse={onToggleCollapse}
                        onRemoveConversation={onRemoveConversation}
                        authFetch={authFetch}
                        unreadMap={unreadMap}
                        onMarkRead={onMarkRead}
                        isArtist={isArtist}
                        expandedId={expandedId}
                        onAcceptPending={onAcceptPending}
                        onDeclinePending={onDeclinePending}
                    />
                </div>
            )}
        </div>
    );
};

export default RequestPanel;