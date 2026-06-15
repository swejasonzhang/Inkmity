import { useEffect, useMemo, useRef, useState } from "react";
import ArtistFilter from "./ArtistFilter";
import LazyReveal from "@/components/ui/LazyReveal";
import HScroll, { type HScrollHandle } from "@/components/ui/HScroll";
import { Search, ChevronsDown, ChevronLeft, ChevronRight, MapPin, Clock, Building2, ArrowRight } from "lucide-react";
import VerifiedBadge from "@/components/dashboard/shared/VerifiedBadge";
import { titleCase } from "@/lib/format";
import type { Artist } from "@/api";

type Props = {
    artists: Artist[];
    loading: boolean;
    showArtists: boolean;
    onSelectArtist: (a: Artist) => void;
    onRequestCloseModal?: () => void;
};

const PRESET_STORAGE_KEY = "inkmity_artist_filters";
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

const ArtistCarouselCard = ({ artist, onClick, fill = false }: { artist: any; onClick: () => void; fill?: boolean }) => {
    const all: string[] = [
        ...(artist.portfolioImages || []),
        ...(artist.pastWorks || []),
        ...(artist.healedWorks || []),
    ].filter(Boolean);
    const recent = all.slice(-3).reverse();
    const basisClass = recent.length === 1 ? "basis-full" : recent.length === 2 ? "basis-1/2" : "basis-1/3";
    const avatar = artist.profileImage || artist.avatarUrl || artist.avatar?.url;
    const styles: string[] = (Array.isArray(artist.styles) ? artist.styles : []).filter(Boolean).slice(0, 3);
    const rating = Number(artist.rating ?? 0);
    const years = Number(artist.yearsExperience ?? 0);
    const studio = artist.shop || artist.studio;
    const location = artist.location;
    const imgCls = "h-full w-full object-cover";

    return (
        <button
            type="button"
            onClick={onClick}
            data-artist-card="true"
            className="w-full h-full text-left rounded-2xl border border-app bg-card overflow-hidden flex flex-col group transition hover:border-app/80"
            aria-label={`View ${artist.username}`}
        >
            <div className={`relative w-full bg-elevated ${fill ? "flex-1 min-h-0" : "aspect-[4/3]"}`}>
                {recent.length > 0 ? (
                    <div className="ink-art-imgs group/imgs absolute inset-0 flex gap-0.5">
                        {recent.map((src, i) => (
                            <div
                                key={i}
                                className={`relative overflow-hidden ${basisClass} grow-0 shrink min-w-0 will-change-[flex-basis] group-hover/imgs:basis-0 hover:!basis-full`}
                                style={{ transition: "flex-basis 450ms cubic-bezier(0.33, 1, 0.68, 1)" }}
                            >
                                <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={imgCls} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="absolute inset-0 grid place-items-center text-subtle text-xs">No work yet</div>
                )}
            </div>

            <div className={`${fill ? "shrink-0" : "flex-1 min-h-0"} p-3 flex flex-col gap-1.5`}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full border border-app bg-elevated overflow-hidden text-xs font-bold">
                        {avatar ? (
                            <img src={avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            (artist.username?.[0] || "A").toUpperCase()
                        )}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 min-w-0">
                            <span className="truncate text-sm font-bold leading-tight">{artist.username}</span>
                            {(Number((artist as any).bookingsCount) || 0) >= 5 && <VerifiedBadge size={14} className="shrink-0" />}
                        </span>
                        {rating > 0 && (
                            <span className="text-[11px] text-subtle">★ {rating.toFixed(1)}{artist.reviewsCount ? ` (${artist.reviewsCount})` : ""}</span>
                        )}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold bg-[color:var(--fg)] text-[color:var(--bg)] group-hover:opacity-90 transition">
                        View <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                </div>

                <div className="flex flex-col gap-0.5 text-[11px] text-subtle">
                    {location && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{location}</span>
                        </span>
                    )}
                    {years > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" /> {years} yrs experience
                        </span>
                    )}
                    {studio && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                            <Building2 className="h-3 w-3 shrink-0" /> <span className="truncate">{studio}</span>
                        </span>
                    )}
                </div>

                {styles.length > 0 && (
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5 mt-auto pt-0.5">
                        {styles.map((s) => (
                            <span key={s} className="rounded-full border border-app/50 bg-elevated px-1.5 py-0.5 text-[10px] text-subtle">
                                {titleCase(s)}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
};

const StyleRow = ({
    style,
    items,
    onSelect,
    onViewAll,
}: {
    style: string;
    items: any[];
    onSelect: (a: any) => void;
    onViewAll: () => void;
}) => {
    const ref = useRef<HScrollHandle>(null);
    const arrowCls = "grid place-items-center h-7 w-7 rounded-full border border-app bg-card text-app hover:bg-elevated transition disabled:opacity-40";
    return (
        <section>
            <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
                <div className="flex items-baseline gap-2 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">{style}</h2>
                    <span className="text-xs text-subtle shrink-0">{items.length}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={onViewAll}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-app hover:underline underline-offset-2"
                    >
                        View all <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Scroll left" className={arrowCls} onClick={() => ref.current?.scrollByDir(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Scroll right" className={arrowCls} onClick={() => ref.current?.scrollByDir(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <HScroll ref={ref}>
                {items.map((artist, index) => (
                    <div
                        key={`${(artist as any).clerkId ?? (artist as any)._id}:${index}`}
                        className="shrink-0 w-full sm:w-[calc((100%_-_0.75rem)/2)] md:w-[calc((100%_-_1.5rem)/3)] lg:w-[calc((100%_-_2.25rem)/4)] h-[23rem]"
                    >
                        <ArtistCarouselCard artist={artist} onClick={() => onSelect(artist)} fill />
                    </div>
                ))}
            </HScroll>
        </section>
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

    const sections = useMemo(() => {
        const map = new Map<string, Artist[]>();
        for (const a of filtered) {
            const styles = (Array.isArray((a as any).styles) ? (a as any).styles : []).filter(Boolean);
            const keys = styles.length ? styles.map((s: string) => titleCase(s)) : [OTHER_STYLE];
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
    const [viewAllStyle, setViewAllStyle] = useState<string | null>(null);
    const viewAllItems = viewAllStyle ? sections.find((s) => s.style === viewAllStyle)?.items ?? [] : [];

    const [reloading, setReloading] = useState(false);
    const reloadInit = useRef(true);
    useEffect(() => {
        if (reloadInit.current) { reloadInit.current = false; return; }
        setReloading(true);
        const t = setTimeout(() => setReloading(false), 650);
        return () => clearTimeout(t);
    }, [debouncedSearch, sort]);

    const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!onRequestCloseModal) return;
        const target = e.target as HTMLElement;
        const interactive = target.closest('button,a,[role="button"],input,textarea,select,[data-keep-open="true"]');
        if (interactive) return;
        const insideCard = target.closest('[data-artist-card="true"]');
        if (insideCard) return;
        onRequestCloseModal();
    };

    const filterNode = (
        <ArtistFilter
            priceFilter={priceFilter}
            setPriceFilter={(v) => { setPriceFilter(v); setCurrentPage(1); }}
            locationFilter={locationFilter}
            setLocationFilter={(v) => { setLocationFilter(v); setCurrentPage(1); }}
            styleFilter={styleFilter}
            setStyleFilter={(v) => { setStyleFilter(v); setCurrentPage(1); }}
            availabilityFilter={availabilityFilter}
            setAvailabilityFilter={(v) => { setAvailabilityFilter(v); setCurrentPage(1); }}
            experienceFilter={experienceFilter}
            setExperienceFilter={(v) => { setExperienceFilter(v); setCurrentPage(1); }}
            bookingFilter={bookingFilter}
            setBookingFilter={(v) => { setBookingFilter(v); setCurrentPage(1); }}
            travelFilter={travelFilter}
            setTravelFilter={(v) => { setTravelFilter(v); setCurrentPage(1); }}
            sort={sort}
            setSort={(v) => { setSort(v); setCurrentPage(1); }}
            artists={artists}
            setCurrentPage={setCurrentPage}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
        />
    );

    const sectionsSkeleton = (
        <div className="space-y-8">
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
    );

    return (
        <div className="flex flex-col h-full min-h-0 w-full">
            <div className="relative flex-1 min-h-0" onPointerDownCapture={handleGridPointerDown}>
                <div data-artist-scroll className="h-full min-h-0 overflow-y-auto px-2 sm:px-1 pb-24">
                    <header className="text-center pt-3 pb-0 px-4">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="h-px w-8 bg-app/50" aria-hidden />
                            <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-subtle">Discover artists</span>
                            <span className="h-px w-8 bg-app/50" aria-hidden />
                        </div>
                        <h1 className="font-extrabold tracking-tight leading-[1.05]" style={{ fontSize: "clamp(1.7rem, 1.6vw + 1.2rem, 2.7rem)" }}>
                            Find your artist. Wear their art.
                        </h1>
                        <p className="mt-3 text-sm sm:text-base text-subtle max-w-xl mx-auto leading-relaxed">
                            Browse by style — from bold blackwork to delicate fine line — and book the artist who brings your vision to skin.
                        </p>
                    </header>
                    <div className="sticky top-0 z-20 py-2 -mx-2 px-2 sm:-mx-1 sm:px-1">
                        <div className="w-full max-w-2xl mx-auto">
                            {filterNode}
                        </div>
                    </div>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-subtle mt-3 mb-6">
                        <ChevronsDown className="h-4 w-4 animate-bounce" aria-hidden />
                        Scroll to explore every style
                    </p>
                    {reloading ? (
                        sectionsSkeleton
                    ) : (
                    <LazyReveal
                        loading={isCenterLoading}
                        skeleton={sectionsSkeleton}
                    >
                        {sections.length === 0 ? (
                            <EmptyArtists />
                        ) : viewAllStyle ? (
                            <div>
                                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                                    <div className="flex items-baseline gap-2 min-w-0">
                                        <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">{viewAllStyle}</h2>
                                        <span className="text-xs text-subtle shrink-0">{viewAllItems.length} artists</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setViewAllStyle(null)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-app hover:underline underline-offset-2"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" /> All styles
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                    {viewAllItems.map((artist, index) => (
                                        <div key={`${(artist as any).clerkId ?? (artist as any)._id}:${index}`} className="h-[23rem]">
                                            <ArtistCarouselCard artist={artist} onClick={() => onSelectArtist(artist)} fill />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {sections.map(({ style, items }) => (
                                    <StyleRow
                                        key={style}
                                        style={style}
                                        items={items}
                                        onSelect={onSelectArtist}
                                        onViewAll={() => setViewAllStyle(style)}
                                    />
                                ))}
                            </div>
                        )}
                    </LazyReveal>
                    )}
                </div>
            </div>
        </div>
    );
}