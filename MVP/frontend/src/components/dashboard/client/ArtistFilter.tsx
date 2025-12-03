import React, { useEffect, useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
const LEGACY_THEME_KEY = "dashboard-theme";
const THEME_NS = `${LEGACY_THEME_KEY}::`;
const GUEST_THEME_KEY = `${THEME_NS}guest`;

function readInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  try {
    const a = localStorage.getItem(LEGACY_THEME_KEY);
    const b = localStorage.getItem(GUEST_THEME_KEY);
    if (a === "light" || a === "dark") return a;
    if (b === "light" || b === "dark") return b;
  } catch { }
  return "dark";
}

function themeVarsSnapshot(t: "light" | "dark"): React.CSSProperties {
  if (t === "light") {
    return {
      "--bg": "#ffffff",
      "--fg": "#111111",
      "--card": "#ffffff",
      "--border": "rgba(17, 17, 17, 0.16)",
      "--elevated": "rgba(0, 0, 0, 0.06)",
      "--muted": "rgba(17, 17, 17, 0.56)",
      "--subtle": "rgba(17, 17, 17, 0.72)",
      "--background": "0 0% 100%",
      "--foreground": "0 0% 7%",
      "--card-h": "0 0% 98%",
      "--border-h": "0 0% 12% / 0.16",
    } as React.CSSProperties;
  }
  return {
    "--bg": "#0b0b0b",
    "--fg": "#f5f5f5",
    "--card": "#111111",
    "--border": "rgba(245, 245, 245, 0.2)",
    "--elevated": "rgba(255, 255, 255, 0.06)",
    "--muted": "rgba(245, 245, 245, 0.56)",
    "--subtle": "rgba(245, 245, 245, 0.72)",
    "--background": "0 0% 4%",
    "--foreground": "0 0% 96%",
    "--card-h": "0 0% 7%",
    "--border-h": "0 0% 76% / 0.2",
  } as React.CSSProperties;
}

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
  const [noFlash, setNoFlash] = useState(true);
  const initialTheme = useMemo(readInitialTheme, []);
  const inlineTheme = noFlash ? { ...themeVarsSnapshot(initialTheme), transition: "none" } : undefined;

  useEffect(() => {
    const off = () => setNoFlash(false);
    const id = window.requestAnimationFrame(off);
    const onBus = (e: Event) => {
      if ((e as CustomEvent).detail?.key === LEGACY_THEME_KEY) off();
    };
    window.addEventListener("ink:theme-change", onBus as EventListener);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("ink:theme-change", onBus as EventListener);
    };
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const scope = (document.getElementById("ink-root") || document.querySelector<HTMLElement>(".ink-scope")) ?? document.documentElement;
    const root = document.documentElement;
    const vars = [
      "--background",
      "--foreground",
      "--card",
      "--card-h",
      "--card-foreground",
      "--popover",
      "--popover-foreground",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--secondary-foreground",
      "--muted",
      "--muted2",
      "--muted-foreground",
      "--accent",
      "--accent-h",
      "--accent-foreground",
      "--border",
      "--border-h",
      "--input",
      "--ring",
      "--bg",
      "--fg",
      "--subtle",
      "--elevated",
    ];
    const apply = () => {
      const cs = getComputedStyle(scope);
      vars.forEach((v) => {
        const val = cs.getPropertyValue(v);
        if (val) root.style.setProperty(v, val);
      });
      root.setAttribute("data-ink-theme-ts", String(Date.now()));
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(scope, { attributes: true, attributeFilter: ["class", "style"] });
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onScheme = () => apply();
    mql?.addEventListener?.("change", onScheme);
    window.addEventListener("storage", apply);
    return () => {
      mo.disconnect();
      mql?.removeEventListener?.("change", onScheme);
      window.removeEventListener("storage", apply);
    };
  }, []);

  const triggerBase = "h-10 sm:h-14 bg-elevated border-app text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0";
  const contentBase = "bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto data-[state=open]:animate-in";
  const itemCentered = "justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0";
  const FILTER_W = "w-full sm:w-[260px] sm:shrink-0";
  const SEARCH_W = "w-full sm:flex-1 sm:min-w-[320px]";

  return (
    <section
      className={clsx(
        "w-full bg-card border-b border-app mb-3",
        "sm:border sm:rounded-xl sm:shadow-sm sm:mb-0",
        "mx-auto overflow-visible",
        className
      )}
      role="region"
      aria-label="Artist filters"
      style={inlineTheme}
    >
      <div className="sm:hidden border-t border-app" aria-hidden="true" />
      <div className="w-full mx-auto overflow-visible">
        <div className="p-2 sm:p-3 overflow-visible">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-nowrap sm:items-center sm:justify-center sm:gap-3 w-full overflow-visible">
            <div className={clsx("relative col-span-2 sm:col-span-1", SEARCH_W, "sm:mr-2")}>
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search artists or tattoo subjects"
                className={clsx(
                  "px-3 sm:px-4",
                  "h-[34px] sm:h-[39px] w-full bg-elevated border-app text-app rounded-lg",
                  "text-xs sm:text-sm placeholder:text-muted-foreground",
                  "outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-app/80",
                  "selection:bg-elevated selection:text-app",
                  "caret-[var(--fg)]",
                  "text-left sm:text-center"
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
                  "h-[34px] w-full bg-elevated border border-app text-app rounded-lg",
                  "text-xs px-3 outline-none ring-0 focus:ring-0 focus-visible:ring-0"
                )}
              >
                {showMobileFilters ? "Hide Filters" : "Show Filters"}
              </button>
            </div>

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
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

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
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

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
              <Select
                value={styleFilter}
                onValueChange={(value) => {
                  setStyleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
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

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
              <Select
                value={availabilityFilter}
                onValueChange={(v) => {
                  setAvailabilityFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
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

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
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

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
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

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
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

            <div className={clsx("relative col-span-1 overflow-visible", FILTER_W, showMobileFilters ? "block" : "hidden", "sm:block")}>
              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className={clsx(triggerBase, "w-full px-4")}>
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
          </div>
        </div>
      </div>
      <div className="sm:hidden border-t border-app" aria-hidden="true" />
    </section>
  );
};

export default ArtistFilter;