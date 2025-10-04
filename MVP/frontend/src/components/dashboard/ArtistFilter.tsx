import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Artist {
  location?: string;
  style?: string[];
}

interface Props {
  priceFilter: string;
  setPriceFilter: (value: string) => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
  styleFilter: string;
  setStyleFilter: (value: string) => void;
  artists: Artist[];
  setCurrentPage: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

const ArtistFilter: React.FC<Props> = ({
  priceFilter,
  setPriceFilter,
  locationFilter,
  setLocationFilter,
  styleFilter,
  setStyleFilter,
  artists,
  setCurrentPage,
  searchQuery,
  setSearchQuery,
}) => {
  const uniqueLocations = [...new Set(artists.map((a) => a.location).filter(Boolean))] as string[];
  const uniqueStyles = [...new Set(artists.flatMap((a) => a.style ?? []))];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full">
      <div className="sm:col-span-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by name, style, location..."
          className="w-full bg-card border-2 border-app text-app text-sm px-4 py-2 rounded-2xl placeholder-[color:var(--muted)] focus:outline-none focus:bg-elevated"
        />
      </div>

      <Select
        value={priceFilter}
        onValueChange={(value) => {
          setPriceFilter(value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-full bg-card border-2 border-app text-app text-sm px-4 py-2 rounded-2xl">
          <SelectValue placeholder="All Prices" />
        </SelectTrigger>
        <SelectContent className="bg-card text-app border-2 border-app rounded-2xl">
          <SelectItem value="all">All Prices</SelectItem>
          <SelectItem value="100-500">$100 - $500</SelectItem>
          <SelectItem value="500-1000">$500 - $1000</SelectItem>
          <SelectItem value="1000-2000">$1000 - $2000</SelectItem>
          <SelectItem value="2000-5000">$2000 - $5000</SelectItem>
          <SelectItem value="5000+">$5000+</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={locationFilter}
        onValueChange={(value) => {
          setLocationFilter(value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-full bg-card border-2 border-app text-app text-sm rounded-2xl">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent className="bg-card text-app border-2 border-app rounded-2xl">
          <SelectItem value="all">All Locations</SelectItem>
          {uniqueLocations.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {loc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={styleFilter}
        onValueChange={(value) => {
          setStyleFilter(value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-full bg-card border-2 border-app text-app text-sm rounded-2xl">
          <SelectValue placeholder="All Styles" />
        </SelectTrigger>
        <SelectContent className="bg-card text-app border-2 border-app rounded-2xl">
          <SelectItem value="all">All Styles</SelectItem>
          {uniqueStyles.map((style) => (
            <SelectItem key={style} value={style}>
              {style}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ArtistFilter;