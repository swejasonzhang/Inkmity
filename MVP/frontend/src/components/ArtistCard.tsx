import React from "react";

interface Props {
  name: string;
  style: string[];
  location: string;
  rating: number;
}

const ArtistCard: React.FC<Props> = ({ name, style, location, rating }) => {
  return (
    <div className="bg-white/10 p-4 rounded-md backdrop-blur-md border border-white/20">
      <h2 className="text-xl font-bold text-white">{name}</h2>
      <p className="text-gray-200">{style.join(", ")}</p>
      <p className="text-gray-200">{location}</p>
      <p className="text-yellow-400">⭐ {rating}</p>
    </div>
  );
};

export default ArtistCard;
