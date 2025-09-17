import { useState } from "react";
import { Message } from "./ChatWindow";

export interface ChatInfo {
  userId: string;
  userName: string;
  messages: Message[];
}

const useChatManager = () => {
  const [activeChats, setActiveChats] = useState<ChatInfo[]>([]);

  const openChat = (userId: string, userName: string) => {
    setActiveChats((prev) => {
      const filtered = prev.filter((chat) => chat.userId !== userId);
      return [{ userId, userName, messages: [] }, ...filtered];
    });
  };

  const closeChat = (userId: string) => {
    setActiveChats((prev) => prev.filter((chat) => chat.userId !== userId));
  };

  const sendMessage = (userId: string, text: string) => {
    setActiveChats((prev) =>
      prev.map((chat) =>
        chat.userId === userId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                { senderId: "me", receiverId: userId, text, timestamp: Date.now() },
              ],
            }
          : chat
      )
    );
    setActiveChats((prev) => {
      const chatToMove = prev.find((chat) => chat.userId === userId);
      const others = prev.filter((chat) => chat.userId !== userId);
      return chatToMove ? [chatToMove, ...others] : prev;
    });
  };

  return { activeChats, openChat, closeChat, sendMessage };
};

export default useChatManager;