import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Header from "../components/Header";
import ChatWindow, { Message } from "../components/ChatWindow";
import ArtistCard from "../components/ArtistCard";
import ArtistModal from "../components/ArtistModal";
import ArtistFilter from "../components/ArtistFilter";

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  images?: string[];
  socialLinks?: { platform: string; url: string }[];
}

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [messagingOpen, setMessagingOpen] = useState(true);
  const [activeChat, setActiveChat] = useState<Artist | null>(null);
  const [conversations, setConversations] = useState<Record<string, Message[]>>(
    {}
  );
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn, navigate]);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  };

  useEffect(() => {
    authFetch("http://localhost:5005/api/artists")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setArtists(data))
      .catch((err) => console.error("Error fetching artists:", err));
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      try {
        const res = await authFetch(
          `http://localhost:5005/api/messages/user/${user.id}`
        );
        if (res.ok) {
          const data: Record<string, Message[]> = await res.json();
          setConversations(data);
        } else {
          console.error("Failed to fetch conversations:", res.status);
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      }
    };
    fetchConversations();
  }, [user]);

  if (!user) return <div className="text-white p-4">Loading...</div>;

  const filteredArtists = artists
    .filter((artist) => {
      const inPriceRange = (() => {
        if (!artist.priceRange) return false;
        const min = artist.priceRange.min;
        const max = artist.priceRange.max;

        if (priceFilter === "all") return true;
        if (priceFilter === "5000+") return max >= 5000;

        const [filterMin, filterMax] = priceFilter.split("-").map(Number);
        return max >= filterMin && min <= filterMax;
      })();

      const inLocation =
        locationFilter === "all" || artist.location === locationFilter;
      const inStyle =
        styleFilter === "all" || artist.style?.includes(styleFilter);

      return inPriceRange && inLocation && inStyle;
    })
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const paginatedArtists = filteredArtists.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const sendMessageToArtist = async (artist: Artist, text: string) => {
    const message: Message = {
      senderId: user?.id || "anonymous",
      receiverId: artist._id,
      text,
      timestamp: Date.now(),
    };

    setConversations((prev) => ({
      ...prev,
      [artist._id]: [...(prev[artist._id] || []), message],
    }));

    try {
      await authFetch("http://localhost:5005/api/messages", {
        method: "POST",
        body: JSON.stringify({
          senderId: user?.id,
          receiverId: artist._id,
          text,
        }),
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleOpenChat = async (artist: Artist) => {
    setActiveChat(artist);

    try {
      const res = await authFetch(
        `http://localhost:5005/api/messages/${user?.id}/${artist._id}`
      );
      if (res.ok) {
        const data: Message[] = await res.json();
        setConversations((prev) => ({ ...prev, [artist._id]: data }));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }

    setSelectedArtist(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 flex justify-center items-start p-6 overflow-y-auto">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          {/* Artist Filters */}
          <ArtistFilter
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            styleFilter={styleFilter}
            setStyleFilter={setStyleFilter}
            artists={artists}
            setCurrentPage={setCurrentPage}
          />

          {/* Artist Cards */}
          <div className="flex flex-col gap-4">
            {paginatedArtists.map((artist) => (
              <ArtistCard
                key={artist._id}
                artist={artist}
                onClick={() => setSelectedArtist(artist)}
              />
            ))}
            {paginatedArtists.length === 0 && (
              <p className="text-gray-400 text-center">
                No artists match your filters.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Artist Modal */}
      {selectedArtist && (
        <ArtistModal
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
          onMessage={() => handleOpenChat(selectedArtist)}
        />
      )}

      {/* Messaging */}
      <div className="fixed bottom-0 right-0 w-80 z-40">
        <div
          className={`bg-gray-800 rounded-t-lg shadow-lg flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${
            messagingOpen ? "h-[calc(100vh-120px)]" : "h-[50px]"
          }`}
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 h-14">
            <button
              onClick={() => setMessagingOpen(!messagingOpen)}
              className="flex items-center gap-2 text-white font-bold"
            >
              <MessageSquare size={20} />
              <span>Messaging</span>
            </button>
            {messagingOpen && (
              <button
                onClick={() => setMessagingOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!messagingOpen && (
              <p className="text-gray-400 text-sm p-2">
                Click to view messages
              </p>
            )}
            {messagingOpen && !activeChat && (
              <p className="text-gray-400 p-2">
                Select an artist to start chatting.
              </p>
            )}
            {messagingOpen && activeChat && (
              <ChatWindow
                userId={user?.id || "user1"}
                otherUserId={activeChat._id}
                userName={activeChat.name}
                messages={conversations[activeChat._id] || []}
                onSend={(text) => sendMessageToArtist(activeChat, text)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;