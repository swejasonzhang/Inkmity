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
    const [serverRequests, setServerRequests] = useState<IncomingRequest[] | null>(null);

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
        if (!resolvedIsArtist) return;
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

    const reqIdByPid = useMemo(() => {
        const map: Record<string, string> = {};
        for (const r of effectiveRequests) {
            if (r?.from?.clerkId && r?.id) map[r.from.clerkId] = r.id;
        }
        return map;
    }, [effectiveRequests]);

    const patchLocalMeta = (participantId: string, allowed: boolean, lastStatus: "accepted" | "declined") => {
        setConversations((prev) =>
            prev.map((c) =>
                c.participantId !== participantId
                    ? c
                    : {
                        ...c,
                        meta: {
                            ...(c.meta || { declines: 0, blocked: false }),
                            allowed,
                            lastStatus,
                        },
                    }
            )
        );
    };

    const acceptByRequestId = useCallback(
        async (id: string) => {
            if (onAcceptRequest) {
                await onAcceptRequest(id);
            } else {
                await authFetch(`/messages/requests/${id}/accept`, { method: "POST" });
            }
        },
        [authFetch, onAcceptRequest]
    );

    const declineByRequestId = useCallback(
        async (id: string) => {
            if (onDeclineRequest) {
                await onDeclineRequest(id);
            } else {
                await authFetch(`/messages/requests/${id}/decline`, { method: "POST" });
            }
        },
        [authFetch, onDeclineRequest]
    );

    const acceptByPid = useCallback(
        async (participantId: string) => {
            const id = reqIdByPid[participantId];
            if (!id) return;
            await acceptByRequestId(id);
            patchLocalMeta(participantId, true, "accepted");
            setServerRequests((list) => (Array.isArray(list) ? list.filter((r) => r.id !== id) : list));
        },
        [reqIdByPid, acceptByRequestId]
    );

    const declineByPid = useCallback(
        async (participantId: string) => {
            const id = reqIdByPid[participantId];
            if (!id) return;
            await declineByRequestId(id);
            patchLocalMeta(participantId, false, "declined");
            setServerRequests((list) => (Array.isArray(list) ? list.filter((r) => r.id !== id) : list));
        },
        [reqIdByPid, declineByRequestId]
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
                            isArtist
                            onAcceptPending={acceptByPid}
                            onDeclinePending={declineByPid}
                        />
                    </div>

                    <div className="h-full min-h-0 rounded-xl border border-app bg-card p-3 overflow-y-auto">
                        <div className="text-sm font-semibold mb-2 text-app">Message requests</div>
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
                                    <div className="shrink-0 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => declineByRequestId(r.id)}
                                            className="px-2 py-1 rounded-md bg-elevated hover:bg-elevated/80 text-xs text-app"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => acceptByRequestId(r.id)}
                                            className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs"
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
                        isArtist={resolvedIsArtist}
                        onAcceptPending={acceptByPid}
                        onDeclinePending={declineByPid}
                    />
                </div>
            )}
        </div>
    );
};

export type { IncomingRequest };
export default MessagesPanel;