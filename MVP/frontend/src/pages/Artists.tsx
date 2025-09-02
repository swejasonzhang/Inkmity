import React, { useEffect, useState } from "react";
import ArtistCard from "../components/ArtistCard";
import ArtistFilter from "../components/ArtistFilter";
import { fetchArtists } from "../api/artists";

const Artists: React.FC = () => {
  const [artists, setArtists] = useState([]);

  const handleFilter = async (filters: any) => {
    const data = await fetchArtists(filters);
    setArtists(data);
  };

  useEffect(() => {
    handleFilter({});
  }, []);

  return (
    <div className="p-4">
      <ArtistFilter onFilter={handleFilter} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists.map((artist: any) => (
          <ArtistCard key={artist._id} {...artist} />
        ))}
      </div>
    </div>
  );
};

export default Artists;