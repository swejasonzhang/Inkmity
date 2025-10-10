import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header/Header";
import ChatBot from "@/components/dashboard/ChatBot";
import ChatWindow, { Message } from "@/components/dashboard/ChatWindow";
import ArtistsSection from "@/components/dashboard/ArtistsSection";
import ArtistModal from "@/components/dashboard/ArtistModal";
import { toast } from "react-toastify";
import { MessageSquare, Bot, X } from "lucide-react";
import { useDashboardData, ArtistDto } from "@/hooks/useDashboardData";
import FloatingBar from "@/components/dashboard/FloatingBar";
import { useTheme } from "@/components/header/useTheme";

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const { themeClass } = useTheme();

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

  const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn, navigate]);

  if (!user) return <div className="text-app p-4">Loading...</div>;

  return (
    <div className={themeClass}>
      <div className="min-h-dvh bg-app text-app flex flex-col overflow-y-hidden">
        <style>{`#middle-content::-webkit-scrollbar { display: none; }`}</style>

        <Header />

        <main className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 pt-2 sm:pt-3 px-4 sm:px-6 lg:px-8 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="flex-1 min-w-0">
            <ArtistsSection
              artists={artists}
              loading={loadingArtists}
              showArtists={showArtists}
              onSelectArtist={(artist: ArtistDto) => setSelectedArtist(artist)}
            />
          </div>
        </main>

        <FloatingBar
          onAssistantOpen={() => setAssistantOpen(true)}
          onMessagesOpen={() => setMessagesOpen(true)}
        />

        <div
          className={`fixed inset-0 z-50 transition-all duration-300 ${assistantOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div
            className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${assistantOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setAssistantOpen(false)}
            aria-hidden
          />
          <div
            className={`absolute inset-0 bg-card border-t border-app shadow-2xl flex flex-col transition-transform duration-300 ${assistantOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-app">
              <div className="flex items-center gap-2 font-semibold">
                <Bot size={18} />
              </div>
              <button
                onClick={() => setAssistantOpen(false)}
                className="p-2 rounded-full hover:bg-elevated"
                aria-label="Close assistant"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ChatBot />
            </div>
          </div>
        </div>

        <div
          className={`fixed inset-0 z-50 transition-all duration-300 ${messagesOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div
            className={`absolute inset-0 bg-overlay transition-opacity duration-300 ${messagesOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setMessagesOpen(false)}
            aria-hidden
          />
          <div
            className={`absolute inset-0 bg-card border-t border-app shadow-2xl flex flex-col transition-transform duration-300 ${messagesOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-app">
              <div className="flex items-center gap-2 font-semibold">
                <MessageSquare size={18} />
              </div>
              <button
                onClick={() => setMessagesOpen(false)}
                className="p-2 rounded-full hover:bg-elevated"
                aria-label="Close messages"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ChatWindow
                conversations={conversationList}
                collapsedMap={collapsedConversations}
                currentUserId={user.id}
                loading={loadingConversations}
                emptyText={"No conversations yet.\nTap an artist to start one!"}
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
                    const next: Record<string, boolean> = { ...prev };
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
            </div>
          </div>
        </div>

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
                  copy[idx] = {
                    ...copy[idx],
                    messages: [...copy[idx].messages, newMsg],
                  };
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
                return [
                  { participantId, username: artist.username, messages: [newMsg] },
                  ...prev,
                ];
              });

              setCollapsedConversations((prev) => ({
                ...prev,
                [participantId]: false,
              }));

              authFetch("http://localhost:5005/api/messages", {
                method: "POST",
                body: JSON.stringify({
                  senderId: user!.id,
                  receiverId: participantId,
                  text: preloadedMessage,
                }),
              }).catch((err: unknown) => {
                console.error("Failed to persist message:", err);
                toast.error("Failed to send message to server.", {
                  position: "bottom-right",
                });
              });

              setMessagesOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;