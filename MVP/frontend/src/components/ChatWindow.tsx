import React, { useEffect, useState, useRef } from "react";

export interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  artistId: string;
  artistName: string;
  messages: Message[];
}

interface ChatWindowProps {
  userId: string;
  conversations: Conversation[];
  onSelectArtist: (artistId: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  userId,
  conversations,
  onSelectArtist,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sortedConversations, setSortedConversations] = useState<
    Conversation[]
  >([]);

  useEffect(() => {
    // Sort conversations by latest message timestamp (descending)
    const sorted = [...conversations].sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.timestamp || 0;
      const bLast = b.messages[b.messages.length - 1]?.timestamp || 0;
      return bLast - aLast;
    });
    setSortedConversations(sorted);
  }, [conversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [sortedConversations]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-2 max-h-[95vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl p-2"
    >
      {sortedConversations.length === 0 && (
        <p className="text-gray-400 text-sm text-center">
          No conversations yet.
        </p>
      )}

      {sortedConversations.map((conv) => {
        const lastMessage = conv.messages[conv.messages.length - 1];
        return (
          <div
            key={conv.artistId}
            className="flex flex-col bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-700 transition"
            onClick={() => onSelectArtist && onSelectArtist(conv.artistId)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-white font-semibold">
                {conv.artistName}
              </span>
              {lastMessage && (
                <span className="text-gray-400 text-xs">
                  {new Date(lastMessage.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            {lastMessage && (
              <p
                className={`text-sm ${
                  lastMessage.senderId === userId
                    ? "text-gray-300 italic"
                    : "text-white"
                } truncate`}
              >
                {lastMessage.text}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChatWindow;