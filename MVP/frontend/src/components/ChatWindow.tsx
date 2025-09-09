import { useState, useEffect } from "react";

interface Message {
  senderId: string;
  text: string;
  timestamp: string;
}

interface ChatWindowProps {
  userId: string;
  otherUserId: string;
  userName: string;
  onClose: () => void;
  startExpanded?: boolean;
}

interface ChatState {
  expanded: boolean;
  messages: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  userId,
  otherUserId,
  userName,
  onClose,
  startExpanded = false,
}) => {
  const [chat, setChat] = useState<ChatState>({
    expanded: startExpanded,
    messages: [],
  });
  const [newMessage, setNewMessage] = useState("");

  const createMessage = (senderId: string, text: string): Message => ({
    senderId,
    text,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    setChat({
      expanded: startExpanded,
      messages: [
        createMessage(otherUserId, "Hey, thanks for checking out my work!"),
        createMessage(userId, "Hello! Love your tattoo style."),
      ],
    });
  }, [otherUserId, userId, startExpanded]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    setChat((prev) => ({
      ...prev,
      messages: [...prev.messages, createMessage(userId, newMessage)],
    }));
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-2 border-b border-gray-700">
        <span className="font-bold text-white">{userName}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {chat.messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded ${
              msg.senderId === userId
                ? "bg-indigo-600 text-white self-end"
                : "bg-gray-700 text-white self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex p-2 border-t border-gray-700">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-l bg-gray-700 text-white outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 px-4 rounded-r text-white hover:bg-indigo-500"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;