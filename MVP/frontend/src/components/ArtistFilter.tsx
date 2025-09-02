import React, { useState } from "react";

interface Props {
  onFilter: (filters: any) => void;
}

const ArtistFilter: React.FC<Props> = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    location: "",
    style: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => onFilter(filters);

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      <input
        name="location"
        placeholder="Location"
        onChange={handleChange}
        className="p-2 rounded-md"
      />
      <input
        name="style"
        placeholder="Style"
        onChange={handleChange}
        className="p-2 rounded-md"
      />
      <input
        name="minPrice"
        placeholder="Min Price"
        type="number"
        onChange={handleChange}
        className="p-2 rounded-md"
      />
      <input
        name="maxPrice"
        placeholder="Max Price"
        type="number"
        onChange={handleChange}
        className="p-2 rounded-md"
      />
      <input
        name="minRating"
        placeholder="Min Rating"
        type="number"
        onChange={handleChange}
        className="p-2 rounded-md"
      />
      <button
        onClick={handleSubmit}
        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-md text-white"
      >
        Apply
      </button>
    </div>
  );
};

export default ArtistFilter;