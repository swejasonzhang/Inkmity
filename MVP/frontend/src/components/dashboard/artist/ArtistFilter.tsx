import React, { useEffect, useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, MapPin, Brush, CircleDollarSign, CalendarDays, X } from "lucide-react";
import clsx from "clsx";

interface Artist {
  _id?: string | number;
  username?: string;
  bio?: string;
  location?: string;
  style?: string[];
  priceRange?: { min: number; max: number };
  yearsExperience?: number | string;
  rating?: number;
  reviewsCount?: number;
  createdAt?: string | number | Date;
  availabilityCode?: "7d" | "lt1m" | "1to3m" | "lte6m" | "waitlist";
  availabilityDays?: number;
  tags?: string[];
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
  onFilteredArtists?: (list: Artist[]) => void;
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
  { value: "amateur", label: "Amateur (0–2 yrs)" },
  { value: "experienced", label: "Experienced (3–5 yrs)" },
  { value: "professional", label: "Professional (6–10 yrs)" },
  { value: "veteran", label: "Veteran (10+ yrs)" },
] as const;

const SORT_OPTIONS = [
  { value: "experience_desc", label: "Most experience" },
  { value: "experience_asc", label: "Least experience" },
  { value: "newest", label: "Newest" },
] as const;

const PRESET_STORAGE_KEY = "inkmity_artist_filters";

const parseRange = (v: string): { min?: number; max?: number } => {
  if (!v || v === "all") return {};
  const s = v.toString().toLowerCase().replace(/\s+/g, "").replace(/years?|yrs?|yoe|exp/g, "").replace(/\u2013|\u2014/g, "-");
  if (s.endsWith("+")) {
    const n = Number(s.replace("+", "").replace(/[^\d]/g, ""));
    return { min: Number.isFinite(n) ? n : undefined, max: Infinity };
  }
  const [aRaw, bRaw] = s.split("-");
  const a = Number(aRaw?.replace(/[^\d]/g, ""));
  const b = Number(bRaw?.replace(/[^\d]/g, ""));
  return { min: Number.isFinite(a) ? a : undefined, max: Number.isFinite(b) ? b : undefined };
};

const normalizeYears = (y: unknown): number | undefined => {
  if (typeof y === "number" && Number.isFinite(y)) return Math.trunc(y);
  if (typeof y === "string") {
    const s = y.toLowerCase().replace(/\s+/g, "").replace(/years?|yrs?|yoe|exp/g, "").replace(/\+$/, "");
    const n = Number(s);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
};

const EXPERIENCE_BOUNDS: Record<"amateur" | "experienced" | "professional" | "veteran", { min: number; max: number }> = {
  amateur: { min: 0, max: 2 },
  experienced: { min: 3, max: 5 },
  professional: { min: 6, max: 10 },
  veteran: { min: 10, max: Infinity },
};

const getExperienceCategory = (value: string | undefined): "all" | "amateur" | "experienced" | "professional" | "veteran" | undefined => {
  if (!value) return undefined;
  const raw = value.toString().trim().toLowerCase();
  if (raw === "all") return "all";
  if (["amateur", "experienced", "professional", "veteran"].includes(raw)) return raw as any;

  const cleaned = raw.replace(/\s+/g, "").replace(/years?|yrs?|yoe|exp/g, "").replace(/\u2013|\u2014/g, "-");
  if (/amateur/.test(raw)) return "amateur";
  if (/experienced/.test(raw)) return "experienced";
  if (/professional/.test(raw)) return "professional";
  if (/veteran/.test(raw)) return "veteran";

  const { min, max } = parseRange(cleaned);
  if (min === 0 && max === 2) return "amateur";
  if (min === 3 && max === 5) return "experienced";
  if (min === 6 && max === 10) return "professional";
  if (min === 10 && max === Infinity) return "veteran";
  return undefined;
};

const inExperience = (artist: Artist, filter: string) => {
  const cat = getExperienceCategory(filter);
  if (!cat || cat === "all") return true;
  const y = normalizeYears(artist.yearsExperience);
  if (y === undefined) return false;
  const { min, max } = EXPERIENCE_BOUNDS[cat];
  return y >= min && y <= max;
};

const inAvailability = (artist: Artist, filter: string) => {
  if (filter === "all") return true;
  if (artist.availabilityCode) return artist.availabilityCode === filter;
  if (typeof artist.availabilityDays === "number") {
    const d = artist.availabilityDays;
    if (filter === "7d") return d <= 7;
    if (filter === "lt1m") return d <= 30;
    if (filter === "1to3m") return d > 30 && d <= 90;
    if (filter === "lte6m") return d <= 180;
    if (filter === "waitlist") return d === Infinity || d < 0;
  }
  return true;
};

const matchesSearch = (artist: Artist, q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [artist.username, artist.bio, artist.location, ...(artist.style ?? []), ...(artist.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(s);
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
  sort,
  setSort,
  artists,
  setCurrentPage,
  searchQuery,
  setSearchQuery,
  className,
  onFilteredArtists,
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
        if (p.experienceFilter) {
          const cat = getExperienceCategory(p.experienceFilter) ?? "all";
          setExperienceFilter(cat);
        }
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      priceFilter,
      locationFilter,
      styleFilter,
      availabilityFilter,
      experienceFilter,
      sort,
      searchQuery,
    };
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(payload));
    } catch { }
  }, [priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, sort, searchQuery]);

  const isDirty = useMemo(
    () =>
      !!(
        localSearch.trim() ||
        (priceFilter && priceFilter !== "all") ||
        (locationFilter && locationFilter !== "all") ||
        (styleFilter && styleFilter !== "all") ||
        (availabilityFilter && availabilityFilter !== "all") ||
        (experienceFilter && experienceFilter !== "all") ||
        (sort && sort !== "experience_desc")
      ),
    [localSearch, priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, sort]
  );

  const filteredSorted = useMemo(() => {
    const q = searchQuery;
    const { min: pMin, max: pMax } = parseRange(priceFilter);
    let list = artists.filter((a) => {
      if (!matchesSearch(a, q)) return false;
      if (locationFilter !== "all" && a.location !== locationFilter) return false;
      if (styleFilter !== "all" && !(a.style ?? []).includes(styleFilter)) return false;

      if (pMin !== undefined || pMax !== undefined) {
        const pr = a.priceRange;
        if (pr) {
          const ok = (pMin === undefined || pr.max >= pMin) && (pMax === undefined || pr.min <= pMax);
          if (!ok) return false;
        }
      }

      if (!inExperience(a, experienceFilter)) return false;
      if (!inAvailability(a, availabilityFilter)) return false;
      return true;
    });

    if (sort === "experience_desc" || sort === "experience_asc") {
      list = list.slice().sort((a, b) => {
        const ay = normalizeYears(a.yearsExperience);
        const by = normalizeYears(b.yearsExperience);
        const av = ay ?? (sort === "experience_desc" ? -Infinity : Infinity);
        const bv = by ?? (sort === "experience_desc" ? -Infinity : Infinity);
        return sort === "experience_desc" ? bv - av : av - bv;
      });
    } else if (sort === "newest") {
      list = list.slice().sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }

    return list;
  }, [artists, availabilityFilter, experienceFilter, locationFilter, priceFilter, searchQuery, sort, styleFilter]);

  useEffect(() => {
    onFilteredArtists?.(filteredSorted);
  }, [filteredSorted, onFilteredArtists]);

  const triggerBase = "h-9 bg-elevated border-app text-app rounded-lg text-sm text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0";
  const contentBase = "bg-card text-app rounded-xl focus:outline-none ring-0 outline-none";
  const itemCentered = "justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0";

  return (
    <div className={clsx("w-full bg-card border border-app rounded-xl shadow-sm", "p-2 sm:p-3", className)} role="region" aria-label="Artist filters">
      <div className="w-full md:overflow-x-auto pb-0.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-nowrap md:min-w-[1470px]">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search artists or tattoos (e.g., dragon, koi, portrait)"
              aria-label="Search artists or tattoo subjects"
              className={clsx("pl-9 pr-9 h-9 w-full bg-elevated border-app text-app rounded-lg", "text-sm", "placeholder:text-muted-foreground")}
            />
          </div>

          <div className="relative w-full sm:w-[260px] sm:shrink-0">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <CircleDollarSign className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select value={priceFilter} onValueChange={(value) => { setPriceFilter(value); setCurrentPage(1); }}>
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

          <div className="relative w-full sm:w-[275px] sm:shrink-0">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <MapPin className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select value={locationFilter} onValueChange={(value) => { setLocationFilter(value); setCurrentPage(1); }}>
              <SelectTrigger className={clsx(triggerBase, "w-full pl-9")}>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent className={clsx(contentBase, "max-h-64 overflow-y-auto")}>
                <SelectItem value="all" className={itemCentered}>All Locations</SelectItem>
                {uniqueLocations.map((loc) => (
                  <SelectItem key={loc} value={loc} className={itemCentered}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-[275px] sm:shrink-0">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Brush className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select value={styleFilter} onValueChange={(value) => { setStyleFilter(value); setCurrentPage(1); }}>
              <SelectTrigger className={clsx(triggerBase, "w-full pl-9")}>
                <SelectValue placeholder="All Styles" />
              </SelectTrigger>
              <SelectContent className={clsx(contentBase, "max-h-64 overflow-y-auto")}>
                <SelectItem value="all" className={itemCentered}>All Styles</SelectItem>
                {uniqueStyles.map((style) => (
                  <SelectItem key={style} value={style} className={itemCentered}>{style}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-[265px] sm:shrink-0">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <Select value={availabilityFilter} onValueChange={(v) => { setAvailabilityFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className={clsx(triggerBase, "w-full pl-9")}>
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent className={contentBase}>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={itemCentered}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-[255px] sm:shrink-0">
            <Select value={experienceFilter} onValueChange={(v) => { setExperienceFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className={clsx(triggerBase, "w-full")}>
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent className={contentBase}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={itemCentered}>{opt.label}</SelectItem>
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
            {sort !== "experience_desc" && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                {SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Sort"}
                <button className="ml-2 inline-flex" onClick={() => setSort("experience_desc")} aria-label="Reset sort">
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
              onClick={() => {
                setLocalSearch("");
                setSearchQuery("");
                setPriceFilter("all");
                setLocationFilter("all");
                setStyleFilter("all");
                setAvailabilityFilter("all");
                setExperienceFilter("all");
                setSort("experience_desc");
                setCurrentPage(1);
                if (typeof window !== "undefined") {
                  localStorage.removeItem(PRESET_STORAGE_KEY);
                }
              }}
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