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
    onAcceptRequest?: (id: string) => Promise<void> | void;
    onDeclineRequest?: (id: string) => Promise<void> | void;
    isArtist?: boolean;
};

const MessagesPanel: FC<Props> = ({
    currentUserId,
    expandAllOnMount,
    requests,
    onAcceptRequest,
    onDeclineRequest,
    isArtist: isArtistProp,
}) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

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
            const url = path.startsWith("http")
                ? path
                : `${base}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
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
                    [...c.messages].reverse().find((m) => m.meta?.kind === "request") || c.messages[0];
                return {
                    id: c.participantId,
                    from: { clerkId: c.participantId, username: c.username },
                    text: firstReqMsg?.text || "Message request",
                    timestamp: firstReqMsg?.timestamp || Date.now(),
                } as IncomingRequest;
            });
        return items;
    }, [conversations]);

    const effectiveRequests: IncomingRequest[] =
        (resolvedIsArtist && Array.isArray(requests) && requests.length > 0 ? requests : derivedRequests) || [];

    const callAccept = useCallback(
        async (req: IncomingRequest) => {
            const apiReq = Array.isArray(requests) ? requests.find((r) => r.from?.clerkId === req.from.clerkId) : undefined;
            if (apiReq?.id && onAcceptRequest) {
                await onAcceptRequest(apiReq.id);
                return;
            }
            await authFetch(`/messages/requests/by-participant/${req.from.clerkId}/accept`, { method: "POST" });
        },
        [authFetch, onAcceptRequest, requests]
    );

    const callDecline = useCallback(
        async (req: IncomingRequest) => {
            const apiReq = Array.isArray(requests) ? requests.find((r) => r.from?.clerkId === req.from.clerkId) : undefined;
            if (apiReq?.id && onDeclineRequest) {
                await onDeclineRequest(apiReq.id);
                return;
            }
            await authFetch(`/messages/requests/by-participant/${req.from.clerkId}/decline`, { method: "POST" });
        },
        [authFetch, onDeclineRequest, requests]
    );

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
                        />
                    </div>

                    <div className="h-full min-h-0 rounded-xl border border-white/10 bg-[#1f2937] p-3 overflow-y-auto">
                        <div className="text-sm font-semibold mb-2">Message requests</div>
                        <ul className="space-y-2">
                            {effectiveRequests.map((r) => (
                                <li
                                    key={`${r.id}-${r.from?.clerkId}`}
                                    className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm text-white truncate">
                                            {r.from?.username || r.from?.clerkId}
                                        </div>
                                        <div className="text-xs text-white/70 truncate">
                                            {r.text || "Message request"}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => callDecline(r)}
                                            className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => callAccept(r)}
                                            className="px-2 py-1 rounded-md bg-white text-black text-xs"
                                        >
                                            Accept
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
                        conversations={conversations}
                        collapsedMap={collapsedMap}
                        currentUserId={currentUserId}
                        loading={false}
                        onToggleCollapse={onToggleCollapse}
                        onRemoveConversation={onRemoveConversation}
                        authFetch={authFetch}
                        unreadMap={unreadMap}
                        onMarkRead={onMarkRead}
                    />
                </div>
            )}
        </div>
    );
};

export type { IncomingRequest };
export default MessagesPanel;