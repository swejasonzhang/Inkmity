import React, {
  useEffect,
  useState,
  useRef,
  ChangeEvent,
  FormEvent,
} from "react";
import socket from "../utils/socket";
import axios from "axios";

interface ChatWindowProps {
  userId: string;
  otherUserId: string;
}

interface Message {
  sender: string;
  text: string;
  roomId: string;
  createdAt?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ userId, otherUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomId = [userId, otherUserId].sort().join("_");

  useEffect(() => {
    socket.connect();

    socket.emit("join_room", roomId);

    socket.on("receive_message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("receive_message");
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get<Message[]>(`/api/messages/${roomId}`);
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages", err);
      }
    };
    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setNewMessage(e.target.value);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      sender: userId,
      text: newMessage.trim(),
      roomId,
    };

    socket.emit("send_message", message);
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full border rounded-md bg-gray-900 text-white p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 flex ${
              msg.sender === userId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-xs ${
                msg.sender === userId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={handleChange}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-md bg-gray-800 text-white outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;