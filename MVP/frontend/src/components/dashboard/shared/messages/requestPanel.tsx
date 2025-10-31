import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";

type ReqItem = {
    id: string;
    from: { clerkId: string; username: string };
    text: string;
    timestamp: number;
};

type Props = {
    authFetch: (path: string, init?: RequestInit) => Promise<Response>;
    onOpenConversation: (clerkId: string) => void;
};

export default function RequestPanel({ authFetch, onOpenConversation }: Props) {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<ReqItem[]>([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const res = await authFetch("/api/messages/requests", { method: "GET" });
                const data = res.ok ? await res.json() : null;
                const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
                const mapped: ReqItem[] = list.map((r: any) => ({
                    id: String(r?._id || r?.id || r?.senderId || ""),
                    from: { clerkId: String(r?.senderId || ""), username: String(r?.sender?.username || r?.username || "") },
                    text: r?.text || "Message request",
                    timestamp: Number(r?.timestamp || Date.now())
                }));
                if (mounted) setItems(mapped);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [authFetch]);

    if (loading) {
        return (
            <div className="h-full grid place-items-center">
                <CircularProgress sx={{ color: "var(--fg)" }} />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-2">
            {items.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2 py-3">No requests</div>
            ) : (
                <ul className="space-y-2">
                    {items.map(it => (
                        <li
                            key={`${it.id}-${it.from.clerkId}`}
                            className="flex items-center justify-between rounded-lg border border-app px-3 py-2 bg-elevated"
                        >
                            <div className="min-w-0">
                                <div className="text-sm text-app truncate">{it.from.username}</div>
                                <div className="text-xs text-muted-foreground truncate">{it.text || "Message request"}</div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                                <button
                                    type="button"
                                    className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground"
                                    onClick={() => onOpenConversation(it.from.clerkId)}
                                    aria-label="View request"
                                >
                                    View
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}