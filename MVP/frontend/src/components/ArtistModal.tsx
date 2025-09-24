import React from "react";

interface Artist {
  _id: string;
  username: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  images?: string[];
  socialLinks?: { platform: string; url: string }[];
}

interface Props {
  artist: Artist;
  onClose: () => void;
  onMessage: (artist: Artist) => void;
}

const ArtistModal: React.FC<Props> = ({ artist, onClose, onMessage }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-4 text-center">
          {artist.username}
        </h2>
        <p className="text-gray-300 mb-2 text-center">{artist.bio}</p>
        <p className="text-gray-400 text-sm mb-2 text-center">
          Location: {artist.location}
        </p>
        <p className="text-gray-400 text-sm mb-2 text-center">
          Price Range:{" "}
          {artist.priceRange
            ? `$${artist.priceRange.min} - $${artist.priceRange.max}`
            : "N/A"}
        </p>
        <p className="text-gray-400 text-sm mb-2 text-center">
          Style: {artist.style?.join(", ")}
        </p>
        <p className="text-gray-400 text-sm mb-4 text-center">
          Rating: {artist.rating?.toFixed(1) || "0"}
        </p>

        {artist.images && artist.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4 justify-center">
            {artist.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`${artist.username} work ${i + 1}`}
                className="rounded-lg object-cover w-full h-40"
              />
            ))}
          </div>
        )}

        {artist.socialLinks && (
          <div className="flex gap-4 mb-4 justify-center">
            {artist.socialLinks.map((link, i) => (
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

        <button
          onClick={() => onMessage(artist)}
          className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 mb-4 transition"
        >
          Message {artist.username}
        </button>
      </div>
    </div>
  );
};

export default ArtistModal;