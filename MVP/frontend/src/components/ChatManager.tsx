import { useState, useEffect } from "react";
import { Message } from "./ChatWindow";

interface ChatManagerProps {
  userId: string;
}

const ChatManager = ({ userId }: ChatManagerProps) => {
  const [conversations, setConversations] = useState<Record<string, Message[]>>(
    {}
  );

  useEffect(() => {
    // Fetch initial conversations from backend
    fetch(`http://localhost:5005/api/messages/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const grouped = data.reduce((acc: any, msg: Message) => {
          const partnerId =
            msg.senderId === userId ? msg.receiverId : msg.senderId;
          if (!acc[partnerId]) acc[partnerId] = [];
          acc[partnerId].push(msg);
          return acc;
        }, {});
        setConversations(grouped);
      })
      .catch((err) => console.error("Error fetching messages:", err));
  }, [userId]);

  return { conversations, setConversations };
};

export default ChatManager;