import { useEffect, useMemo, useState, useRef } from "react";
import ArtistFilter from "./ArtistFilter";
import LazyReveal from "@/components/ui/LazyReveal";
import HScroll from "@/components/ui/HScroll";
import { Search } from "lucide-react";
import type { Artist } from "@/api";

type Props = {
    artists: Artist[];
    loading: boolean;
    showArtists: boolean;
    onSelectArtist: (a: Artist) => void;
    onRequestCloseModal?: () => void;
};

const PRESET_STORAGE_KEY = "inkmity_artist_filters";
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const OTHER_STYLE = "Other styles";

const EmptyArtists = () => (
    <div className="h-full w-full grid place-items-center p-6">
        <div className="flex flex-col items-center text-center gap-3 max-w-sm">
            <span className="grid place-items-center h-12 w-12 rounded-2xl border border-app/40 bg-elevated">
                <Search className="h-5 w-5 text-subtle" />
            </span>
            <p className="font-semibold text-app" style={{ fontSize: 'clamp(1rem, 1.2vmin + 0.6vw, 1.125rem)' }}>
                No artists to show yet
            </p>
            <p className="text-subtle text-sm leading-relaxed">
                Tip: try clearing a filter or widening your search — new artists join Inkmity all the time.
            </p>
        </div>
    </div>
);

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

// Image-forward card for the style carousels: leads with the artist's featured
// work, then name + styles. Falls back gracefully when there are no images.
const ArtistCarouselCard = ({ artist, onClick, fill = false }: { artist: any; onClick: () => void; fill?: boolean }) => {
    const featured: string[] = [
        ...(artist.portfolioImages || []),
        ...(artist.pastWorks || []),
        ...(artist.healedWorks || []),
    ].filter(Boolean).slice(0, 4);
    const avatar = artist.profileImage || artist.avatarUrl || artist.avatar?.url;
    const styles: string[] = (Array.isArray(artist.styles) ? artist.styles : []).filter(Boolean).slice(0, 3);
    const rating = Number(artist.rating ?? 0);
    const single = featured.length === 1;

    return (
        <button
            type="button"
            onClick={onClick}
            data-artist-card="true"
            className="w-full h-full text-left rounded-2xl border border-app bg-card overflow-hidden flex flex-col group transition hover:border-app/80"
            aria-label={`View ${artist.username}`}
        >
            <div
                className={`relative w-full bg-elevated grid gap-0.5 ${fill ? "flex-1 min-h-0" : "aspect-[4/3]"} ${single ? "grid-cols-1" : "grid-cols-2 grid-rows-2"}`}
            >
                {featured.length > 0 ? (
                    featured.map((src, i) => (
                        <div key={i} className="relative overflow-hidden">
                            <img
                                src={src}
                                alt={`${artist.username} work ${i + 1}`}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                            />
                        </div>
                    ))
                ) : (
                    <div className="grid place-items-center text-subtle text-xs">No work yet</div>
                )}
            </div>

            <div className="flex-1 min-h-0 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full border border-app bg-elevated overflow-hidden text-xs font-bold">
                        {avatar ? (
                            <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            (artist.username?.[0] || "A").toUpperCase()
                        )}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold leading-tight">{artist.username}</span>
                        {rating > 0 && (
                            <span className="text-[11px] text-subtle">★ {rating.toFixed(1)}{artist.reviewsCount ? ` (${artist.reviewsCount})` : ""}</span>
                        )}
                    </span>
                </div>
                {styles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto">
                        {styles.map((s) => (
                            <span key={s} className="rounded-full border border-app/50 bg-elevated px-2 py-0.5 text-[10px] text-subtle">
                                {cap(s)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
};

export default function ArtistsSection({
    artists,
    loading,
    showArtists,
    onSelectArtist,
    onRequestCloseModal,
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
    // Filters no longer reset a page (single scrolling feed); kept as a no-op so
    // the shared ArtistFilter prop contract stays the same.
    const setCurrentPage = (_page: number) => {};

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

    // Group artists into a section per style (an artist can appear in several).
    const sections = useMemo(() => {
        const map = new Map<string, Artist[]>();
        for (const a of filtered) {
            const styles = (Array.isArray((a as any).styles) ? (a as any).styles : []).filter(Boolean);
            const keys = styles.length ? styles.map((s: string) => cap(s)) : [OTHER_STYLE];
            for (const s of keys) {
                if (!map.has(s)) map.set(s, []);
                map.get(s)!.push(a);
            }
        }
        return [...map.entries()]
            .sort((a, b) => (a[0] === OTHER_STYLE ? 1 : b[0] === OTHER_STYLE ? -1 : a[0].localeCompare(b[0])))
            .map(([style, list]) => ({ style, items: list }));
    }, [filtered]);
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
    const [isMdUp, setIsMdUp] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const md = window.matchMedia("(min-width: 768px)");
        const onChange = () => {
            setIsMdUp(md.matches);
        };
        onChange();
        md.addEventListener?.("change", onChange);
        return () => {
            md.removeEventListener?.("change", onChange);
        };
    }, []);

    return (
        <div className={`${isMdUp ? "grid grid-rows-[auto,1fr]" : "flex flex-col"} h-full min-h-0 w-full`}>
            <div ref={filterRef} data-artist-filter className="w-full bg-card shrink-0 hidden md:block" style={{ padding: '0' }}>
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

            <div className="relative flex-1 min-h-0" onPointerDownCapture={handleGridPointerDown}>
                <LazyReveal
                    loading={isCenterLoading}
                    className="h-full"
                    skeleton={
                        <div className="h-full w-full">
                            {/* Desktop: style rows of card skeletons */}
                            <div className="hidden md:block px-1 py-2 space-y-8">
                                {Array.from({ length: 2 }).map((_, s) => (
                                    <div key={s}>
                                        <div className="ink-shimmer h-5 w-40 rounded mb-3" />
                                        <div className="flex gap-3 overflow-hidden">
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <div key={i} className="shrink-0 w-56 sm:w-60 md:w-64 h-[19rem] sm:h-[20rem] rounded-2xl ink-shimmer" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Mobile: one full-screen section skeleton */}
                            <div className="md:hidden h-full w-full flex flex-col px-3 py-2">
                                <div className="ink-shimmer h-5 w-32 rounded mb-2 shrink-0" />
                                <div className="flex-1 min-h-0 ink-shimmer rounded-2xl" />
                            </div>
                        </div>
                    }
                >
                    {/* Desktop: vertical scroll of horizontal style carousels */}
                    <div data-artist-scroll className="hidden md:block h-full min-h-0 overflow-y-auto px-1 pt-2 pb-24">
                        {sections.length === 0 ? (
                            <EmptyArtists />
                        ) : (
                            <div className="space-y-8">
                                {sections.map(({ style, items }) => (
                                    <section key={style}>
                                        <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
                                            <h2 className="text-base sm:text-lg font-bold tracking-tight">{style}</h2>
                                            <span className="text-xs text-subtle">
                                                {items.length} {items.length === 1 ? "artist" : "artists"}
                                            </span>
                                        </div>
                                        <HScroll>
                                            {items.map((artist, index) => (
                                                <div
                                                    key={`${(artist as any).clerkId ?? (artist as any)._id}:${index}`}
                                                    className="snap-start shrink-0 w-56 sm:w-60 md:w-64 h-[19rem] sm:h-[20rem]"
                                                >
                                                    <ArtistCarouselCard artist={artist} onClick={() => onSelectArtist(artist)} />
                                                </div>
                                            ))}
                                        </HScroll>
                                    </section>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Mobile: full-screen sections — swipe up/down = styles, left/right = artists */}
                    <div
                        className="md:hidden h-full w-full overflow-y-auto snap-y snap-mandatory overscroll-contain"
                        style={{ WebkitOverflowScrolling: "touch" }}
                    >
                        {sections.length === 0 ? (
                            <div className="h-full w-full"><EmptyArtists /></div>
                        ) : (
                            sections.map(({ style, items }) => (
                                <section key={style} className="h-full w-full snap-start snap-always flex flex-col">
                                    <div className="shrink-0 px-3 pt-2 pb-1.5 flex items-baseline justify-between">
                                        <h2 className="text-base font-bold tracking-tight">{style}</h2>
                                        <span className="text-xs text-subtle">
                                            {items.length} {items.length === 1 ? "artist" : "artists"}
                                        </span>
                                    </div>
                                    <div
                                        className="flex-1 min-h-0 w-full flex overflow-x-auto snap-x snap-mandatory overscroll-contain"
                                        style={{ WebkitOverflowScrolling: "touch" }}
                                    >
                                        {items.map((artist, index) => (
                                            <div
                                                key={`${(artist as any).clerkId ?? (artist as any)._id}:${index}`}
                                                className="snap-start snap-always shrink-0 w-full h-full px-3 pb-16 flex"
                                            >
                                                <ArtistCarouselCard artist={artist} onClick={() => onSelectArtist(artist)} fill />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                </LazyReveal>
            </div>
        </div>
    );
}