import { useEffect, useMemo, useState, useRef } from "react";
import ArtistCard from "./ArtistCard";
import ArtistFilter from "./ArtistFilter";
import CircularProgress from "@mui/material/CircularProgress";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Artist } from "@/api";

type Props = {
    artists: Artist[];
    loading: boolean;
    showArtists: boolean;
    onSelectArtist: (a: Artist) => void;
    onRequestCloseModal?: () => void;
    page?: number;
    totalPages?: number;
    onPageChange?: (p: number) => void;
};

const PRESET_STORAGE_KEY = "inkmity_artist_filters";
const ITEMS_PER_PAGE = 12;

const normalizeYears = (y: unknown): number | undefined => {
    if (typeof y === "number" && Number.isFinite(y)) return Math.trunc(y);
    if (typeof y === "string") {
        const n = Number(y.toString().replace(/[^\d]/g, ""));
        if (Number.isFinite(n)) return Math.trunc(n);
    }
    return undefined;
};

const toNumber = (v: unknown, fallback = 0): number => {
    if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
    if (typeof v === "string") {
        const cleaned = v.replace(/[, ]/g, "");
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
};

const matchesExperience = (years: number | undefined, filter: string) => {
    if (filter === "all") return true;
    if (years === undefined) return false;
    if (filter === "amateur") return years >= 0 && years <= 2;
    if (filter === "experienced") return years >= 3 && years <= 5;
    if (filter === "professional") return years >= 6 && years <= 10;
    if (filter === "veteran") return years >= 10;
    return true;
};

export default function ArtistsSection({
    artists,
    loading,
    showArtists,
    onSelectArtist,
    onRequestCloseModal,
    page,
    totalPages,
    onPageChange
}: Props) {
    const initialPreset: Partial<{
        priceFilter: string;
        locationFilter: string;
        styleFilter: string;
        availabilityFilter: string;
        experienceFilter: string;
        bookingFilter: string;
        travelFilter: string;
        sort: string;
        searchQuery: string;
    }> =
        typeof window !== "undefined"
            ? (() => {
                try {
                    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
                    return raw ? JSON.parse(raw) : {};
                } catch {
                    return {};
                }
            })()
            : {};

    const [priceFilter, setPriceFilter] = useState<string>(initialPreset.priceFilter ?? "all");
    const [locationFilter, setLocationFilter] = useState<string>(initialPreset.locationFilter ?? "all");
    const [styleFilter, setStyleFilter] = useState<string>(initialPreset.styleFilter ?? "all");
    const [availabilityFilter, setAvailabilityFilter] = useState<string>(initialPreset.availabilityFilter ?? "all");
    const [experienceFilter, setExperienceFilter] = useState<string>(initialPreset.experienceFilter ?? "all");
    const [bookingFilter, setBookingFilter] = useState<string>(initialPreset.bookingFilter ?? "all");
    const [travelFilter, setTravelFilter] = useState<string>(initialPreset.travelFilter ?? "all");
    const [sort, setSort] = useState<string>(initialPreset.sort || "experience_desc");
    const [searchQuery, setSearchQuery] = useState<string>(typeof initialPreset.searchQuery === "string" ? initialPreset.searchQuery : "");
    const [debouncedSearch, setDebouncedSearch] = useState<string>((typeof initialPreset.searchQuery === "string" ? initialPreset.searchQuery : "").trim().toLowerCase());
    const [currentPage, setCurrentPage] = useState(1);

    const usingExternalPaging = typeof page === "number" && typeof totalPages === "number" && typeof onPageChange === "function";

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
            searchQuery
        };
        try {
            localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(payload));
        } catch { }
    }, [priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, bookingFilter, travelFilter, sort, searchQuery]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const filtered = useMemo(() => {
        const now = new Date();
        const inAvailability = (a: Artist) => {
            const isNow = (a as any).isAvailableNow === true;
            const nextRaw = (a as any).nextAvailableDate as string | undefined;
            const waitlist = (a as any).acceptingWaitlist === true || (a as any).isClosed === true;
            if (availabilityFilter === "waitlist") return waitlist;
            const next = nextRaw ? new Date(nextRaw) : null;
            if (!next && !isNow) {
                if (availabilityFilter === "all") return true;
                return false;
            }
            const msDay = 24 * 60 * 60 * 1000;
            const diffDays = isNow ? 0 : Math.ceil(((next as Date).getTime() - now.getTime()) / msDay);
            if (availabilityFilter === "all") return true;
            if (availabilityFilter === "7d") return diffDays <= 7;
            if (availabilityFilter === "lt1m") return diffDays <= 30;
            if (availabilityFilter === "1to3m") return diffDays > 30 && diffDays <= 90;
            if (availabilityFilter === "lte6m") return diffDays <= 180;
            return true;
        };
        const inPriceRange = (_a: Artist) => {
            if (priceFilter === "all") return true;
            return true;
        };
        const matchesKeyword = (a: Artist, q: string) => {
            if (!q) return true;
            const styles = Array.isArray((a as any).styles) ? (a as any).styles : [];
            const bio = (a as any).bio as string | undefined;
            return (
                a.username?.toLowerCase().includes(q) ||
                (a as any).location?.toLowerCase().includes(q) ||
                (bio ? bio.toLowerCase().includes(q) : false) ||
                styles.some((s: string) => s.toLowerCase().includes(q))
            );
        };
        const matchesBooking = (a: Artist, v: string) => {
            if (!v || v === "all") return true;
            const booking = ((a as any).bookingPreference ?? "").toString();
            return booking === v;
        };
        const matchesTravel = (a: Artist, v: string) => {
            if (!v || v === "all") return true;
            const travel = ((a as any).travelFrequency ?? "").toString();
            return travel === v;
        };
        let list = artists.filter((a) => {
            if (!inPriceRange(a)) return false;
            if (!(locationFilter === "all" || (a as any).location === locationFilter)) return false;
            const styles = Array.isArray((a as any).styles) ? (a as any).styles : [];
            if (!(styleFilter === "all" || styles.includes(styleFilter))) return false;
            if (!matchesKeyword(a, debouncedSearch)) return false;
            if (!inAvailability(a)) return false;
            const y = normalizeYears((a as any).yearsExperience);
            if (!matchesExperience(y, experienceFilter)) return false;
            if (!matchesBooking(a, bookingFilter)) return false;
            if (!matchesTravel(a, travelFilter)) return false;
            return true;
        });
        if (sort === "experience_desc" || sort === "experience_asc") {
            list = list.slice().sort((a, b) => {
                const ay = normalizeYears((a as any).yearsExperience);
                const by = normalizeYears((b as any).yearsExperience);
                const av = ay ?? (sort === "experience_desc" ? -Infinity : Infinity);
                const bv = by ?? (sort === "experience_desc" ? -Infinity : Infinity);
                return sort === "experience_desc" ? bv - av : av - bv;
            });
        } else if (sort === "newest") {
            list = list.slice().sort((a, b) => new Date((b as any).createdAt ?? 0).getTime() - new Date((a as any).createdAt ?? 0).getTime());
        } else if (sort === "highest_rated") {
            list = list.slice().sort((a, b) => {
                const ar = toNumber((a as any).rating, 0);
                const br = toNumber((b as any).rating, 0);
                if (br !== ar) return br - ar;
                const arv = toNumber((a as any).reviewsCount, 0);
                const brv = toNumber((b as any).reviewsCount, 0);
                return brv - arv;
            });
        } else if (sort === "most_reviews") {
            list = list.slice().sort((a, b) => {
                const arv = toNumber((a as any).reviewsCount, 0);
                const brv = toNumber((b as any).reviewsCount, 0);
                if (brv !== arv) return brv - arv;
                const ar = toNumber((a as any).rating, 0);
                const br = toNumber((b as any).rating, 0);
                return br - ar;
            });
        }
        return list;
    }, [artists, priceFilter, locationFilter, styleFilter, debouncedSearch, availabilityFilter, experienceFilter, bookingFilter, travelFilter, sort]);

    const clientPageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const listItems = usingExternalPaging ? filtered : clientPageItems;
    const isCenterLoading = loading || !showArtists;

    const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!onRequestCloseModal) return;
        const target = e.target as HTMLElement;
        const interactive = target.closest('button,a,[role="button"],input,textarea,select,[data-keep-open="true"]');
        if (interactive) return;
        const insideCard = target.closest('[data-artist-card="true"]');
        if (insideCard) return;
        onRequestCloseModal();
    };

    const filterRef = useRef<HTMLDivElement | null>(null);
    const [filterH, setFilterH] = useState(0);
    const [isSmUp, setIsSmUp] = useState(false);
    const [isMdUp, setIsMdUp] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const sm = window.matchMedia("(min-width: 640px)");
        const md = window.matchMedia("(min-width: 768px)");
        const onChange = () => {
            setIsSmUp(sm.matches);
            setIsMdUp(md.matches);
        };
        onChange();
        sm.addEventListener?.("change", onChange);
        md.addEventListener?.("change", onChange);
        return () => {
            sm.removeEventListener?.("change", onChange);
            md.removeEventListener?.("change", onChange);
        };
    }, []);

    useEffect(() => {
        if (!filterRef.current) return;
        const ro = new ResizeObserver(() => {
            setFilterH(filterRef.current?.offsetHeight || 0);
        });
        ro.observe(filterRef.current);
        setFilterH(filterRef.current.offsetHeight || 0);
        return () => ro.disconnect();
    }, []);

    const cardMinRem = isMdUp ? 51.25 : isSmUp ? 46.25 : 38;
    const cardMinPx = Math.round(cardMinRem * 16);
    const gridVPadPx = isMdUp ? 24 : 0;
    const sectionMinPx = (isMdUp ? filterH : 0) + cardMinPx + gridVPadPx;
    const minGridPx = cardMinPx + gridVPadPx;

    const snapHeight = "100%";
    const mobileListRef = useRef<HTMLDivElement | null>(null);
    const lastTouchYRef = useRef<number | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const lastIndex = Math.max(0, (usingExternalPaging ? filtered : clientPageItems).length - 1);

    const handleMobileScroll = () => {
        const el = mobileListRef.current;
        if (!el) return;
        const h = el.clientHeight || 1;
        const idx = Math.round(el.scrollTop / h);
        const clampedIdx = Math.max(0, Math.min(idx, lastIndex));
        setCurrentIndex(clampedIdx);
        const maxTop = lastIndex * h;
        if (clampedIdx >= lastIndex && el.scrollTop > maxTop) {
            el.scrollTop = maxTop;
        }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        lastTouchYRef.current = e.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        const el = mobileListRef.current;
        if (!el) return;
        const lastY = lastTouchYRef.current;
        const y = e.touches[0]?.clientY ?? null;
        if (lastY == null || y == null) return;
        const dy = y - lastY;
        const atLast = currentIndex >= lastIndex;
        if (atLast && dy < 0) {
            e.preventDefault();
            e.stopPropagation();
            const h = el.clientHeight || 1;
            el.scrollTop = lastIndex * h;
        }
    };

    const scrollToIndex = (index: number) => {
        const el = mobileListRef.current;
        if (!el) return;
        const h = el.clientHeight || 1;
        const targetIndex = Math.max(0, Math.min(index, lastIndex));
        el.scrollTo({ top: targetIndex * h, behavior: "smooth" });
        setCurrentIndex(targetIndex);
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            scrollToIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < lastIndex) {
            scrollToIndex(currentIndex + 1);
        }
    };

    const atStart = currentIndex === 0;
    const atEnd = currentIndex >= lastIndex;

    return (
        <div className="md:grid md:grid-rows-[auto,1fr] md:h-full md:min-h-0 w-full h-full flex flex-col md:flex-none" style={{ minHeight: window.innerWidth < 768 ? undefined : `${sectionMinPx}px` }}>
            <div ref={filterRef} className="w-full bg-card px-0 pb-3 md:px-3 md:pb-4 shrink-0 hidden md:block">
                <ArtistFilter
                    priceFilter={priceFilter}
                    setPriceFilter={(v) => {
                        setPriceFilter(v);
                        setCurrentPage(1);
                    }}
                    locationFilter={locationFilter}
                    setLocationFilter={(v) => {
                        setLocationFilter(v);
                        setCurrentPage(1);
                    }}
                    styleFilter={styleFilter}
                    setStyleFilter={(v) => {
                        setStyleFilter(v);
                        setCurrentPage(1);
                    }}
                    availabilityFilter={availabilityFilter}
                    setAvailabilityFilter={(v) => {
                        setAvailabilityFilter(v);
                        setCurrentPage(1);
                    }}
                    experienceFilter={experienceFilter}
                    setExperienceFilter={(v) => {
                        setExperienceFilter(v);
                        setCurrentPage(1);
                    }}
                    bookingFilter={bookingFilter}
                    setBookingFilter={(v) => {
                        setBookingFilter(v);
                        setCurrentPage(1);
                    }}
                    travelFilter={travelFilter}
                    setTravelFilter={(v) => {
                        setTravelFilter(v);
                        setCurrentPage(1);
                    }}
                    sort={sort}
                    setSort={(v) => {
                        setSort(v);
                        setCurrentPage(1);
                    }}
                    artists={artists}
                    setCurrentPage={setCurrentPage}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    className="shrink-0"
                />
            </div>

            <div className="flex-1 min-h-0" onPointerDownCapture={handleGridPointerDown}>
                {isCenterLoading && (
                    <div className="absolute inset-0 z-10 grid place-items-center">
                        <CircularProgress sx={{ color: "var(--fg)" }} />
                    </div>
                )}

                <div
                    className={`${isCenterLoading ? "opacity-0 pointer-events-none" : ""} md:h-full md:min-h-0 h-full`}
                    style={{ minHeight: listItems.length >= 4 && isMdUp ? `${minGridPx}px` : "auto" }}
                >
                    <div className="md:hidden relative" style={{ height: "100%", paddingBottom: "14px", boxSizing: "border-box" }}>
                        {listItems.length > 0 ? (
                            <>
                                <div
                                    ref={mobileListRef}
                                    className={`h-full ${listItems.length <= 1 ? "overflow-hidden" : "overflow-y-auto"} snap-y snap-mandatory overscroll-contain`}
                                    style={{ scrollSnapType: "y mandatory" }}
                                    onScroll={handleMobileScroll}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                >
                                    {listItems.map((artist, index) => {
                                        const artistData = artist as any;
                                        const transformedArtist = {
                                            ...artistData,
                                            profileImage: artistData.profileImage || artistData.avatar?.url || undefined,
                                            avatarUrl: artistData.avatarUrl || artistData.avatar?.url || undefined,
                                        };
                                        return (
                                            <div
                                                key={`${artistData.clerkId ?? artistData._id}:${index}`}
                                                className="snap-start h-full flex items-center justify-center"
                                                style={{ height: snapHeight, scrollSnapStop: "always" }}
                                            >
                                                <ArtistCard artist={transformedArtist} onClick={() => onSelectArtist(artist)} fullScreen />
                                            </div>
                                        );
                                    })}
                                </div>
                                {listItems.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10 pointer-events-none">
                                        <Button
                                            type="button"
                                            onClick={handlePrev}
                                            disabled={atStart}
                                            className="pointer-events-auto rounded-full h-12 w-12 p-0 shadow-lg"
                                            style={{
                                                borderColor: "var(--border)",
                                                backgroundColor: atStart ? "color-mix(in oklab, var(--elevated) 60%, transparent)" : "color-mix(in oklab, var(--card) 95%, transparent)",
                                                color: "var(--fg)",
                                                opacity: atStart ? 0.5 : 1,
                                            }}
                                            aria-label="Previous artist"
                                        >
                                            <ChevronUp className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleNext}
                                            disabled={atEnd}
                                            className="pointer-events-auto rounded-full h-12 w-12 p-0 shadow-lg"
                                            style={{
                                                borderColor: "var(--border)",
                                                backgroundColor: atEnd ? "color-mix(in oklab, var(--elevated) 60%, transparent)" : "color-mix(in oklab, var(--card) 95%, transparent)",
                                                color: "var(--fg)",
                                                opacity: atEnd ? 0.5 : 1,
                                            }}
                                            aria-label="Next artist"
                                        >
                                            <ChevronDown className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full min-h-0 overflow-y-auto snap-y snap-mandatory overscroll-contain" style={{ scrollSnapType: "y mandatory" }}>
                                <div className="snap-start px-3 sm:px-0 flex items-center justify-center" style={{ height: snapHeight, scrollSnapStop: "always" }}>
                                    <div className="text-center px-4">
                                        <p className="text-base font-medium" style={{ color: "var(--fg)" }}>No artists match your filters.</p>
                                        <p className="text-sm mt-1" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>Try adjusting filters or keywords.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`hidden md:block h-full min-h-0 ${listItems.length >= 4 ? "overflow-y-auto" : "overflow-hidden"}`}>
                        {listItems.length > 0 ? (
                            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-[minmax(0,1fr)] gap-1 p-0 md:gap-5 md:p-3 ${listItems.length >= 4 ? "md:pb-20" : ""}`} style={{ minHeight: listItems.length >= 4 ? `${minGridPx}px` : "auto" }}>
                                {listItems.map((artist, index) => {
                                    const artistData = artist as any;
                                    const transformedArtist = {
                                        ...artistData,
                                        images: artistData.portfolioImages || [],
                                        profileImage: artistData.profileImage || artistData.avatar?.url || undefined,
                                        avatarUrl: artistData.avatarUrl || artistData.avatar?.url || undefined,
                                    };
                                    return (
                                        <motion.div
                                            key={`${artistData.clerkId ?? artistData._id}:${index}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className="h-full flex"
                                        >
                                            <div className="h-full w-full flex" data-artist-card="true">
                                                <ArtistCard artist={transformedArtist} onClick={() => onSelectArtist(artist)} />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="min-h-full p-0 md:p-3" style={{ minHeight: `${minGridPx}px`, height: `${minGridPx}px` }}>
                                <div className="w-full h-full grid place-items-center">
                                    <div className="text-center max-w-prose">
                                        <p className="text-lg font-semibold" style={{ color: "var(--fg)" }}>No artists match your filters.</p>
                                        <p className="text-sm mt-1.5" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                            Try adjusting filters or keywords to broaden your search.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}