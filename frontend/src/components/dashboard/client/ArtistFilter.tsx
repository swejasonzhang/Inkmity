import React, { useEffect, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from "lucide-react";
import clsx from "clsx";

interface Artist {
  _id?: string | number;
  username?: string;
  bio?: string;
  location?: string;
  styles?: string[];
  priceRange?: { min: number; max: number };
  yearsExperience?: number | string;
  rating?: number | string;
  reviewsCount?: number | string;
  createdAt?: string | number | Date;
  availabilityCode?: "7d" | "lt1m" | "1to3m" | "lte6m" | "waitlist";
  availabilityDays?: number;
  tags?: string[];
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  instagram?: string;
  portfolio?: string;
}

interface Props {
  priceFilter?: string;
  setPriceFilter?: (value: string) => void;
  locationFilter?: string;
  setLocationFilter?: (value: string) => void;
  styleFilter?: string;
  setStyleFilter?: (value: string) => void;
  availabilityFilter?: string;
  setAvailabilityFilter?: (value: string) => void;
  experienceFilter?: string;
  setExperienceFilter?: (value: string) => void;
  bookingFilter?: string;
  setBookingFilter?: (value: string) => void;
  travelFilter?: string;
  setTravelFilter?: (value: string) => void;
  sort?: string;
  setSort?: (value: string) => void;
  artists?: Artist[];
  setCurrentPage?: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  className?: string;
}

const SORT_OPTIONS = [
  { value: "highest_rated", label: "Top rated" },
  { value: "most_reviews", label: "Most reviewed" },
  { value: "experience_desc", label: "Most experienced" },
  { value: "newest", label: "Newest" },
] as const;

const ArtistFilter: React.FC<Props> = ({ searchQuery, setSearchQuery, setCurrentPage, sort, setSort, className }) => {
  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");
  const debounceRef = useRef<number | null>(null);
  const currentSort = sort && SORT_OPTIONS.some((o) => o.value === sort) ? sort : "highest_rated";

  useEffect(() => setLocalSearch(searchQuery ?? ""), [searchQuery]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchQuery(localSearch);
      setCurrentPage?.(1);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [localSearch, setSearchQuery, setCurrentPage]);

  const shell =
    "flex items-stretch w-full max-w-2xl mx-auto rounded-xl overflow-hidden border border-app/60 focus-within:border-app transition-colors";

  return (
    <section className={clsx("w-full", className)} role="search" aria-label="Search artists">
      <div className={shell}>
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle"
            aria-hidden
          />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search artists, styles, cities…"
            aria-label="Search artists, styles, or cities"
            className={clsx(
              "pl-10 pr-3 h-11 w-full rounded-none border-0 bg-transparent text-app",
              "text-sm placeholder:text-muted-foreground",
              "outline-none ring-0 focus:ring-0 focus-visible:ring-0 transition-colors",
              "selection:bg-elevated selection:text-app caret-[var(--fg)] text-left"
            )}
          />
        </div>

        {setSort && (
          <>
            <Select value={currentSort} onValueChange={(v) => { setSort(v); setCurrentPage?.(1); }}>
              <SelectTrigger
                aria-label="Sort artists"
                className={clsx(
                  "self-stretch h-auto data-[size=default]:h-auto rounded-none border-0 bg-transparent text-app text-sm gap-2 px-3.5",
                  "w-11 shrink-0 justify-center sm:w-auto sm:justify-center",
                  "[&>svg:last-child]:hidden sm:[&>svg:last-child]:block",
                  "hover:bg-elevated/60 transition-colors focus:ring-0 focus:outline-none ring-0"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <ArrowUpDown className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline truncate">
                    <SelectValue />
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent
                className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] bg-card text-app border border-app rounded-xl shadow-xl"
                position="popper"
                align="center"
              >
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm rounded-lg cursor-pointer">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </section>
  );
};

export default ArtistFilter;
