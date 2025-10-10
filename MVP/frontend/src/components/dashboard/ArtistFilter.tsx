import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, MapPin, Brush, CircleDollarSign, X } from "lucide-react";
import clsx from "clsx";

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
  className?: string;
}

const PRICE_OPTIONS = [
  { value: "all", label: "All Prices" },
  { value: "100-500", label: "$100 – $500" },
  { value: "500-1000", label: "$500 – $1,000" },
  { value: "1000-2000", label: "$1,000 – $2,000" },
  { value: "2000-5000", label: "$2,000 – $5,000" },
  { value: "5000+", label: "$5,000+" },
] as const;

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
  className,
}) => {
  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    for (const a of artists) if (a.location) set.add(a.location);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [artists]);

  const uniqueStyles = useMemo(() => {
    const set = new Set<string>();
    for (const a of artists) (a.style ?? []).forEach((s) => set.add(s));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [artists]);

  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");
  const debounceRef = useRef<number | null>(null);
  useEffect(() => setLocalSearch(searchQuery ?? ""), [searchQuery]);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchQuery(localSearch);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [localSearch]);

  const isDirty = useMemo(
    () =>
      !!(
        localSearch.trim() ||
        (priceFilter && priceFilter !== "all") ||
        (locationFilter && locationFilter !== "all") ||
        (styleFilter && styleFilter !== "all")
      ),
    [localSearch, priceFilter, locationFilter, styleFilter]
  );

  const resetAll = () => {
    setLocalSearch("");
    setSearchQuery("");
    setPriceFilter("all");
    setLocationFilter("all");
    setStyleFilter("all");
    setCurrentPage(1);
  };

  return (
    <div
      className={clsx(
        "w-full bg-card border border-app rounded-2xl shadow-sm",
        "p-3 sm:p-4 md:p-5",
        className
      )}
      role="region"
      aria-label="Artist filters"
    >
      <div className="-mx-2 md:mx-0">
        <div className="flex flex-wrap items-center gap-3 px-2 w-full">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search artists or tattoos they’ve done (e.g., dragon, koi, portrait)"
              aria-label="Search artists or tattoo subjects"
              className="pl-9 h-10 bg-elevated border-app text-app rounded-xl placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative flex-1 min-w-[160px]">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <CircleDollarSign className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select
              value={priceFilter}
              onValueChange={(value) => {
                setPriceFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10 pl-9 bg-elevated border-app text-app rounded-xl">
                <SelectValue placeholder="All Prices" />
              </SelectTrigger>
              <SelectContent className="bg-card text-app border-2 border-app rounded-2xl">
                {PRICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 min-w-[160px]">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <MapPin className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select
              value={locationFilter}
              onValueChange={(value) => {
                setLocationFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10 pl-9 bg-elevated border-app text-app rounded-xl">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent className="bg-card text-app border-2 border-app rounded-2xl max-h-72 overflow-y-auto">
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative shrink-0 min-w-[160px]">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Brush className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select
              value={styleFilter}
              onValueChange={(value) => {
                setStyleFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10 pl-9 bg-elevated border-app text-app rounded-xl">
                <SelectValue placeholder="All Styles" />
              </SelectTrigger>
              <SelectContent className="bg-card text-app border-2 border-app rounded-2xl max-h-72 overflow-y-auto">
                <SelectItem value="all">All Styles</SelectItem>
                {uniqueStyles.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-xl px-3 text-muted-foreground hover:text-foreground"
                onClick={resetAll}
                aria-label="Clear all filters"
              >
                <X className="size-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      {isDirty && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {localSearch.trim() && (
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
              Search: “{localSearch.trim()}”
              <button
                className="ml-2 inline-flex"
                onClick={() => setLocalSearch("")}
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {locationFilter !== "all" && (
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
              {locationFilter}
              <button
                className="ml-2 inline-flex"
                onClick={() => setLocationFilter("all")}
                aria-label="Clear location filter"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {styleFilter !== "all" && (
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
              {styleFilter}
              <button
                className="ml-2 inline-flex"
                onClick={() => setStyleFilter("all")}
                aria-label="Clear style filter"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtistFilter;