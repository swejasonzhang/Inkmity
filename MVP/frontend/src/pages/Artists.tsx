import React, { useEffect, useState } from "react";
import ArtistCard from "../components/dashboard/ArtistCard";
import ArtistFilter from "../components/dashboard/ArtistFilter";
import { fetchArtists } from "../api/artists";

interface Artist {
  _id: string;
  username: string;
  location?: string;
  style?: string[];
  reviews?: { rating: number; comment?: string }[];
}

const Artists: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [priceFilter, setPriceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleFetch = async () => {
    const data: Artist[] = await fetchArtists({
      price: priceFilter,
      location: locationFilter,
      style: styleFilter,
      page: currentPage,
      search: searchQuery,
    });

    const updatedData = data.map((artist) => ({
      ...artist,
      reviewsCount: artist.reviews?.length || 0,
      username: artist.username,
    }));

    setArtists(updatedData);
  };

  useEffect(() => {
    handleFetch();
  }, [priceFilter, locationFilter, styleFilter, currentPage, searchQuery]);

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
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {artists.map((artist) => (
          <ArtistCard key={artist._id} artist={artist} onClick={() => {}} />
        ))}
      </div>
    </div>
  );
};

export default Artists;
