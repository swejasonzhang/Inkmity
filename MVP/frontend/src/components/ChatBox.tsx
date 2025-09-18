import React, { useState, useEffect, useRef } from "react";

export interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

interface ChatBoxProps {
  userId: string;
  userName: string;
  messages?: Message[];
  onSend?: (text: string) => void;
  onClose?: () => void;
  stackIndex?: number;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  userId,
  userName,
  messages = [],
  onSend,
  onClose,
  stackIndex = 0,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (newMessage.trim() && onSend) {
      onSend(newMessage);
      setNewMessage("");
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="flex flex-col w-[300px] max-w-full bg-black border border-gray-700 rounded-2xl shadow-lg fixed bottom-4 right-4 z-50"
      style={{ marginBottom: stackIndex * 20 }}
    >
      {/* Header */}
      <div className="p-2 border-b border-gray-700 bg-gray-900 text-white font-bold flex justify-between items-center rounded-t-2xl">
        <span className="text-sm">{userName}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 p-2 overflow-y-auto flex flex-col gap-1"
        style={{ minHeight: 0, maxHeight: "300px" }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.senderId === userId ? "justify-end" : "justify-start"
            }`}
          >
            <span
              className={`px-2 py-1 rounded-lg max-w-[85%] break-words ${
                msg.senderId === userId
                  ? "bg-gray-600 text-white font-medium italic"
                  : "bg-gray-800 text-gray-300 font-normal"
              }`}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-700 flex gap-2 bg-gray-900 rounded-b-2xl">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border border-gray-600 rounded px-2 py-1 bg-black text-white placeholder-gray-500 focus:outline-none text-sm"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="bg-white text-black px-3 py-1 rounded hover:bg-gray-500 transition text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;