import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  priceFilter: string;
  setPriceFilter: (value: string) => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
  styleFilter: string;
  setStyleFilter: (value: string) => void;
  artists: any[];
  setCurrentPage: (page: number) => void;
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
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      <Select
        value={priceFilter}
        onValueChange={(value) => {
          setPriceFilter(value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-full bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 rounded-lg">
          <SelectValue placeholder="All Prices" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 text-white">
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
        <SelectTrigger className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 text-white">
          <SelectItem value="all">All Locations</SelectItem>
          {[...new Set(artists.map((a) => a.location))].map(
            (loc) =>
              loc && (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              )
          )}
        </SelectContent>
      </Select>

      <Select
        value={styleFilter}
        onValueChange={(value) => {
          setStyleFilter(value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg">
          <SelectValue placeholder="All Styles" />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 text-white">
          <SelectItem value="all">All Styles</SelectItem>
          {[...new Set(artists.flatMap((a) => a.style || []))].map((style) => (
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