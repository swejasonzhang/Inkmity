import React, { useEffect, useState, useRef } from "react";

export interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  artistId: string;
  artistUsername: string;
  messages: Message[];
}

interface ChatWindowProps {
  conversations: Conversation[];
  onSelectArtist: (artistId: string) => void;
  onRemoveConversation: (artistId: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversations,
  onSelectArtist,
  onRemoveConversation,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sortedConversations, setSortedConversations] = useState<
    Conversation[]
  >([]);

  useEffect(() => {
    const sorted = [...conversations].sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.timestamp || 0;
      const bLast = b.messages[b.messages.length - 1]?.timestamp || 0;
      return bLast - aLast;
    });
    setSortedConversations(sorted);
  }, [conversations]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [sortedConversations]);

  return (
    <div className="flex w-full h-full p-2">
      <div
        ref={scrollRef}
        className={`flex flex-col gap-2 max-h-[95vh] w-full max-w-md overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl p-2 ${
          sortedConversations.length === 0
            ? "justify-center items-center"
            : "justify-start items-stretch"
        }`}
      >
        {sortedConversations.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">
            Click an artist to start a conversation.
          </p>
        ) : (
          sortedConversations.map((conv) => (
            <div
              key={conv.artistId}
              className="flex justify-between items-center bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-700 transition"
            >
              <span
                className="text-white font-semibold"
                onClick={() => onSelectArtist(conv.artistId)}
              >
                {conv.artistUsername}
              </span>
              <button
                className="text-gray-400 hover:text-white ml-2"
                onClick={() => onRemoveConversation(conv.artistId)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatWindow;