import React, { useState } from "react";

export interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface ChatWindowProps {
  userId: string;
  otherUserId: string;
  userName: string;
  messages: Message[];
  onSend: (text: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  userId,
  userName,
  messages = [],
  onSend,
}) => {
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim()) {
      onSend(newMessage);
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b font-bold text-white text-lg">
        {userName}
      </div>

      <div className="flex-1 p-2 overflow-y-auto space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.senderId === userId ? "justify-end" : "justify-start"
            }`}
          >
            <span
              className={`inline-block px-3 py-1 rounded-lg max-w-[75%] break-words ${
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

      <div className="p-2 border-t flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border border-gray-600 rounded px-2 py-1 bg-gray-900 text-white placeholder-gray-500"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="bg-white text-black px-4 py-1 rounded hover:bg-gray-500 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;