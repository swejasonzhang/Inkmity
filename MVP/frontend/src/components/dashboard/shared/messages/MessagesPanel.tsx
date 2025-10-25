import { useApi } from "@/lib/api";
import ChatWindow from "@/components/dashboard/shared/ChatWindow";
import type { ArtistWithGroups } from "@/components/dashboard/client/ArtistPortfolio";
import { useMessaging } from "@/hooks/useMessaging";

type Props = {
    currentUserId: string;
    artist?: ArtistWithGroups | null;
    expandAllOnMount?: boolean;
};

export default function MessagesPanel({ currentUserId, artist = null }: Props) {
    const { request } = useApi();
    const authFetch = (url: string, options?: RequestInit) => request(url, options);

    const {
        loading,
        conversations,
        collapsedMap,
        expandedId,
        toggleCollapse,
        removeConversation,
    } = useMessaging(currentUserId, authFetch);

    const initialExpandedId = artist?.clerkId ?? null;

    return (
        <ChatWindow
            conversations={conversations}
            collapsedMap={collapsedMap}
            currentUserId={currentUserId}
            loading={loading}
            expandedId={initialExpandedId ?? expandedId}
            onToggleCollapse={toggleCollapse}
            onRemoveConversation={removeConversation}
            authFetch={authFetch}
            emptyText={"No conversations yet.\nTap an artist to start one!"}
        />
    );
}