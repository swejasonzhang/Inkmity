import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Req = {
    _id: string;
    senderId: string;
    receiverId: string;
    text: string;
    meta?: { budgetCents?: number; style?: string; targetDateISO?: string; referenceUrls?: string[]; placement?: string; workRefs?: string[] };
    createdAt: string;
};

export default function RequestsPanel({ authFetch }: { authFetch: (url: string, opts?: RequestInit) => Promise<Response> }) {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<Req[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const r = await authFetch("/api/messages/requests");
            const data = await r.json();
            setItems(data?.requests || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const accept = async (id: string) => {
        await authFetch(`/api/messages/requests/${id}/accept`, { method: "POST" });
        await load();
    };
    const decline = async (id: string) => {
        await authFetch(`/api/messages/requests/${id}/decline`, { method: "POST" });
        await load();
    };

    return (
        <Card className="rounded-2xl bg-card border border-app overflow-hidden">
            <CardHeader className="px-4 py-5 border-b border-app">
                <CardTitle className="w-full text-center font-extrabold text-2xl sm:text-3xl">Message Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {loading && <div className="text-subtle">Loading…</div>}
                {!loading && items.length === 0 && <div className="text-subtle">No pending requests.</div>}
                {items.map((r) => (
                    <div key={r._id} className="rounded-xl border border-app p-4 bg-elevated">
                        <div className="text-sm mb-2 whitespace-pre-wrap">{r.text}</div>
                        <div className="text-xs text-subtle">
                            {r.meta?.style ? <div>Style: {r.meta.style}</div> : null}
                            {r.meta?.placement ? <div>Placement: {r.meta.placement}</div> : null}
                            {r.meta?.targetDateISO ? <div>Target: {new Date(r.meta.targetDateISO).toDateString()}</div> : null}
                            {r.meta?.referenceUrls?.length ? (
                                <div className="mt-1">Refs: {r.meta.referenceUrls.map((u, i) => <a key={i} href={u} className="underline mr-2" target="_blank">{i + 1}</a>)}</div>
                            ) : null}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Button onClick={() => accept(r._id)}>Accept</Button>
                            <Button variant="outline" onClick={() => decline(r._id)}>Decline</Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}