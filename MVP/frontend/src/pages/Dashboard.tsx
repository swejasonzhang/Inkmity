import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/dashboard/Header";
import ChatBot from "@/components/dashboard/ChatBot";
import ChatWindow, { Message } from "@/components/dashboard/ChatWindow";
import ArtistsSection from "@/components/dashboard/ArtistsSection";
import ArtistModal from "@/components/dashboard/ArtistModal";
import { toast } from "react-toastify";
import { MessageSquare, Bot, X } from "lucide-react";
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

  const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn, navigate]);

  if (!user) return <div className="text-white p-4">Loading...</div>;

  return (
    <div className="min-h-dvh bg-gray-900 flex flex-col overflow-x-hidden">
      <style>{`#middle-content::-webkit-scrollbar { display: none; }`}</style>

      <Header />

      <main className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 pt-2 sm:pt-3 pb-[calc(env(safe-area-inset-bottom)+76px)] sm:pb-[calc(env(safe-area-inset-bottom)+84px)]">
        <div className="flex-1 min-w-0">
          <ArtistsSection
            artists={artists}
            loading={loadingArtists}
            showArtists={showArtists}
            onSelectArtist={(artist: ArtistDto) => setSelectedArtist(artist)}
          />
        </div>
      </main>

      <div className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-between">
        <button
          onClick={() => setAssistantOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white/15 text-white backdrop-blur border border-white/20 shadow-md active:scale-[0.98]"
          aria-label="Open assistant"
        >
          <Bot size={18} />
          <span className="text-sm font-medium">Assistant</span>
        </button>
        <button
          onClick={() => setMessagesOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white/15 text-white backdrop-blur border border-white/20 shadow-md active:scale-[0.98]"
          aria-label="Open messages"
        >
          <MessageSquare size={18} />
          <span className="text-sm font-medium">Messages</span>
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${assistantOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${assistantOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setAssistantOpen(false)}
          aria-hidden
        />
        <div
          className={`absolute inset-0 bg-gray-900 border-t border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ${assistantOpen ? "translate-y-0" : "translate-y-full"
            }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Bot size={18} />
              <span>Assistant</span>
            </div>
            <button
              onClick={() => setAssistantOpen(false)}
              className="p-2 rounded-full hover:bg-white/10"
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
        className={`fixed inset-0 z-50 transition-all duration-300 ${messagesOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${messagesOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setMessagesOpen(false)}
          aria-hidden
        />
        <div
          className={`absolute inset-0 bg-gray-900 border-t border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ${messagesOpen ? "translate-y-0" : "translate-y-full"
            }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-semibold">
              <MessageSquare size={18} />
              <span>Messaging</span>
            </div>
            <button
              onClick={() => setMessagesOpen(false)}
              className="p-2 rounded-full hover:bg-white/10"
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

            setMessagesOpen(true);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;