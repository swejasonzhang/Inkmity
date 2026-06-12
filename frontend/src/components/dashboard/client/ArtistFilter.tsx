import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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

// Props are kept broad so the dashboards can pass the same set, but the filter
// is now just a search field — the rest of the controls were removed.
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

const ArtistFilter: React.FC<Props> = ({ searchQuery, setSearchQuery, setCurrentPage, className }) => {
  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");
  const debounceRef = useRef<number | null>(null);

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

  return (
    <section
      className={clsx("w-full max-w-full mb-3 sm:mb-0 mx-auto", className)}
      role="search"
      aria-label="Search artists"
      style={{ maxWidth: "100%", width: "100%" }}
    >
      <div className="px-2 py-1.5 sm:px-0 sm:py-0">
        <div className="relative w-full min-w-0">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle"
            aria-hidden
          />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search artists, styles, cities…"
            aria-label="Search artists, styles, or cities"
            className={clsx(
              "pl-11 pr-4 h-11 w-full rounded-xl",
              "bg-[color-mix(in_srgb,var(--card)_70%,transparent)] backdrop-blur-sm border-app/60 text-app",
              "text-sm placeholder:text-muted-foreground",
              "outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-app transition-colors",
              "selection:bg-elevated selection:text-app caret-[var(--fg)] text-left"
            )}
          />
        </div>
      </div>
    </section>
  );
};

export default ArtistFilter;
