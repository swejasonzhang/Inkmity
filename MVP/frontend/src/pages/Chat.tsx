import React from "react";
import { useUser } from "@clerk/clerk-react";
import { useParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

const Chat: React.FC = () => {
  const { user } = useUser();
  const { otherUserId } = useParams();

  if (!user) return <div>Loading...</div>;

  return <ChatWindow userId={user.id} otherUserId={otherUserId!} />;
};

export default Chat;