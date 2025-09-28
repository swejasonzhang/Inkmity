import { useEffect, useRef, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Header from "../components/dashboard/Header";
import ChatWindow, {
  Message,
  Conversation,
} from "../components/dashboard/ChatWindow";
import ArtistCard from "../components/dashboard/ArtistCard";
import ArtistModal from "../components/dashboard/ArtistModal";
import ArtistFilter from "../components/dashboard/ArtistFilter";
import CircularProgress from "@mui/material/CircularProgress";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import ChatBot from "../components/dashboard/ChatBot";

interface ArtistDto {
  _id: string;
  clerkId?: string;
  username: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  images?: string[];
  socialLinks?: { platform: string; url: string }[];
}

type Tier = "free" | "amateur" | "pro" | "elite";

const getTierLimit = (tierRaw: unknown): number => {
  const tier = String(tierRaw || "free").toLowerCase() as Tier;
  switch (tier) {
    case "free":
      return 5;
    case "amateur":
      return 15;
    case "pro":
    case "elite":
      return Number.POSITIVE_INFINITY; // unlimited
    default:
      return 5;
  }
};

const isFiniteNumber = (n: number) => Number.isFinite(n);

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [artists, setArtists] = useState<ArtistDto[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [showArtists, setShowArtists] = useState(false);

  const [messagingOpen, setMessagingOpen] = useState(true);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [collapsedConversations, setCollapsedConversations] = useState<
    Record<string, boolean>
  >({});
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [selectedArtist, setSelectedArtist] = useState<ArtistDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpacity, setFilterOpacity] = useState(1);

  const prevConvCountRef = useRef(0);

  const ITEMS_PER_PAGE = 5;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(searchQuery.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(t);
  }, [searchQuery]);

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

  const normalizeMessages = (msgs: any[] = []): Message[] =>
    msgs.map((m) => ({
      senderId: m.senderId,
      receiverId: m.receiverId,
      text: m.text,
      timestamp:
        typeof m.timestamp === "number"
          ? m.timestamp
          : m.createdAt
          ? new Date(m.createdAt).getTime()
          : Date.now(),
    }));

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingArtists(true);
      setLoadingConversations(true);

      try {
        const artistsRes = await authFetch(
          "http://localhost:5005/api/users?role=artist"
        );
        const artistsData: ArtistDto[] = await artistsRes.json();
        setArtists(artistsData);

        const convRes = await authFetch(
          `http://localhost:5005/api/messages/user/${user.id}`
        );
        const raw = await convRes.json();

        let convList: Conversation[] = Array.isArray(raw)
          ? raw.map((c: any) => ({
              participantId: c.participantId,
              username: c.username ?? "Unknown",
              messages: normalizeMessages(c.messages),
            }))
          : [];

        convList = convList.map((c) => {
          if (c.username !== "Unknown") return c;
          const artist = artistsData.find(
            (a) => a.clerkId === c.participantId || a._id === c.participantId
          );
          return { ...c, username: artist?.username ?? "Unknown" };
        });

        convList.sort((a, b) => {
          const aLast = a.messages.length
            ? a.messages[a.messages.length - 1].timestamp
            : 0;
          const bLast = b.messages.length
            ? b.messages[b.messages.length - 1].timestamp
            : 0;
          return bLast - aLast;
        });

        setConversationList(convList);

        if (convList.length > 0) {
          const newest = convList[0].participantId;
          setSelectedConversationId(newest);
          setCollapsedConversations((prev) => ({ ...prev, [newest]: false }));
        }

        toast.success("Artists and conversations loaded!", {
          position: "bottom-right",
          autoClose: 2000,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Error loading dashboard data.", {
          position: "bottom-right",
        });
      } finally {
        setLoadingArtists(false);
        setLoadingConversations(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (conversationList.length > prevConvCountRef.current) {
      const newest = conversationList[0];
      if (newest) {
        setSelectedConversationId(newest.participantId);
        setCollapsedConversations((prev) => ({
          ...prev,
          [newest.participantId]: false,
        }));
      }
    }
    prevConvCountRef.current = conversationList.length;
  }, [conversationList]);

  useEffect(() => {
    const timer = setTimeout(() => setShowArtists(true), 1500);
    return () => clearTimeout(timer);
  }, []);

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

      const q = debouncedSearch;
      const matchesKeyword =
        q === "" ||
        artist.username?.toLowerCase().includes(q) ||
        artist.location?.toLowerCase().includes(q) ||
        artist.bio?.toLowerCase().includes(q) ||
        (artist.style || []).some((s) => s.toLowerCase().includes(q));

      return inPriceRange && inLocation && inStyle && matchesKeyword;
    })
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // -------- Tier gating (client-only) --------
  const publicMeta = (user.publicMetadata || {}) as Record<string, unknown>;
  const isClient = String(publicMeta.role || "").toLowerCase() === "client";
  const tierLimit = getTierLimit(publicMeta.tier);
  const gatedArtists = isClient
    ? filteredArtists.slice(
        0,
        isFiniteNumber(tierLimit) ? tierLimit : filteredArtists.length
      )
    : filteredArtists;

  const totalPages = Math.ceil(gatedArtists.length / ITEMS_PER_PAGE);
  const paginatedArtists = gatedArtists.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const Pagination = () =>
    totalPages > 1 ? (
      <div className="flex justify-center items-center gap-4 mt-3">
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
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <style>{`
        #middle-content::-webkit-scrollbar { display: none; }
      `}</style>

      <Header />

      <main className="flex-1 flex gap-6 pt-4 px-4 overflow-hidden">
        <ChatBot />

        <section
          id="middle-content"
          className="flex-[2.6] flex flex-col max-w-full w-full overflow-y-auto rounded-2xl bg-gray-900"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div
            className="bg-gray-800 px-3 py-3 rounded-lg shadow sticky top-0 z-10 w-full transition-opacity duration-300"
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
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
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
                    key={(artist.clerkId ?? artist._id) + ":" + index}
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
            <div className="py-3">
              <Pagination />
            </div>
          </div>
        </section>

        <aside className="flex-[1] flex flex-col gap-4">
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
              const idx = prev.findIndex(
                (c) => c.participantId === participantId
              );
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
                {
                  participantId,
                  username: artist.username,
                  messages: [newMsg],
                },
                ...prev,
              ];
            });

            setCollapsedConversations((prev) => ({
              ...prev,
              [participantId]: false,
            }));
            setSelectedConversationId(participantId);
            setMessagingOpen(true);
            setSelectedArtist(null);

            authFetch("http://localhost:5005/api/messages", {
              method: "POST",
              body: JSON.stringify({
                senderId: user!.id,
                receiverId: participantId,
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