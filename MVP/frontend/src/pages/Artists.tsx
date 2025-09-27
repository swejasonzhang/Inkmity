import React, { useEffect, useState } from "react";
import ArtistCard from "../components/dashboard/ArtistCard";
import ArtistFilter from "../components/dashboard/ArtistFilter";
import { fetchArtists } from "../api/artists";

const Artists: React.FC = () => {
  const [artists, setArtists] = useState<any[]>([]);
  const [priceFilter, setPriceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const handleFetch = async () => {
    const data = await fetchArtists({
      price: priceFilter,
      location: locationFilter,
      style: styleFilter,
      page: currentPage,
    });
    const updatedData = data.map((artist: any) => ({
      ...artist,
      reviewsCount: artist.reviews?.length || 0,
      username: artist.username,
    }));
    setArtists(updatedData);
  };

  useEffect(() => {
    handleFetch();
  }, [priceFilter, locationFilter, styleFilter, currentPage]);

  return (
    <div className="p-4">
      <ArtistFilter
        priceFilter={priceFilter}
        setPriceFilter={setPriceFilter}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        styleFilter={styleFilter}
        setStyleFilter={setStyleFilter}
        artists={artists}
        setCurrentPage={setCurrentPage}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists.map((artist: any) => (
          <ArtistCard key={artist._id} artist={artist} onClick={() => {}} />
        ))}
      </div>
    </div>
  );
};

export default Artists;