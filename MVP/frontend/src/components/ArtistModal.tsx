import React from "react";
import { motion } from "framer-motion";

interface Artist {
  _id: string;
  username: string;
  bio?: string;
}

interface ArtistModalProps {
  artist: Artist;
  onClose: () => void;
  onMessage: (artist: Artist) => void;
}

const ArtistModal: React.FC<ArtistModalProps> = ({
  artist,
  onClose,
  onMessage,
}) => {
  return (
    <motion.div
      key={artist._id}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 flex justify-center items-center z-50 bg-black bg-opacity-50"
    >
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-11/12 max-w-lg">
        <h2 className="text-white text-xl font-bold mb-2">{artist.username}</h2>
        <p className="text-gray-300 mb-4">{artist.bio || "No bio available"}</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
          <button
            onClick={() => onMessage(artist)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Message
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ArtistModal;