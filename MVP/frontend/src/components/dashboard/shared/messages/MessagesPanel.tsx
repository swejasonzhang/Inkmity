import { useApi } from "@/lib/api";
import ChatWindow, { type Conversation } from "@/components/dashboard/shared/ChatWindow";
import { useMessaging } from "@/hooks/useMessaging";

export default function MessagesPanel({ currentUserId }: { currentUserId: string }) {
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

    return (
        <ChatWindow
            conversations={conversations as Conversation[]}
            collapsedMap={collapsedMap}
            currentUserId={currentUserId}
            loading={loading}
            expandedId={expandedId}
            onToggleCollapse={toggleCollapse}
            onRemoveConversation={removeConversation}
            authFetch={authFetch}
            emptyText={"No conversations yet.\nTap an artist to start one!"}
        />
    );
}