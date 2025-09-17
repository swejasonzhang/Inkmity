import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Bot } from "lucide-react";
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
  // const [showBot, setShowBot] = useState(false);
  const [filterOpacity, setFilterOpacity] = useState(1);
  const ITEMS_PER_PAGE = 5;

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
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      }
    };
    fetchConversations();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        document.getElementById("middle-content")?.scrollTop || 0;
      const fadeDistance = 100; // Pixels to fully fade
      const newOpacity = Math.max(1 - scrollTop / fadeDistance, 0);
      setFilterOpacity(newOpacity);
    };

    const middle = document.getElementById("middle-content");
    middle?.addEventListener("scroll", handleScroll);

    return () => middle?.removeEventListener("scroll", handleScroll);
  }, []);

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

  const totalPages = Math.ceil(filteredArtists.length / ITEMS_PER_PAGE);

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

  const Pagination = () =>
    totalPages > 1 ? (
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          Previous
        </button>
        <span className="text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 flex gap-6 pt-4">
        {/* Left Sidebar */}
        <div className="flex-[1] flex flex-col">
          <button
            // onClick={() => setShowBot(true)}
            className="fixed bottom-6 left-6 bg-black text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition z-50"
          >
            <Bot size={24} />
          </button>
        </div>

        {/* Middle Content (larger) */}
        <div
          id="middle-content"
          className="flex-[3] flex flex-col gap-6 max-w-full w-full overflow-y-auto"
        >
          {/* Filter */}
          <div
            className="bg-gray-800 p-4 rounded-lg shadow sticky top-0 z-10 w-full transition-opacity duration-300"
            style={{ opacity: filterOpacity }}
          >
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
            <Pagination />
          </div>

          {/* Artist Cards */}
          <div className="flex flex-col gap-4 w-full">
            {paginatedArtists.map((artist) => (
              <div key={artist._id} className="w-full">
                <ArtistCard
                  artist={artist}
                  onClick={() => setSelectedArtist(artist)}
                />
              </div>
            ))}
            {paginatedArtists.length === 0 && (
              <p className="text-gray-400 text-center">
                No artists match your filters.
              </p>
            )}
          </div>

          <div className="pb-6">
            <Pagination />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex-[1] flex flex-col gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-gray-700">
              <button
                onClick={() => setMessagingOpen(!messagingOpen)}
                className="flex items-center gap-2 text-white font-bold"
              >
                <MessageSquare size={20} />
                <span>Messaging</span>
              </button>
            </div>

            <div className="flex-1 mt-2 overflow-y-auto">
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
      </main>

      {selectedArtist && (
        <ArtistModal
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
          onMessage={() => handleOpenChat(selectedArtist)}
        />
      )}
    </div>
  );
};

export default Dashboard;
