import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CircularProgress from "@mui/material/CircularProgress";

export interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  participantId: string;
  username: string;
  messages: Message[];
}

interface ChatWindowProps {
  conversations: Conversation[];
  collapsedMap: Record<string, boolean>;
  currentUserId: string;
  loading: boolean;
  emptyText?: string;
  onToggleCollapse: (participantId: string) => void;
  onRemoveConversation: (participantId: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversations,
  collapsedMap,
  currentUserId,
  loading,
  emptyText = "No conversations currently. Please click an artist to start one!",
  onToggleCollapse,
  onRemoveConversation,
}) => {
  const [messageInput, setMessageInput] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!showContent || loading) {
    return (
      <div className="flex justify-center items-center py-10 h-full bg-black">
        <CircularProgress sx={{ color: "#ffffff" }} />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center items-center h-full text-center text-gray-400 px-4 bg-black"
      >
        {emptyText}
      </motion.div>
    );
  }

  const handleSend = (participantId: string) => {
    const text = messageInput[participantId]?.trim();
    if (!text) return;

    const msg: Message = {
      senderId: currentUserId,
      receiverId: participantId,
      text,
      timestamp: Date.now(),
    };

    const convIndex = conversations.findIndex(
      (c) => c.participantId === participantId
    );
    if (convIndex !== -1) {
      conversations[convIndex].messages.push(msg);
    }

    setMessageInput((prev) => ({ ...prev, [participantId]: "" }));
  };

  const handleToggle = (participantId: string) => {
    const isCurrentlyExpanded = expandedId === participantId;
    setExpandedId(isCurrentlyExpanded ? null : participantId);
    onToggleCollapse(participantId);

    // Collapse all others
    conversations.forEach((conv) => {
      if (
        conv.participantId !== participantId &&
        !collapsedMap[conv.participantId]
      ) {
        onToggleCollapse(conv.participantId);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto h-full bg-black p-2">
      {conversations.map((conv) => {
        const isExpanded =
          expandedId === conv.participantId &&
          !collapsedMap[conv.participantId];
        return (
          <motion.div
            key={conv.participantId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`bg-black rounded-lg flex flex-col transition-all duration-300 border border-gray-700 ${
              isExpanded ? "flex-1 min-h-[200px]" : "h-12"
            }`}
          >
            <div
              className="flex justify-between items-center px-3 pt-2 cursor-pointer"
              onClick={() => handleToggle(conv.participantId)}
            >
              <span className="text-white font-extrabold text-lg">
                {conv.username}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveConversation(conv.participantId);
                  }}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="flex flex-col flex-1 px-3 pb-3">
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto mb-2">
                  {conv.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`${
                        msg.senderId === currentUserId
                          ? "text-right text-white"
                          : "text-left text-gray-300"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput[conv.participantId] || ""}
                    onChange={(e) =>
                      setMessageInput((prev) => ({
                        ...prev,
                        [conv.participantId]: e.target.value,
                      }))
                    }
                    className="flex-1 p-1 rounded bg-gray-800 text-white"
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend(conv.participantId);
                    }}
                  />
                  <button
                    onClick={() => handleSend(conv.participantId)}
                    className="bg-gray-700 px-3 rounded text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default ChatWindow;