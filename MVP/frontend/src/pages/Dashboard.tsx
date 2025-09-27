import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Bot } from "lucide-react";
import Header from "../components/Header";
import ChatWindow, { Message, Conversation } from "../components/ChatWindow";
import ArtistCard from "../components/ArtistCard";
import ArtistModal from "../components/ArtistModal";
import ArtistFilter from "../components/ArtistFilter";
import CircularProgress from "@mui/material/CircularProgress";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";

interface Artist {
  _id: string;
  clerkId: string;
  username: string;
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
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [showArtists, setShowArtists] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(true);
  const [conversations, setConversations] = useState<Record<string, Message[]>>(
    {}
  );
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [collapsedConversations, setCollapsedConversations] = useState<
    Record<string, boolean>
  >({});
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpacity, setFilterOpacity] = useState(1);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn, navigate]);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request failed ${res.status}: ${text}`);
    }
    return res;
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowArtists(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setLoadingArtists(true);
    authFetch("http://localhost:5005/api/users?role=artist")
      .then((res) => res.json())
      .then((data) => {
        setArtists(data);
        toast.success("Artists loaded successfully!", {
          position: "bottom-right",
          autoClose: 3000,
        });
      })
      .catch((err) => {
        console.error("Error fetching artists:", err);
        toast.error("Error loading artists.", {
          position: "bottom-right",
          autoClose: 3000,
        });
      })
      .finally(() => setLoadingArtists(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingConversations(true);

    const fetchConversations = async () => {
      try {
        const res = await authFetch(
          `http://localhost:5005/api/messages/user/${user.id}`
        );
        const data: Record<string, Message[]> = await res.json();
        setConversations(data);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        toast.error("Failed to load conversations.", {
          position: "bottom-right",
        });
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (artists.length === 0) return;
    const list: Conversation[] = Object.entries(conversations)
      .map(([participantId, msgs]) => {
        const artist = artists.find((a) => a._id === participantId);
        if (!artist) return null;
        return { participantId, username: artist.username, messages: msgs };
      })
      .filter((conv): conv is Conversation => conv !== null)
      .sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.timestamp || 0;
        const bLast = b.messages[b.messages.length - 1]?.timestamp || 0;
        return bLast - aLast;
      });
    setConversationList(list);
  }, [artists, conversations]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        document.getElementById("middle-content")?.scrollTop || 0;
      const fadeDistance = 100;
      setFilterOpacity(Math.max(1 - scrollTop / fadeDistance, 0));
    };
    const middle = document.getElementById("middle-content");
    middle?.addEventListener("scroll", handleScroll);
    return () => middle?.removeEventListener("scroll", handleScroll);
  }, []);

  if (!user) return <div className="text-white p-4">Loading...</div>;

  const filteredArtists = artists
    .filter((artist) => {
      const inPriceRange = !artist.priceRange
        ? true
        : priceFilter === "all"
        ? true
        : priceFilter === "5000+"
        ? artist.priceRange.max >= 5000
        : (() => {
            const [min, max] = priceFilter.split("-").map(Number);
            return artist.priceRange.max >= min && artist.priceRange.min <= max;
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
      <main className="flex-1 flex gap-6 pt-4 px-4">
        <div className="flex-[1] flex flex-col">
          <button className="fixed bottom-6 left-6 bg-black text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition z-50">
            <Bot size={24} />
          </button>
        </div>
        <div
          id="middle-content"
          className="flex-[3] flex flex-col max-w-full w-full overflow-y-auto rounded-2xl bg-gray-900"
        >
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

          <div className="flex flex-col justify-between flex-1">
            <div className="flex flex-col gap-4 w-full flex-1">
              {loadingArtists || !showArtists ? (
                <div className="flex justify-center items-center flex-1">
                  <CircularProgress sx={{ color: "#ffffff" }} />
                </div>
              ) : paginatedArtists.length > 0 ? (
                paginatedArtists.map((artist, index) => (
                  <motion.div
                    key={artist._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.1,
                      ease: "easeOut",
                    }}
                    className={`w-full ${index === 0 ? "mt-4" : ""}`}
                  >
                    <ArtistCard
                      artist={artist}
                      onClick={() => setSelectedArtist(artist)}
                    />
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-400 text-center flex-1 flex items-center justify-center">
                  No artists match your filters.
                </p>
              )}
            </div>

            <div className="py-4">
              <Pagination />
            </div>
          </div>
        </div>

        <div className="flex-[1] flex flex-col gap-4">
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
                emptyText="No conversations currently. Please click an artist to start one!"
                onToggleCollapse={(participantId: string) => {
                  setCollapsedConversations((prev) => ({
                    ...prev,
                    [participantId]: !prev[participantId],
                  }));
                }}
                onRemoveConversation={(participantId: string) => {
                  setConversations((prev) => {
                    const newConversations = { ...prev };
                    delete newConversations[participantId];
                    return newConversations;
                  });

                  setConversationList((prev) =>
                    prev.filter((c) => c.participantId !== participantId)
                  );

                  setCollapsedConversations((prev) => {
                    const newMap = { ...prev };
                    delete newMap[participantId];
                    return newMap;
                  });

                  toast.info("Conversation hidden from dashboard", {
                    position: "bottom-right",
                  });
                }}
                expandedId={selectedConversationId}
              />
            )}
          </div>
        </div>
      </main>
      {selectedArtist && (
        <ArtistModal
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
          onMessage={(artist, preloadedMessage) => {
            const newMessage: Message = {
              senderId: user.id,
              receiverId: artist._id,
              text: preloadedMessage,
              timestamp: Date.now(),
            };

            setConversations((prev) => {
              const existing = prev[artist._id] || [];
              return {
                ...prev,
                [artist._id]: [...existing, newMessage],
              };
            });

            setConversationList((prev) => {
              const existing = prev.find((c) => c.participantId === artist._id);
              if (existing) {
                return [
                  {
                    ...existing,
                    messages: [...existing.messages, newMessage],
                  },
                  ...prev.filter((c) => c.participantId !== artist._id),
                ];
              } else {
                return [
                  {
                    participantId: artist._id,
                    username: artist.username,
                    messages: [newMessage],
                  },
                  ...prev,
                ];
              }
            });

            setCollapsedConversations((prev) => ({
              ...prev,
              [artist._id]: false,
            }));

            setSelectedConversationId(artist._id);

            setMessagingOpen(true);
            setSelectedArtist(null);

            authFetch("http://localhost:5005/api/messages", {
              method: "POST",
              body: JSON.stringify({
                senderId: user.id,
                receiverId: artist._id,
                text: preloadedMessage,
              }),
            }).catch((err) => {
              console.error("Failed to persist message:", err);
              toast.error("Failed to send message to server.", {
                position: "bottom-right",
              });
            });
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
