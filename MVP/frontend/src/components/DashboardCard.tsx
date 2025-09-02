import React from "react";

export interface DashboardCardProps {
  id: string;
  name: string;
  location?: string;
  style?: string;
  priceRange?: string;
  rating?: number;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  name,
  location,
  style,
  priceRange,
  rating,
}) => {
  return (
    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md hover:scale-105 transition-transform duration-200">
      <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
      {location && (
        <p className="text-gray-300 text-sm">Location: {location}</p>
      )}
      {style && <p className="text-gray-300 text-sm">Style: {style}</p>}
      {priceRange && (
        <p className="text-gray-300 text-sm">Price: {priceRange}</p>
      )}
      {rating && <p className="text-yellow-400 text-sm">Rating: {rating}/5</p>}
    </div>
  );
};

export default DashboardCard;