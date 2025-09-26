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
  const [showContent, setShowContent] = useState(false);

  // Lazy load content with fade-in after 1.5s
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

  return (
    <div className="flex flex-col gap-4 overflow-y-auto h-full bg-black p-2 rounded-lg">
      {conversations.map((conv) => (
        <motion.div
          key={conv.participantId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-xl p-3 flex flex-col shadow-md border border-gray-800"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-white">{conv.username}</span>
            <div className="flex gap-2">
              <button
                onClick={() => onToggleCollapse(conv.participantId)}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                {collapsedMap[conv.participantId] ? "Open" : "Close"}
              </button>
              <button
                onClick={() => onRemoveConversation(conv.participantId)}
                className="text-xs text-red-500 hover:text-red-400 transition"
              >
                X
              </button>
            </div>
          </div>

          {!collapsedMap[conv.participantId] && (
            <>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto px-1 mb-2">
                {conv.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`${
                      msg.senderId === currentUserId
                        ? "self-end bg-gray-800 text-green-300 rounded-lg px-2 py-1"
                        : "self-start bg-gray-700 text-white rounded-lg px-2 py-1"
                    } max-w-[80%] break-words`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <div className="flex mt-2 gap-2">
                <input
                  type="text"
                  value={messageInput[conv.participantId] || ""}
                  onChange={(e) =>
                    setMessageInput((prev) => ({
                      ...prev,
                      [conv.participantId]: e.target.value,
                    }))
                  }
                  className="flex-1 p-2 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:border-white transition"
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend(conv.participantId);
                  }}
                />
                <button
                  onClick={() => handleSend(conv.participantId)}
                  className="bg-white text-black px-4 rounded-lg hover:bg-gray-200 transition"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default ChatWindow;
