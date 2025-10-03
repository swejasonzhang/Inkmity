import React from "react";
import { X, MessageSquare } from "lucide-react";
import ChatWindow, { Conversation } from "@/components/dashboard/ChatWindow";

type Props = {
    open: boolean;
    onClose: () => void;
    conversations: Conversation[];
    collapsedMap: Record<string, boolean>;
    currentUserId: string;
    loading: boolean;
    expandedId: string | null;
    onToggleCollapse: (id: string) => void;
    onRemoveConversation: (id: string) => void;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
};

const MessagesDrawer: React.FC<Props> = ({
    open,
    onClose,
    conversations,
    collapsedMap,
    currentUserId,
    loading,
    expandedId,
    onToggleCollapse,
    onRemoveConversation,
    authFetch,
}) => {
    if (!open) return null;

    return (
        <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-gray-900 border-t border-white/10 shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <MessageSquare size={18} />
                        <span>Messaging</span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10" aria-label="Close messages">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ChatWindow
                        conversations={conversations}
                        collapsedMap={collapsedMap}
                        currentUserId={currentUserId}
                        loading={loading}
                        emptyText={"No conversations yet.\nTap an artist to start one!"}
                        onToggleCollapse={onToggleCollapse}
                        onRemoveConversation={onRemoveConversation}
                        expandedId={expandedId}
                        authFetch={authFetch}
                    />
                </div>
            </div>
        </div>
    );
};

export default MessagesDrawer;