import React, { useState, useEffect } from "react";

interface Message {
  senderId: string;
  text: string;
  timestamp: string;
}

interface ChatWindowProps {
  userId: string;
  otherUserId: string;
  userName: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  userId,
  otherUserId,
  userName,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  // helper to create a new message
  const createMessage = (senderId: string, text: string): Message => ({
    senderId,
    text,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    // load initial conversation only once when otherUserId changes
    setMessages([
      createMessage(otherUserId, "Hey, thanks for checking out my work!"),
      createMessage(userId, "Your portfolio is amazing!"),
    ]);
  }, [otherUserId, userId]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = createMessage(userId, newMessage.trim());
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <h3 className="font-bold text-white mb-2">{userName}</h3>

      {/* Collapsed preview */}
      {!expanded ? (
        <div
          className="bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-600"
          onClick={() => setExpanded(true)}
        >
          <p className="truncate">
            {messages.length > 0
              ? messages[messages.length - 1].text
              : "No messages yet"}
          </p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto mb-2 pr-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded max-w-xs break-words ${
                  msg.senderId === userId
                    ? "bg-indigo-600 self-end text-white"
                    : "bg-gray-700 self-start text-white"
                }`}
              >
                <p>{msg.text}</p>
                <span className="block text-xs text-gray-400 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>

          {/* Input + send button */}
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 rounded bg-gray-700 px-3 py-2 text-white focus:outline-none"
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
            >
              Send
            </button>
          </div>

          {/* Collapse button */}
          <button
            className="text-sm text-indigo-400 mt-2 self-start hover:underline"
            onClick={() => setExpanded(false)}
          >
            Collapse
          </button>
        </>
      )}
    </div>
  );
};

export default ChatWindow;