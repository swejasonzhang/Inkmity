import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import BookingPicker from "../calender/BookingPicker";

interface Artist {
  _id: string;
  clerkId?: string;
  username: string;
  bio?: string;
}

interface ArtistModalProps {
  artist: Artist;
  onClose: () => void;
  onMessage: (artist: Artist, preloadedMessage: string) => void;
}

type TabKey = "about" | "book" | "message";

const ArtistModal: React.FC<ArtistModalProps> = ({
  artist,
  onClose,
  onMessage,
}) => {
  const preloadedMessage = `Hi ${artist.username}, I've taken a look at your work and I'm interested! Would you be open to my ideas?`;
  const [tab, setTab] = useState<TabKey>("about");

  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  // Close on outside click
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <motion.div
      key={artist._id}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      ref={backdropRef}
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-11/12 max-w-3xl rounded-xl bg-gray-900 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-white">{artist.username}</h2>
            <p className="text-sm text-gray-400">
              {artist.bio || "No bio available"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 px-4 pt-3">
          {(["about", "book", "message"] as TabKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-t-md px-4 py-2 text-sm ${
                tab === k
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {k === "about" ? "About" : k === "book" ? "Book" : "Message"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {tab === "about" && (
            <div className="space-y-3">
              <h3 className="text-white">About {artist.username}</h3>
              <p className="text-gray-300">
                {artist.bio || "No bio available"}
              </p>
              <p className="text-sm text-gray-400">
                Explore their portfolio on the main page, then switch to the{" "}
                <span className="text-white">Book</span> tab to reserve a time.
              </p>
            </div>
          )}

          {tab === "book" && (
            <div className="space-y-4">
              <h3 className="text-white">Book {artist.username}</h3>
              {/* Booking UI */}
              <BookingPicker artistId={artist._id} />
              <p className="mt-2 text-xs text-gray-400">
                After booking, the slot will disappear from the list to prevent
                double-booking.
              </p>
            </div>
          )}

          {tab === "message" && (
            <div className="space-y-4">
              <h3 className="text-white">Message {artist.username}</h3>
              <p className="text-gray-300">
                Send a quick intro. You can also ask questions about
                availability or designs.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    onMessage(artist, preloadedMessage);
                    onClose();
                  }}
                  className="rounded bg-black px-4 py-2 text-white transition hover:bg-gray-900"
                >
                  Send Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ArtistModal;