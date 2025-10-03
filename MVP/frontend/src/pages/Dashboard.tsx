import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/dashboard/Header";
import ChatBot from "@/components/dashboard/ChatBot";
import ChatWindow, { Message } from "@/components/dashboard/ChatWindow";
import ArtistsSection from "@/components/dashboard/ArtistsSection";
import ArtistModal from "@/components/dashboard/ArtistModal";
import { toast } from "react-toastify";
import { MessageSquare } from "lucide-react";

import { useDashboardData, ArtistDto } from "@/hooks/useDashboardData";

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  const {
    artists,
    conversationList,
    collapsedConversations,
    selectedConversationId,
    loadingArtists,
    loadingConversations,
    showArtists,
    setConversationList,
    setCollapsedConversations,
    authFetch,
  } = useDashboardData();

  const [messagingOpen] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(null);

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn, navigate]);

  if (!user) return <div className="text-white p-4">Loading...</div>;

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <style>{`#middle-content::-webkit-scrollbar { display: none; }`}</style>

      <Header />

      <main className="flex-1 flex flex-row gap-4 sm:gap-6 pt-3 sm:pt-4 px-3 sm:px-4 lg:px-6 overflow-hidden">
        <div className="flex-shrink-0">
          <ChatBot />
        </div>

        <div className="flex-1 min-w-0">
          <ArtistsSection
            artists={artists}
            loading={loadingArtists}
            showArtists={showArtists}
            onSelectArtist={(artist: ArtistDto) => setSelectedArtist(artist)}
          />
        </div>

        <aside className="flex-shrink-0 w-full sm:w-[360px] lg:w-[420px] flex flex-col gap-4">
          <div
            className="bg-gray-800 rounded-3xl p-4 flex flex-col sticky top-4"
            style={{ height: "calc(97vh - 6rem)" }}
          >
            <div className="flex justify-between items-center pb-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <MessageSquare size={20} /> <span>Messaging</span>
              </div>
            </div>

            {messagingOpen && (
              <ChatWindow
                conversations={conversationList}
                collapsedMap={collapsedConversations}
                currentUserId={user.id}
                loading={loadingConversations}
                emptyText={
                  "No conversations currently.\nPlease click an artist to start one!"
                }
                onToggleCollapse={(participantId: string) => {
                  setCollapsedConversations((prev) => ({
                    ...prev,
                    [participantId]: !prev[participantId],
                  }));
                }}
                onRemoveConversation={(participantId: string) => {
                  setConversationList((prev) =>
                    prev.filter((c) => c.participantId !== participantId)
                  );
                  setCollapsedConversations((prev) => {
                    const next = { ...prev };
                    delete next[participantId];
                    return next;
                  });
                  toast.info("Conversation hidden from dashboard", {
                    position: "bottom-right",
                  });
                }}
                expandedId={selectedConversationId}
                authFetch={authFetch}
              />
            )}
          </div>
        </aside>
      </main>

      {selectedArtist && (
        <ArtistModal
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
          onMessage={(artist, preloadedMessage) => {
            const participantId = artist.clerkId ?? artist._id;

            const newMsg: Message = {
              senderId: user!.id,
              receiverId: participantId,
              text: preloadedMessage,
              timestamp: Date.now(),
            };

            setConversationList((prev) => {
              const idx = prev.findIndex((c) => c.participantId === participantId);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, newMsg] };
                return copy.sort((a, b) => {
                  const aLast = a.messages.length
                    ? a.messages[a.messages.length - 1].timestamp
                    : 0;
                  const bLast = b.messages.length
                    ? b.messages[b.messages.length - 1].timestamp
                    : 0;
                  return bLast - aLast;
                });
              }
              return [{ participantId, username: artist.username, messages: [newMsg] }, ...prev];
            });

            setCollapsedConversations((prev) => ({ ...prev, [participantId]: false }));

            authFetch("http://localhost:5005/api/messages", {
              method: "POST",
              body: JSON.stringify({
                senderId: user!.id,
                receiverId: participantId,
                text: preloadedMessage,
              }),
            }).catch((err: unknown) => {
              console.error("Failed to persist message:", err);
              toast.error("Failed to send message to server.", { position: "bottom-right" });
            });
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;