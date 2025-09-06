import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import Header from "../components/Header";
import ChatWindow from "../components/ChatWindow";

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: number;
  rating?: number;
}

const Dashboard: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<Artist | null>(null);

  const [priceFilter, setPriceFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [styleFilter, setStyleFilter] = useState("");

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/login");
    }
  }, [isSignedIn, navigate]);

  useEffect(() => {
    fetch("/api/artists")
      .then((res) => res.json())
      .then((data) => setArtists(data))
      .catch((err) => console.error("Error fetching artists:", err));
  }, []);

  if (!user) return <div className="text-white p-4">Loading...</div>;

  const filteredArtists = artists.filter((artist) => {
    const inPriceRange =
      priceFilter === "" ||
      (priceFilter.includes("-") &&
        artist.priceRange &&
        artist.priceRange >= Number(priceFilter.split("-")[0]) &&
        artist.priceRange <= Number(priceFilter.split("-")[1])) ||
      (priceFilter === "5000+" &&
        artist.priceRange &&
        artist.priceRange >= 5000);

    const inLocation =
      locationFilter === "" || artist.location === locationFilter;

    const inStyle = styleFilter === "" || artist.style?.includes(styleFilter);

    return inPriceRange && inLocation && inStyle;
  });

  const handleOpenChat = (artist: Artist) => {
    setActiveChat(artist);
    setMessagingOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col overflow-y-scroll">
      <Header userName={user.firstName || "User"} />

      <main className="flex-1 flex justify-center items-start p-6">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <section className="bg-gray-800 p-6 rounded-lg shadow-md text-white flex flex-col gap-6">
            <h1 className="text-2xl font-bold text-center mb-4">
              Tattoo Shops & Artists
            </h1>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 justify-center">
              {/* Price Filter */}
              <div className="relative">
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="appearance-none bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">All Prices</option>
                  <option value="50-100">$50 - $100</option>
                  <option value="100-200">$100 - $200</option>
                  <option value="200-500">$200 - $500</option>
                  <option value="500-1000">$500 - $1000</option>
                  <option value="1000-5000">$1000 - $5000</option>
                  <option value="5000+">$5000+</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  ▼
                </span>
              </div>

              {/* Location Filter */}
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="appearance-none bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">All Locations</option>
                  {[...new Set(artists.map((a) => a.location))].map(
                    (loc) =>
                      loc && (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      )
                  )}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  ▼
                </span>
              </div>

              {/* Style Filter */}
              <div className="relative">
                <select
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value)}
                  className="appearance-none bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">All Styles</option>
                  {[...new Set(artists.flatMap((a) => a.style || []))].map(
                    (style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    )
                  )}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  ▼
                </span>
              </div>
            </div>

            {/* Artist List */}
            <div className="flex flex-col gap-4">
              {filteredArtists.map((artist) => (
                <div
                  key={artist._id}
                  className="bg-gray-700 p-4 rounded-lg shadow hover:bg-gray-600 cursor-pointer"
                  onClick={() => handleOpenChat(artist)}
                >
                  <h2 className="text-xl font-semibold">{artist.name}</h2>
                  <p className="text-gray-300">{artist.bio}</p>
                  <p className="text-gray-400 text-sm">
                    Location: {artist.location}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Price Range:{" "}
                    {artist.priceRange ? `$${artist.priceRange}` : "N/A"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Style: {artist.style?.join(", ")}
                  </p>
                  <p className="text-yellow-400 text-sm">
                    Rating: {artist.rating?.toFixed(1) || "0"}
                  </p>
                </div>
              ))}
              {filteredArtists.length === 0 && (
                <p className="text-gray-400 text-center">
                  No artists match your filters.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Messaging Panel */}
      <div className="fixed bottom-0 right-0 w-80 z-50">
        <div
          className={`bg-gray-800 rounded-t-lg shadow-lg flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${
            messagingOpen ? "h-[70vh]" : "h-[50px]"
          }`}
        >
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
          <div className="flex-1 overflow-y-auto p-2">
            {!messagingOpen && (
              <p className="text-gray-400 text-sm">Click to view messages</p>
            )}
            {messagingOpen && !activeChat && (
              <p className="text-gray-400">
                Select an artist to start chatting.
              </p>
            )}
            {messagingOpen && activeChat && (
              <ChatWindow
                userId="user1"
                otherUserId={activeChat._id}
                userName={activeChat.name}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;