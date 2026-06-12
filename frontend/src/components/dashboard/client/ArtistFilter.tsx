import React, { useEffect, useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
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
  bookingFilter: string;
  setBookingFilter: (value: string) => void;
  travelFilter: string;
  setTravelFilter: (value: string) => void;
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
  { value: "amateur", label: "Amateur (<1–2 yrs)" },
  { value: "experienced", label: "Experienced (3–5 yrs)" },
  { value: "professional", label: "Professional (6–10 yrs)" },
  { value: "veteran", label: "Veteran (10+ yrs)" },
] as const;

const BOOKING_OPTIONS = [
  { value: "all", label: "All Booking" },
  { value: "open", label: "Open to new clients" },
  { value: "waitlist", label: "Waitlist" },
  { value: "closed", label: "Books closed" },
  { value: "referral", label: "Referral only" },
  { value: "guest", label: "Guest spots only" },
] as const;

const TRAVEL_OPTIONS = [
  { value: "all", label: "All Travel" },
  { value: "rare", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "touring", label: "Touring" },
  { value: "guest_only", label: "Guest only" },
] as const;

const SORT_OPTIONS = [
  { value: "highest_rated", label: "Highest rated" },
  { value: "most_reviews", label: "Most reviews" },
  { value: "experience_desc", label: "Most experience" },
  { value: "experience_asc", label: "Least experience" },
  { value: "newest", label: "Newest" },
] as const;

const PRESET_STORAGE_KEY = "inkmity_artist_filters";

const getExperienceCategory = (
  value: string | undefined
):
  | "all"
  | "amateur"
  | "experienced"
  | "professional"
  | "veteran"
  | undefined => {
  if (!value) return undefined;
  const raw = value.toString().trim().toLowerCase();
  if (raw === "all") return "all";
  if (["amateur", "experienced", "professional", "veteran"].includes(raw)) return raw as any;
  const cleaned = raw.replace(/\s+/g, "").replace(/years?|yrs?|yoe|exp/g, "").replace(/\u2013|\u2014/g, "-");
  if (/amateur/.test(raw)) return "amateur";
  if (/experienced/.test(raw)) return "experienced";
  if (/professional/.test(raw)) return "professional";
  if (/veteran/.test(raw)) return "veteran";
  const endsPlus = cleaned.endsWith("+");
  if (endsPlus && Number(cleaned.replace("+", "")) >= 10) return "veteran";
  const [a, b] = cleaned.split("-").map((n) => Number(n));
  if (a === 0 && b === 2) return "amateur";
  if (a === 3 && b === 5) return "experienced";
  if (a === 6 && b === 10) return "professional";
  if (a === 10 && !Number.isFinite(b)) return "veteran";
  return undefined;
};

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
  bookingFilter,
  setBookingFilter,
  travelFilter,
  setTravelFilter,
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
    for (const a of artists) (a.styles ?? []).forEach((s) => set.add(s));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [artists]);

  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");
  const debounceRef = useRef<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!sort) setSort("highest_rated");
  }, [sort, setSort]);

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
          bookingFilter: string;
          travelFilter: string;
          sort: string;
          searchQuery: string;
        }>;
        if (p.priceFilter) setPriceFilter(p.priceFilter);
        if (p.locationFilter) setLocationFilter(p.locationFilter);
        if (p.styleFilter) setStyleFilter(p.styleFilter);
        if (p.availabilityFilter) setAvailabilityFilter(p.availabilityFilter);
        if (p.experienceFilter) setExperienceFilter(getExperienceCategory(p.experienceFilter) ?? "all");
        if (p.bookingFilter) setBookingFilter(p.bookingFilter);
        if (p.travelFilter) setTravelFilter(p.travelFilter);
        if (p.sort) setSort(p.sort);
        else setSort("highest_rated");
        if (typeof p.searchQuery === "string") {
          setLocalSearch(p.searchQuery);
          setSearchQuery(p.searchQuery);
        }
        setCurrentPage(1);
      } else {
        setSort("highest_rated");
      }
    } catch {
      setSort("highest_rated");
    }
    hydratedRef.current = true;
  }, [
    setAvailabilityFilter,
    setCurrentPage,
    setExperienceFilter,
    setLocationFilter,
    setPriceFilter,
    setSearchQuery,
    setSort,
    setStyleFilter,
    setBookingFilter,
    setTravelFilter,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      priceFilter,
      locationFilter,
      styleFilter,
      availabilityFilter,
      experienceFilter,
      bookingFilter,
      travelFilter,
      sort,
      searchQuery,
    };
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(payload));
    } catch { }
  }, [priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, bookingFilter, travelFilter, sort, searchQuery]);

  const triggerBase = "h-10 bg-elevated/60 hover:bg-elevated border border-app/60 text-xs sm:text-sm rounded-md text-center justify-center transition-colors focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 data-[state=open]:bg-elevated data-[state=open]:border-[color:var(--fg)]";
  // Active (non-default) filters invert to solid fg/bg — a monochrome "on" state.
  const triggerActive = "h-10 bg-[color:var(--fg)] text-[color:var(--bg)] border border-[color:var(--fg)] text-xs sm:text-sm rounded-md text-center justify-center font-semibold transition-colors focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 data-[state=open]:bg-[color:var(--fg)]";
  const trig = (active: boolean) => (active ? triggerActive : triggerBase);
  const contentBase = "bg-card text-app border border-app rounded-2xl shadow-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto data-[state=open]:animate-in";
  const itemCentered = "justify-center text-center rounded-lg outline-none focus:outline-none focus:bg-elevated focus:ring-0 focus-visible:ring-0 ring-0 cursor-pointer";
  const FILTER_W = "w-full sm:flex-1 sm:min-w-[8.5rem]";
  const SEARCH_W = "w-full sm:flex-[3] sm:min-w-[15rem]";
  const PRIMARY_VIS = clsx(showMobileFilters ? "block" : "hidden", "sm:block");

  return (
    <section
      className={clsx(
        "relative w-full max-w-full bg-card border-b border-app mb-3",
        "sm:border sm:rounded-xl sm:shadow-sm sm:mb-0",
        "sm:bg-[color-mix(in_srgb,var(--card)_85%,transparent)] sm:backdrop-blur-sm",
        "mx-auto overflow-hidden",
        className
      )}
      role="region"
      aria-label="Artist filters"
      style={{ maxWidth: '100%', width: '100%' }}
    >
      {/* Industrial viewfinder corner brackets — distinct, monochrome identity. */}
      {[
        "top-1.5 left-1.5 border-t-2 border-l-2",
        "top-1.5 right-1.5 border-t-2 border-r-2",
        "bottom-1.5 left-1.5 border-b-2 border-l-2",
        "bottom-1.5 right-1.5 border-b-2 border-r-2",
      ].map((c, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx("pointer-events-none absolute h-2.5 w-2.5 hidden sm:block z-[1]", c)}
          style={{ borderColor: "color-mix(in srgb, var(--fg) 45%, transparent)" }}
        />
      ))}
      <div className="sm:hidden border-t border-app" aria-hidden="true" />
      <div className="w-full mx-auto max-w-full overflow-hidden" style={{ maxWidth: '100%', width: '100%' }}>
        <div className="p-2 sm:p-2.5 md:p-3" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-nowrap sm:items-center sm:gap-2.5 w-full max-w-full min-w-0" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
            <div className="hidden lg:flex items-center shrink-0 pr-2.5 mr-0.5 border-r border-app/50 select-none">
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-subtle">Filter</span>
            </div>
            <div className={clsx("relative col-span-2 sm:col-span-1 min-w-0", SEARCH_W)}>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-app"
                aria-hidden
              />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search artists, styles, cities…"
                aria-label="Search artists or tattoo subjects"
                className={clsx(
                  "pl-10 pr-4",
                  "h-10 w-full bg-elevated/60 border-app/60 text-app rounded-md",
                  "text-xs sm:text-sm placeholder:text-muted-foreground",
                  "outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-app/80 hover:bg-elevated transition-colors",
                  "selection:bg-elevated selection:text-app",
                  "caret-[var(--fg)]",
                  "text-left"
                )}
              />
            </div>
            <div className="col-span-1 sm:hidden">
              <button
                type="button"
                aria-label="Toggle filters"
                aria-expanded={showMobileFilters}
                onClick={() => setShowMobileFilters((v) => !v)}
                className={clsx(
                  "h-10 w-full inline-flex items-center justify-center gap-1.5 rounded-md",
                  "border border-app/60 text-app text-xs font-medium transition-colors",
                  showMobileFilters ? "bg-elevated" : "bg-elevated/60 hover:bg-elevated",
                  "outline-none ring-0 focus:ring-0 focus-visible:ring-0"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {showMobileFilters ? "Hide" : "Filters"}
              </button>
            </div>

            <div className={clsx("relative col-span-1", FILTER_W, PRIMARY_VIS)}>
              <Select
                value={styleFilter}
                onValueChange={(value) => {
                  setStyleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(trig(styleFilter !== "all"), "w-full px-4")}>
                  <SelectValue placeholder="All Styles" />
                </SelectTrigger>
                <SelectContent className={clsx(contentBase)} position="popper" align="start">
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

            <div className={clsx("relative col-span-1", FILTER_W, PRIMARY_VIS)}>
              <Select
                value={availabilityFilter}
                onValueChange={(v) => {
                  setAvailabilityFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(trig(availabilityFilter !== "all"), "w-full px-4")}>
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent className={clsx(contentBase)} position="popper" align="start">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={clsx("relative col-span-1", FILTER_W, PRIMARY_VIS)}>
              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(trig(sort !== "highest_rated"), "w-full px-4")}>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className={clsx(contentBase)} position="popper" align="start">
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              aria-label="Toggle advanced filters"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced((v) => !v)}
              className={clsx(
                "hidden sm:inline-flex sm:flex-none items-center justify-center gap-1.5 h-10 px-4 rounded-md",
                "border text-xs font-semibold transition-colors whitespace-nowrap",
                showAdvanced
                  ? "border-app bg-elevated text-app"
                  : "border-app/60 bg-elevated/60 text-app hover:bg-elevated"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showAdvanced ? "Less" : "Advanced"}
            </button>
          </div>

          <div
            className={clsx(
              "gap-2 mt-2 sm:mt-2.5 sm:gap-2.5 w-full max-w-full min-w-0",
              showMobileFilters ? "grid grid-cols-2" : "hidden",
              showAdvanced ? "sm:flex sm:flex-nowrap sm:items-center" : "sm:hidden"
            )}
          >
            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Select
                value={priceFilter}
                onValueChange={(value) => {
                  setPriceFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent className={contentBase} position="popper" align="start">
                  {PRICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Select
                value={locationFilter}
                onValueChange={(value) => {
                  setLocationFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className={clsx(contentBase)} position="popper" align="start">
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

            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Select
                value={experienceFilter}
                onValueChange={(v) => {
                  setExperienceFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent className={clsx(contentBase)} position="popper" align="start">
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Select
                value={bookingFilter}
                onValueChange={(v) => {
                  setBookingFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
                  <SelectValue placeholder="Booking" />
                </SelectTrigger>
                <SelectContent className={clsx(contentBase)} position="popper" align="start">
                  {BOOKING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Select
                value={travelFilter}
                onValueChange={(v) => {
                  setTravelFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
                  <SelectValue placeholder="Travel" />
                </SelectTrigger>
                <SelectContent className={clsx(contentBase)} position="popper" align="start">
                  {TRAVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      <div className="sm:hidden border-t border-app" aria-hidden="true" />
    </section>
  );
};

export default ArtistFilter;