import React from "react";

interface Artist {
  _id: string;
  username: string; // updated
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  reviewsCount?: number;
}

interface ArtistCardProps {
  artist: Artist;
  onClick: (artist: Artist) => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  return (
    <div
      className="bg-gray-900 p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-gray-800 cursor-pointer flex flex-col items-center text-center border border-gray-700"
      onClick={() => onClick(artist)}
    >
      <h2 className="text-3xl font-extrabold text-white mb-3 tracking-wide">
        {artist.username}
      </h2>

      <p className="text-gray-400 italic text-base mb-3 max-w-xs">
        {artist.bio || "No bio available."}
      </p>

      <p className="text-gray-500 text-sm mb-1 font-medium">
        Location:{" "}
        <span className="text-gray-200">{artist.location || "Unknown"}</span>
      </p>

      <p className="text-gray-400 text-sm mb-1">
        Price:{" "}
        <span className="text-white font-semibold">
          {artist.priceRange
            ? `$${artist.priceRange.min} - $${artist.priceRange.max}`
            : "N/A"}
        </span>
      </p>

      <p className="text-gray-500 text-sm mb-2">
        Style:{" "}
        <span className="text-gray-200 font-medium">
          {artist.style?.join(", ") || "N/A"}
        </span>
      </p>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-black-600 font-bold">✦</span>
        <span className="text-white font-semibold">
          {artist.rating?.toFixed(1) || "0"}
        </span>
        <span className="text-gray-400">
          ({artist.reviewsCount || 0} reviews)
        </span>
      </div>
    </div>
  );
};

export default ArtistCard;