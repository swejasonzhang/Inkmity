import React, { useState } from "react";
import ChatWindow, { Message } from "./ChatWindow";

interface Conversation {
  otherUserId: string;
  userName: string;
  messages: Message[];
}

interface ChatManagerProps {
  userId: string;
}

const ChatManager: React.FC<ChatManagerProps> = ({ userId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  const sendMessage = (otherUserId: string, userName: string, text: string) => {
    setConversations((prev) => {
      const existingIndex = prev.findIndex(
        (c) => c.otherUserId === otherUserId
      );

      if (existingIndex !== -1) {
        // update existing conversation
        const updated = [...prev];
        updated[existingIndex].messages.push({
          senderId: userId,
          text,
          timestamp: Date.now(),
        });
        return updated;
      } else {
        // create a new conversation
        return [
          ...prev,
          {
            otherUserId,
            userName,
            messages: [
              {
                senderId: userId,
                text,
                timestamp: Date.now(),
              },
            ],
          },
        ];
      }
    });

    setActiveChat(otherUserId);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar: list of conversations */}
      <div className="w-1/3 border-r overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.otherUserId}
            onClick={() => setActiveChat(conv.otherUserId)}
            className={`p-2 cursor-pointer ${
              activeChat === conv.otherUserId
                ? "bg-gray-700 text-white"
                : "bg-gray-100"
            }`}
          >
            {conv.userName}
          </div>
        ))}
      </div>

      {/* Active chat */}
      <div className="flex-1">
        {activeChat ? (
          <ChatWindow
            userId={userId}
            otherUserId={activeChat}
            userName={
              conversations.find((c) => c.otherUserId === activeChat)
                ?.userName || ""
            }
            messages={
              conversations.find((c) => c.otherUserId === activeChat)
                ?.messages ?? []
            }
            onSend={(text: string) =>
              sendMessage(
                activeChat,
                conversations.find((c) => c.otherUserId === activeChat)
                  ?.userName || "",
                text
              )
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatManager;
