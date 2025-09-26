import React, { useEffect, useRef } from "react";

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
  onSelectArtist: (participantId: string) => void;
  onRemoveConversation: (participantId: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversations,
  onSelectArtist,
  onRemoveConversation,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [conversations]);

  return (
    <div className="flex w-full h-full p-2">
      <div
        ref={scrollRef}
        className={`flex flex-col gap-2 max-h-[95vh] w-full max-w-md overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl p-2 ${
          conversations.length === 0
            ? "justify-center items-center"
            : "justify-start items-stretch"
        }`}
      >
        {conversations.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">
            Click an artist to start a conversation.
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.participantId}
              className="flex justify-between items-center bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-700 transition"
            >
              <span
                className="text-white font-semibold"
                onClick={() => onSelectArtist(conv.participantId)}
              >
                {conv.username}
              </span>
              <button
                className="text-gray-400 hover:text-white ml-2"
                onClick={() => onRemoveConversation(conv.participantId)}
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