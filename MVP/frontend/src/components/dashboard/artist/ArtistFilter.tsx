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
import { Search, MapPin, Brush, CircleDollarSign, CalendarDays, X } from "lucide-react";
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
  availabilityFilter: string;
  setAvailabilityFilter: (value: string) => void;
}

const PRICE_OPTIONS = [
  { value: "all", label: "All Prices" },
  { value: "100-500", label: "$100 – $500" },
  { value: "500-1000", label: "$500 – $1,000" },
  { value: "1000-2000", label: "$1,000 – $2,000" },
  { value: "2000-5000", label: "$2,000 – $5,000" },
  { value: "5000+", label: "$5,000+" },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: "all", label: "All Availability" },
  { value: "7d", label: "Next week" },
  { value: "lt1m", label: "Under 1 month" },
  { value: "1to3m", label: "1–3 months" },
  { value: "lte6m", label: "Up to 6 months" },
  { value: "waitlist", label: "Waitlist / Closed" },
] as const;

const PRESET_STORAGE_KEY = "inkmity_artist_filters";

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
  availabilityFilter,
  setAvailabilityFilter,
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
  }, [localSearch, setSearchQuery, setCurrentPage]);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<{
          priceFilter: string;
          locationFilter: string;
          styleFilter: string;
          availabilityFilter: string;
          searchQuery: string;
        }>;
        if (p.priceFilter) setPriceFilter(p.priceFilter);
        if (p.locationFilter) setLocationFilter(p.locationFilter);
        if (p.styleFilter) setStyleFilter(p.styleFilter);
        if (p.availabilityFilter) setAvailabilityFilter(p.availabilityFilter);
        if (typeof p.searchQuery === "string") {
          setLocalSearch(p.searchQuery);
          setSearchQuery(p.searchQuery);
        }
        setCurrentPage(1);
      }
    } catch { }
    hydratedRef.current = true;
  }, [setAvailabilityFilter, setCurrentPage, setLocationFilter, setPriceFilter, setSearchQuery, setStyleFilter]);

  const isDirty = useMemo(
    () =>
      !!(
        localSearch.trim() ||
        (priceFilter && priceFilter !== "all") ||
        (locationFilter && locationFilter !== "all") ||
        (styleFilter && styleFilter !== "all") ||
        (availabilityFilter && availabilityFilter !== "all")
      ),
    [localSearch, priceFilter, locationFilter, styleFilter, availabilityFilter]
  );

  const resetAll = () => {
    setLocalSearch("");
    setSearchQuery("");
    setPriceFilter("all");
    setLocationFilter("all");
    setStyleFilter("all");
    setAvailabilityFilter("all");
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PRESET_STORAGE_KEY);
    }
  };

  const handleAvailabilityChange = (val: string) => {
    setAvailabilityFilter(val);
    setCurrentPage(1);
  };

  const triggerBase =
    "w-full h-10 bg-elevated border-app text-app rounded-xl text-sm sm:text-base text-center justify-center pl-9 pr-9 focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0";
  const contentBase = "bg-card text-app rounded-2xl focus:outline-none ring-0 outline-none";
  const itemCentered =
    "justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search artists or tattoos (e.g., dragon, koi, portrait)"
            aria-label="Search artists or tattoo subjects"
            className={clsx(
              "pl-9 pr-9 h-10 w-full bg-elevated border-app text-app rounded-xl",
              "text-center",
              "text-sm sm:text-base",
              "placeholder:text-center",
              "placeholder:text-xs sm:placeholder:text-sm md:placeholder:text-base",
              "placeholder:text-muted-foreground"
            )}
          />
        </div>

        <div className="relative">
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
            <SelectTrigger className={triggerBase}>
              <SelectValue placeholder="All Prices" />
            </SelectTrigger>
            <SelectContent className={contentBase}>
              {PRICE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
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
            <SelectTrigger className={triggerBase}>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent className={clsx(contentBase, "max-h-72 overflow-y-auto")}>
              <SelectItem value="all" className={itemCentered}>
                All Locations
              </SelectItem>
              {uniqueLocations.map((loc) => (
                <SelectItem key={loc} value={loc} className={itemCentered}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
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
            <SelectTrigger className={triggerBase}>
              <SelectValue placeholder="All Styles" />
            </SelectTrigger>
            <SelectContent className={clsx(contentBase, "max-h-72 overflow-y-auto")}>
              <SelectItem value="all" className={itemCentered}>
                All Styles
              </SelectItem>
              {uniqueStyles.map((style) => (
                <SelectItem key={style} value={style} className={itemCentered}>
                  {style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <Select value={availabilityFilter} onValueChange={handleAvailabilityChange}>
            <SelectTrigger className={triggerBase}>
              <SelectValue placeholder="All Availability" />
            </SelectTrigger>
            <SelectContent className={contentBase}>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="my-3" />

      {isDirty && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {localSearch.trim() && (
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                Search: “{localSearch.trim()}”
                <button className="ml-2 inline-flex" onClick={() => setLocalSearch("")} aria-label="Clear search">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {locationFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                {locationFilter}
                <button className="ml-2 inline-flex" onClick={() => setLocationFilter("all")} aria-label="Clear location filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {styleFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                {styleFilter}
                <button className="ml-2 inline-flex" onClick={() => setStyleFilter("all")} aria-label="Clear style filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {availabilityFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                {AVAILABILITY_OPTIONS.find((o) => o.value === availabilityFilter)?.label ?? "Availability"}
                <button className="ml-2 inline-flex" onClick={() => setAvailabilityFilter("all")} aria-label="Clear availability filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {priceFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                {PRICE_OPTIONS.find((p) => p.value === priceFilter)?.label ?? priceFilter}
                <button className="ml-2 inline-flex" onClick={() => setPriceFilter("all")} aria-label="Clear price filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl px-3 text-muted-foreground hover:text-foreground"
              onClick={resetAll}
              aria-label="Clear all filters"
            >
              <X className="size-4" />
              <span className="ml-1 hidden sm:inline">Clear all</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistFilter;
