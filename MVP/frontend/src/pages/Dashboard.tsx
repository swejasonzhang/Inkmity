import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Header from "../components/Header";
import ChatWindow from "../components/ChatWindow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PriceRange {
  min: number;
  max: number;
}

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: PriceRange;
  rating?: number;
  images?: string[];
  socialLinks?: { platform: string; url: string }[];
}

const ITEMS_PER_PAGE = 20;

function Dashboard() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [messagingOpen, setMessagingOpen] = useState(true);
  const [activeChat, setActiveChat] = useState<Artist | null>(null);

  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  useEffect(() => {
    if (!isSignedIn) navigate("/login");
  }, [isSignedIn, navigate]);

  useEffect(() => {
    fetch("http://localhost:5005/api/artists")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setArtists(data))
      .catch((err) => console.error("Error fetching artists:", err));
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

  const handleOpenChat = (artist: Artist) => {
    setActiveChat(artist);
    setMessagingOpen(true);
    setSelectedArtist(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header userName={user.firstName || "User"} />

      <main className="flex-1 flex justify-center items-start p-6 overflow-y-auto">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <section className="bg-gray-800 p-6 rounded-lg shadow-md text-white flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-center mb-4">
              Tattoo Shops & Artists
            </h1>

            <div className="flex flex-wrap gap-4 justify-center">
              <Select
                value={priceFilter}
                onValueChange={(value) => {
                  setPriceFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white">
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="100-500">$100 - $500</SelectItem>
                  <SelectItem value="500-1000">$500 - $1000</SelectItem>
                  <SelectItem value="1000-2000">$1000 - $2000</SelectItem>
                  <SelectItem value="2000-5000">$2000 - $5000</SelectItem>
                  <SelectItem value="5000+">$5000+</SelectItem>
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <Select
                value={locationFilter}
                onValueChange={(value) => {
                  setLocationFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-40 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-white">
                  <SelectItem value="all">All Locations</SelectItem>
                  {[...new Set(artists.map((a) => a.location))].map(
                    (loc) =>
                      loc && (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      )
                  )}
                </SelectContent>
              </Select>

              {/* Style Filter */}
              <Select
                value={styleFilter}
                onValueChange={(value) => {
                  setStyleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-40 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg">
                  <SelectValue placeholder="All Styles" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-white">
                  <SelectItem value="all">All Styles</SelectItem>
                  {[...new Set(artists.flatMap((a) => a.style || []))].map(
                    (style) => (
                      <SelectItem key={style} value={style}>
                        {style}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Artist List */}
            <div className="flex flex-col gap-4">
              {paginatedArtists.map((artist) => (
                <div
                  key={artist._id}
                  className="bg-gray-700 p-4 rounded-lg shadow hover:bg-gray-600 cursor-pointer"
                  onClick={() => setSelectedArtist(artist)}
                >
                  <h2 className="text-xl font-semibold">{artist.name}</h2>
                  <p className="text-gray-300">{artist.bio}</p>
                  <p className="text-gray-400 text-sm">
                    Location: {artist.location}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Price Range:{" "}
                    {artist.priceRange
                      ? `$${artist.priceRange.min} - $${artist.priceRange.max}`
                      : "N/A"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Style: {artist.style?.join(", ")}
                  </p>
                  <p className="text-yellow-400 text-sm">
                    Rating: {artist.rating?.toFixed(1) || "0"}
                  </p>
                </div>
              ))}
              {paginatedArtists.length === 0 && (
                <p className="text-gray-400 text-center">
                  No artists match your filters.
                </p>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-gray-600 px-3 py-1 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-gray-300 px-2 py-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="bg-gray-600 px-3 py-1 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modal */}
      {selectedArtist && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full relative">
            <button
              onClick={() => setSelectedArtist(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-4">
              {selectedArtist.name}
            </h2>
            <p className="text-gray-300 mb-2">{selectedArtist.bio}</p>
            <p className="text-gray-400 text-sm mb-2">
              Location: {selectedArtist.location}
            </p>
            <p className="text-gray-400 text-sm mb-2">
              Price Range:{" "}
              {selectedArtist.priceRange
                ? `$${selectedArtist.priceRange.min} - $${selectedArtist.priceRange.max}`
                : "N/A"}
            </p>
            <p className="text-gray-400 text-sm mb-2">
              Style: {selectedArtist.style?.join(", ")}
            </p>
            <p className="text-yellow-400 text-sm mb-4">
              Rating: {selectedArtist.rating?.toFixed(1) || "0"}
            </p>

            {/* Images */}
            {selectedArtist.images && selectedArtist.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {selectedArtist.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${selectedArtist.name} work ${i + 1}`}
                    className="rounded-lg object-cover w-full h-40"
                  />
                ))}
              </div>
            )}

            {/* Social Links */}
            {selectedArtist.socialLinks && (
              <div className="flex gap-4 mb-4">
                {selectedArtist.socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                  >
                    {link.platform}
                  </a>
                ))}
              </div>
            )}

            {/* Message Button */}
            <button
              onClick={() => handleOpenChat(selectedArtist)}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-500"
            >
              Message {selectedArtist.name}
            </button>
          </div>
        </div>
      )}

      {/* Messaging Panel */}
      <div className="fixed bottom-0 right-0 w-80 z-40">
        <div
          className={`bg-gray-800 rounded-t-lg shadow-lg flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${
            messagingOpen ? "max-h-[80vh]" : "max-h-[50px]"
          }`}
          style={{ height: messagingOpen ? "80vh" : "50px" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
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

          {/* Chat Body */}
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
                userId="user1"
                otherUserId={activeChat._id}
                userName={activeChat.name}
                onClose={() => setMessagingOpen(false)}
                startExpanded={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
