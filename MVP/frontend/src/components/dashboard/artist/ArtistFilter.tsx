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
  availabilityFilter: string;
  setAvailabilityFilter: (value: string) => void;
  experienceFilter: string;
  setExperienceFilter: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
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

const AVAILABILITY_OPTIONS = [
  { value: "all", label: "All Availability" },
  { value: "7d", label: "Next week" },
  { value: "lt1m", label: "Under 1 month" },
  { value: "1to3m", label: "1–3 months" },
  { value: "lte6m", label: "Up to 6 months" },
  { value: "waitlist", label: "Waitlist / Closed" },
] as const;

const EXPERIENCE_OPTIONS = [
  { value: "all", label: "All Experience" },
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6-10", label: "6–10 years" },
  { value: "10+", label: "10+ years" },
] as const;

const SORT_OPTIONS = [
  { value: "rating_desc", label: "Highly rated" },
  { value: "rating_asc", label: "Lowest rating" },
  { value: "experience_desc", label: "Most experience" },
  { value: "experience_asc", label: "Least experience" },
  { value: "newest", label: "Newest" },
] as const;

const PRESET_STORAGE_KEY = "inkmity_artist_filters";

const ArtistFilter: React.FC<Props> = ({
  priceFilter,
  setPriceFilter,
  locationFilter,
  setLocationFilter,
  styleFilter,
  setStyleFilter,
  availabilityFilter,
  setAvailabilityFilter,
  experienceFilter,
  setExperienceFilter,
  sort,
  setSort,
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
          experienceFilter: string;
          sort: string;
          searchQuery: string;
        }>;
        if (p.priceFilter) setPriceFilter(p.priceFilter);
        if (p.locationFilter) setLocationFilter(p.locationFilter);
        if (p.styleFilter) setStyleFilter(p.styleFilter);
        if (p.availabilityFilter) setAvailabilityFilter(p.availabilityFilter);
        if (p.experienceFilter) setExperienceFilter(p.experienceFilter);
        if (p.sort) setSort(p.sort);
        if (typeof p.searchQuery === "string") {
          setLocalSearch(p.searchQuery);
          setSearchQuery(p.searchQuery);
        }
        setCurrentPage(1);
      }
    } catch { }
    hydratedRef.current = true;
  }, [setAvailabilityFilter, setCurrentPage, setExperienceFilter, setLocationFilter, setPriceFilter, setSearchQuery, setSort, setStyleFilter]);

  const isDirty = useMemo(
    () =>
      !!(
        localSearch.trim() ||
        (priceFilter && priceFilter !== "all") ||
        (locationFilter && locationFilter !== "all") ||
        (styleFilter && styleFilter !== "all") ||
        (availabilityFilter && availabilityFilter !== "all") ||
        (experienceFilter && experienceFilter !== "all") ||
        (sort && sort !== "rating_desc")
      ),
    [localSearch, priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, sort]
  );

  const resetAll = () => {
    setLocalSearch("");
    setSearchQuery("");
    setPriceFilter("all");
    setLocationFilter("all");
    setStyleFilter("all");
    setAvailabilityFilter("all");
    setExperienceFilter("all");
    setSort("rating_desc");
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PRESET_STORAGE_KEY);
    }
  };

  const triggerBase =
    "h-9 bg-elevated border-app text-app rounded-lg text-sm text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0";
  const contentBase = "bg-card text-app rounded-xl focus:outline-none ring-0 outline-none";
  const itemCentered =
    "justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0";

  return (
    <div
      className={clsx(
        "w-full bg-card border border-app rounded-xl shadow-sm",
        "p-2 sm:p-3",
        className
      )}
      role="region"
      aria-label="Artist filters"
    >
      <div className="w-full md:overflow-x-auto pb-0.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-nowrap md:min-w-[980px]">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search artists or tattoos (e.g., dragon, koi, portrait)"
              aria-label="Search artists or tattoo subjects"
              className={clsx(
                "pl-9 pr-9 h-9 w-full bg-elevated border-app text-app rounded-lg",
                "text-sm",
                "placeholder:text-muted-foreground"
              )}
            />
          </div>

          <div className="relative w-full sm:w-[170px] sm:shrink-0">
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
              <SelectTrigger className={clsx(triggerBase, "w-full pl-9")}>
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

          <div className="relative w-full sm:w-[185px] sm:shrink-0">
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
              <SelectTrigger className={clsx(triggerBase, "w-full pl-9")}>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent className={clsx(contentBase, "max-h-64 overflow-y-auto")}>
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

          <div className="relative w-full sm:w-[185px] sm:shrink-0">
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
              <SelectTrigger className={clsx(triggerBase, "w-full pl-9")}>
                <SelectValue placeholder="All Styles" />
              </SelectTrigger>
              <SelectContent className={clsx(contentBase, "max-h-64 overflow-y-auto")}>
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

          <div className="relative w-full sm:w-[175px] sm:shrink-0">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select value={availabilityFilter} onValueChange={(v) => { setAvailabilityFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className={clsx(triggerBase, "w-full pl-9")}>
                <SelectValue placeholder="Availability" />
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

          <div className="relative w-full sm:w-[165px] sm:shrink-0">
            <Select
              value={experienceFilter}
              onValueChange={(v) => {
                setExperienceFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className={clsx(triggerBase, "w-full")}>
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent className={contentBase}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-[165px] sm:shrink-0">
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className={clsx(triggerBase, "w-full")}>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className={contentBase}>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator className="my-2" />

      {isDirty && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {!!localSearch.trim() && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                Search: “{localSearch.trim()}”
                <button className="ml-2 inline-flex" onClick={() => setLocalSearch("")} aria-label="Clear search">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {locationFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                {locationFilter}
                <button className="ml-2 inline-flex" onClick={() => setLocationFilter("all")} aria-label="Clear location filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {styleFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                {styleFilter}
                <button className="ml-2 inline-flex" onClick={() => setStyleFilter("all")} aria-label="Clear style filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {availabilityFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                {AVAILABILITY_OPTIONS.find((o) => o.value === availabilityFilter)?.label ?? "Availability"}
                <button className="ml-2 inline-flex" onClick={() => setAvailabilityFilter("all")} aria-label="Clear availability filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {priceFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                {PRICE_OPTIONS.find((p) => p.value === priceFilter)?.label ?? priceFilter}
                <button className="ml-2 inline-flex" onClick={() => setPriceFilter("all")} aria-label="Clear price filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {experienceFilter !== "all" && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                {EXPERIENCE_OPTIONS.find((e) => e.value === experienceFilter)?.label ?? experienceFilter}
                <button className="ml-2 inline-flex" onClick={() => setExperienceFilter("all")} aria-label="Clear experience filter">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {sort !== "rating_desc" && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                {SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Sort"}
                <button className="ml-2 inline-flex" onClick={() => setSort("rating_desc")} aria-label="Reset sort">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-lg px-2.5 text-muted-foreground hover:text-foreground text-sm"
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