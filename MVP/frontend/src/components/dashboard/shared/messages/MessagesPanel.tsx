import { useState } from "react";
import ChatWindow, { Conversation, Message } from "@/components/dashboard/shared/ChatWindow";
import ArtistBooking from "@/components/dashboard/client/ArtistBooking";
import type { ArtistWithGroups } from "@/components/dashboard/client/ArtistPortfolio";
import { useApi } from "@/lib/api";

export default function MessagesPanel({
    currentUserId,
    artist,
}: {
    currentUserId: string;
    artist: ArtistWithGroups;
}) {
    const { request } = useApi();
    const authFetch = (url: string, options?: RequestInit) => request(url, options);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    function upsertConversation(participantId: string, username: string, msg: Message) {
        setConversations((prev) => {
            const i = prev.findIndex((c) => c.participantId === participantId);
            if (i === -1) return [...prev, { participantId, username, messages: [msg] }];
            const next = [...prev];
            next[i] = { ...next[i], messages: [...next[i].messages, msg] };
            return next;
        });
        setCollapsedMap((m) => ({ ...m, [participantId]: false }));
        setExpandedId(participantId);
    }

    async function handleArtistMessage(a: ArtistWithGroups, text: string) {
        if (!a.clerkId) throw new Error("Artist missing clerkId");
        const participantId = a.clerkId;
        const msg: Message = {
            senderId: currentUserId,
            receiverId: participantId,
            text,
            timestamp: Date.now(),
        };
        upsertConversation(participantId, a.username ?? "Unknown", msg);
        const res = await authFetch("http://localhost:5005/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ receiverId: participantId, text }),
        });
        if (!res.ok) {
            setConversations((prev) =>
                prev.map((c) =>
                    c.participantId === participantId
                        ? { ...c, messages: c.messages.filter((m) => !(m.timestamp === msg.timestamp && m.text === msg.text)) }
                        : c
                )
            );
            throw new Error(`Send failed ${res.status}`);
        }
    }

    return (
        <>
            <ArtistBooking artist={artist} onMessage={handleArtistMessage} />
            <ChatWindow
                conversations={conversations}
                collapsedMap={collapsedMap}
                currentUserId={currentUserId}
                loading={false}
                expandedId={expandedId}
                onToggleCollapse={(id) => setCollapsedMap((m) => ({ ...m, [id]: !m[id] }))}
                onRemoveConversation={(id) => setConversations((prev) => prev.filter((c) => c.participantId !== id))}
                authFetch={authFetch}
            />
        </>
    );
}