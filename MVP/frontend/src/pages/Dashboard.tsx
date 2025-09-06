import React, { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ChatWindow from "../components/ChatWindow";

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/login");
    }
  }, [isSignedIn, navigate]);

  if (!user) return <div className="text-white p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header userName={user.firstName || "User"} />

      <main className="flex-1 overflow-y-auto flex justify-center items-start p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-gray-800 p-6 rounded-lg shadow-md text-white flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-center mb-4">Chat Demo</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChatWindow
                userId="user1"
                otherUserId="user2"
                userName="User 1"
              />
              <ChatWindow
                userId="user2"
                otherUserId="user1"
                userName="User 2"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
