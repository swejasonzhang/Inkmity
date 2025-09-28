import React, { useMemo, useState } from "react";

interface Artist {
  _id: string;
  username: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  reviewsCount?: number;
  profileImage?: string;
}

interface ArtistCardProps {
  artist: Artist;
  onClick: (artist: Artist) => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  const [imgOk, setImgOk] = useState(Boolean(artist.profileImage));

  const initials = useMemo(() => {
    return (artist.username || "A")
      .split(" ")
      .map((s) => s[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  }, [artist.username]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(artist)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick(artist)}
      className="bg-gray-900 p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:bg-gray-800 cursor-pointer
                 border border-gray-700 flex items-center justify-center"
    >
      <div className="grid grid-cols-[auto,1fr,auto] items-center justify-center gap-8 w-full max-w-4xl text-center">
        <div className="shrink-0 justify-self-center">
          {artist.profileImage && imgOk ? (
            <img
              src={artist.profileImage}
              alt={`${artist.username} profile`}
              className="h-20 w-20 rounded-full object-cover border border-gray-700"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
              <span className="text-white font-semibold text-xl">
                {initials}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center">
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-wide">
            {artist.username}
          </h2>

          <p className="text-gray-400 italic text-base mb-3 max-w-xl">
            {artist.bio || "No bio available."}
          </p>

          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-black-600 font-bold">✦</span>
            <span className="text-white font-semibold">
              {artist.rating?.toFixed(1) || "0"}
            </span>
            <span className="text-gray-400">
              ({artist.reviewsCount || 0} reviews)
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-1">
          <p className="text-gray-500 text-sm font-medium">
            Location:{" "}
            <span className="text-gray-200">
              {artist.location || "Unknown"}
            </span>
          </p>

          <p className="text-gray-400 text-sm">
            Price:{" "}
            <span className="text-white font-semibold">
              {artist.priceRange
                ? `$${artist.priceRange.min} - $${artist.priceRange.max}`
                : "N/A"}
            </span>
          </p>

          <p className="text-gray-500 text-sm">
            Style:{" "}
            <span className="text-gray-200 font-medium">
              {artist.style?.join(", ") || "N/A"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;
