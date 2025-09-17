import React from "react";

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
}

interface ArtistCardProps {
  artist: Artist;
  onClick: (artist: Artist) => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  return (
    <div
      className="bg-gray-700 p-4 rounded-lg shadow hover:bg-gray-600 cursor-pointer"
      onClick={() => onClick(artist)}
    >
      <h2 className="text-xl font-semibold text-white">{artist.name}</h2>
      <p className="text-gray-300">{artist.bio}</p>
      <p className="text-gray-400 text-sm">Location: {artist.location}</p>
      <p className="text-white text-sm">
        Price Range:{" "}
        {artist.priceRange
          ? `$${artist.priceRange.min} - $${artist.priceRange.max}`
          : "N/A"}
      </p>
      <p className="text-gray-400 text-sm">Style: {artist.style?.join(", ")}</p>
      <p className="text-gray-400 text-sm">
        Rating: {artist.rating?.toFixed(1) || "0"}
      </p>
    </div>
  );
};

export default ArtistCard;