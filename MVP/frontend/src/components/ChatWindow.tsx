import React, { useEffect, useState, useRef } from "react";
import socket from "../utils/socket";

interface ChatWindowProps {
  userId: string;
  otherUserId: string;
  userName: string;
}

interface Message {
  sender: string;
  recipient: string;
  text: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  userId,
  otherUserId,
  userName,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.connect();
    socket.emit("register", userId);

    socket.on("receive_message", (message: Message) => {
      if (
        (message.sender === userId && message.recipient === otherUserId) ||
        (message.sender === otherUserId && message.recipient === userId)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      sender: userId,
      recipient: otherUserId,
      text: newMessage.trim(),
    };
    socket.emit("send_message", message);
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-80 w-full bg-gray-800 rounded-lg p-4 text-white">
      <h2 className="font-bold mb-2">{userName}</h2>
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.sender === userId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-3 py-2 rounded-lg ${
                msg.sender === userId ? "bg-blue-500" : "bg-gray-600"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded bg-gray-700 text-white"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;