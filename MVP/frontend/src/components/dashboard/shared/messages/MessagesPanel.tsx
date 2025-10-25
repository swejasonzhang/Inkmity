import type { FC } from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import ChatWindow from "../ChatWindow";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import type { Conversation } from "@/hooks/useMessaging";

type IncomingRequest = {
    id: string;
    from: { clerkId: string; username: string };
    text: string;
    timestamp: number;
};

type Props = {
    currentUserId: string;
    expandAllOnMount?: boolean;
    requests?: IncomingRequest[];
    isArtist?: boolean;
    onBadgeCountChange?: (count: number) => void;
};

const MessagesPanel: FC<Props> = ({
    currentUserId,
    expandAllOnMount,
    requests,
    isArtist: isArtistProp,
    onBadgeCountChange,
}) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
    const [serverRequests, setServerRequests] = useState<IncomingRequest[] | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const resolvedIsArtist = useMemo(() => {
        if (typeof isArtistProp === "boolean") return isArtistProp;
        const pm: any = user?.publicMetadata ?? {};
        const um: any = user?.unsafeMetadata ?? {};
        const roles = new Set<string>(
            []
                .concat(pm.role ?? [])
                .concat(pm.roles ?? [])
                .concat(um.role ?? [])
                .concat(um.roles ?? [])
                .flat()
                .filter(Boolean)
        );
        return roles.has("artist");
    }, [isArtistProp, user?.publicMetadata, user?.unsafeMetadata]);

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
                const arr: Conversation[] = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.conversations)
                        ? data.conversations
                        : [];
                if (mounted) setConversations(arr);
                if (mounted) {
                    const next: Record<string, number> = {};
                    for (const c of arr) next[c.participantId] = next[c.participantId] ?? 0;
                    setUnreadMap((m) => ({ ...next, ...m }));
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
        if (!resolvedIsArtist) {
            setServerRequests(null);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const res = await authFetch(`/messages/requests`, { method: "GET" });
                if (!res.ok) {
                    if (mounted) setServerRequests([]);
                    return;
                }
                const data = (await res.json()) as IncomingRequest[] | { requests: IncomingRequest[] };
                const list = Array.isArray(data) ? data : Array.isArray((data as any)?.requests) ? (data as any).requests : [];
                if (mounted) setServerRequests(list);
            } catch {
                if (mounted) setServerRequests([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [authFetch, resolvedIsArtist]);

    useEffect(() => {
        if (!expandAllOnMount || !conversations.length) return;
        const map: Record<string, boolean> = {};
        for (const c of conversations) map[c.participantId] = false;
        setCollapsedMap(map);
    }, [expandAllOnMount, conversations]);

    const onToggleCollapse = (participantId: string) =>
        setCollapsedMap((m) => ({ ...m, [participantId]: !m[participantId] }));

    const onRemoveConversation = (participantId: string) =>
        setConversations((list) => list.filter((c) => c.participantId !== participantId));

    const onMarkRead = useCallback((participantId: string) => {
        setUnreadMap((m) => (m[participantId] ? { ...m, [participantId]: 0 } : m));
    }, []);

    const derivedRequests = useMemo(() => {
        const items = conversations
            .filter((c) => c.meta && c.meta.lastStatus === "pending" && !c.meta.allowed)
            .map((c) => {
                const firstReqMsg =
                    [...c.messages].reverse().find((m) => (m as any)?.meta?.kind === "request") || c.messages[0];
                return {
                    id: c.participantId,
                    from: { clerkId: c.participantId, username: c.username },
                    text: (firstReqMsg as any)?.text || "Message request",
                    timestamp: (firstReqMsg as any)?.timestamp || Date.now(),
                } as IncomingRequest;
            });
        return items;
    }, [conversations]);

    const effectiveRequests: IncomingRequest[] = useMemo(() => {
        if (!resolvedIsArtist) return [];
        if (Array.isArray(serverRequests) && serverRequests.length) return serverRequests;
        if (Array.isArray(requests) && requests.length) return requests;
        return derivedRequests;
    }, [resolvedIsArtist, serverRequests, requests, derivedRequests]);

    const badgeCount = useMemo(() => {
        const unread = Object.values(unreadMap).reduce((acc, n) => acc + (n > 0 ? 1 : 0), 0);
        const reqs = resolvedIsArtist ? effectiveRequests.length : 0;
        return unread + reqs;
    }, [unreadMap, effectiveRequests.length, resolvedIsArtist]);

    useEffect(() => {
        if (onBadgeCountChange) onBadgeCountChange(badgeCount);
    }, [badgeCount, onBadgeCountChange]);

    if (loading) {
        return (
            <div className="h-full grid place-items-center">
                <CircularProgress sx={{ color: "var(--fg)" }} />
            </div>
        );
    }

    const hasRequests = resolvedIsArtist && effectiveRequests.length > 0;

    return (
        <div className="h-full min-h-0 w-full flex flex-col gap-3">
            {hasRequests ? (
                <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="lg:col-span-2 h-full min-h-0 flex">
                        <ChatWindow
                            conversations={conversations}
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
                        />
                    </div>

                    <div className="h-full min-h-0 rounded-xl border border-app bg-card p-3 overflow-y-auto">
                        <div className="text-sm font-semibold mb-1 text-app">Message requests</div>
                        <div className="text-xs text-muted-foreground mb-3">
                            Review new requests. View to open the thread.
                        </div>
                        <ul className="space-y-2">
                            {effectiveRequests.map((r) => (
                                <li
                                    key={`${r.id}-${r.from?.clerkId}`}
                                    className="flex items-center justify-between rounded-lg border border-app px-3 py-2 bg-elevated"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm text-app truncate">
                                            {r.from?.username || r.from?.clerkId}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {r.text || "Message request"}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="shrink-0 ml-3 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground"
                                        onClick={() => setExpandedId(r.from?.clerkId || null)}
                                        aria-label="View request"
                                    >
                                        View
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="h-full min-h-0 flex-1">
                    <ChatWindow
                        conversations={conversations}
                        collapsedMap={collapsedMap}
                        currentUserId={currentUserId}
                        loading={false}
                        onToggleCollapse={onToggleCollapse}
                        onRemoveConversation={onRemoveConversation}
                        authFetch={authFetch}
                        unreadMap={unreadMap}
                        onMarkRead={onMarkRead}
                        isArtist={resolvedIsArtist}
                        expandedId={expandedId}
                    />
                </div>
            )}
        </div>
    );
};

export type { IncomingRequest };
export default MessagesPanel;