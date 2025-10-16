import React, { useEffect, useMemo, useState } from "react";
import ArtistCard from "./ArtistCard";
import ArtistFilter from "./ArtistFilter";
import CircularProgress from "@mui/material/CircularProgress";
import { motion } from "framer-motion";
import Pagination from "../Pagination";
import type { ArtistDto } from "@/hooks/useDashboardData";

type Props = {
    artists: ArtistDto[];
    loading: boolean;
    showArtists: boolean;
    onSelectArtist: (a: ArtistDto) => void;
    onRequestCloseModal?: () => void;
    page?: number;
    totalPages?: number;
    onPageChange?: (p: number) => void;
};

const ITEMS_PER_PAGE = 12;

const normalizeYears = (y: unknown): number | undefined => {
    if (typeof y === "number" && Number.isFinite(y)) return Math.trunc(y);
    if (typeof y === "string") {
        const n = Number(y.toString().replace(/[^\d]/g, ""));
        if (Number.isFinite(n)) return Math.trunc(n);
    }
    return undefined;
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

const ArtistsSection: React.FC<Props> = ({
    artists,
    loading,
    showArtists,
    onSelectArtist,
    onRequestCloseModal,
    page,
    totalPages,
    onPageChange,
}) => {
    const [priceFilter, setPriceFilter] = useState<string>("all");
    const [locationFilter, setLocationFilter] = useState<string>("all");
    const [styleFilter, setStyleFilter] = useState<string>("all");
    const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
    const [experienceFilter, setExperienceFilter] = useState<string>("all");
    const [sort, setSort] = useState<string>("experience_desc");

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [filterOpacity] = useState(1);

    const usingExternalPaging =
        typeof page === "number" &&
        typeof totalPages === "number" &&
        typeof onPageChange === "function";

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const filtered = useMemo(() => {
        const now = new Date();

        const inAvailability = (a: ArtistDto) => {
            const isNow = a.isAvailableNow === true;
            const nextRaw = a.nextAvailableDate;
            const waitlist = a.acceptingWaitlist === true || a.isClosed === true;

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

        const inPriceRange = (a: ArtistDto) => {
            if (!a.priceRange || priceFilter === "all") return true;
            if (priceFilter === "5000+") return a.priceRange.max >= 5000;
            const [min, max] = priceFilter.split("-").map(Number);
            if (!Number.isFinite(min) && !Number.isFinite(max)) return true;
            const overlaps =
                (Number.isFinite(min) ? a.priceRange.max >= (min as number) : true) &&
                (Number.isFinite(max) ? a.priceRange.min <= (max as number) : true);
            return overlaps;
        };

        const matchesKeyword = (a: ArtistDto, q: string) => {
            if (!q) return true;
            return (
                a.username?.toLowerCase().includes(q) ||
                a.location?.toLowerCase().includes(q) ||
                a.bio?.toLowerCase().includes(q) ||
                (a.style || []).some((s) => s.toLowerCase().includes(q))
            );
        };

        let list = artists.filter((a) => {
            if (!inPriceRange(a)) return false;
            if (!(locationFilter === "all" || a.location === locationFilter)) return false;
            if (!(styleFilter === "all" || (a.style ?? []).includes(styleFilter))) return false;
            if (!matchesKeyword(a, debouncedSearch)) return false;
            if (!inAvailability(a)) return false;
            const y = normalizeYears(a.yearsExperience);
            if (!matchesExperience(y, experienceFilter)) return false;
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
            list = list
                .slice()
                .sort(
                    (a, b) =>
                        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
                );
        }

        return list;
    }, [
        artists,
        priceFilter,
        locationFilter,
        styleFilter,
        debouncedSearch,
        availabilityFilter,
        experienceFilter,
        sort,
    ]);

    const clientTotalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const clientPageItems = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );
    const listItems = usingExternalPaging ? filtered : clientPageItems;

    const isCenterLoading = loading || !showArtists;

    const motionKey = [
        usingExternalPaging ? page : currentPage,
        priceFilter,
        locationFilter,
        styleFilter,
        availabilityFilter,
        experienceFilter,
        sort,
        debouncedSearch,
        listItems.length,
    ].join("|");

    const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!onRequestCloseModal) return;
        const target = e.target as HTMLElement;
        const interactive = target.closest(
            'button,a,[role="button"],input,textarea,select,[data-keep-open="true"]'
        );
        if (interactive) return;
        const insideCard = target.closest('[data-artist-card="true"]');
        if (insideCard) return;
        onRequestCloseModal();
    };

    const handleSetCurrentPage = (p: number) => {
        if (usingExternalPaging) onPageChange!(p);
        else setCurrentPage(p);
    };

    return (
        <section
            id="middle-content"
            className="flex-[2.6] flex flex-col max-w-full w-full overflow-y-auto rounded-2xl bg-card"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
            <div
                className="bg-card px-3 py-3 rounded-lg sticky top-0 z-10 w-full transition-opacity duration-300"
                style={{ opacity: filterOpacity }}
            >
                <ArtistFilter
                    priceFilter={priceFilter}
                    setPriceFilter={setPriceFilter}
                    locationFilter={locationFilter}
                    setLocationFilter={setLocationFilter}
                    styleFilter={styleFilter}
                    setStyleFilter={setStyleFilter}
                    availabilityFilter={availabilityFilter}
                    setAvailabilityFilter={setAvailabilityFilter}
                    experienceFilter={experienceFilter}
                    setExperienceFilter={setExperienceFilter}
                    sort={sort}
                    setSort={setSort}
                    artists={artists}
                    setCurrentPage={setCurrentPage}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
            </div>

            <div className="relative flex-1 flex flex-col">
                {isCenterLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <CircularProgress sx={{ color: "var(--fg)" }} />
                    </div>
                )}

                <div className={isCenterLoading ? "opacity-0 pointer-events-none" : "opacity-100"}>
                    <div className="flex flex-col justify-between flex-1" onPointerDownCapture={handleGridPointerDown}>
                        <div className="w-full flex-1 px-0 pt-3 pb-2">
                            {listItems.length > 0 ? (
                                !isCenterLoading && (
                                    <div
                                        key={motionKey}
                                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 items-stretch auto-rows-[1fr] gap-6 md:gap-5"
                                    >
                                        {listItems.map((artist, index) => (
                                            <motion.div
                                                key={(artist.clerkId ?? artist._id) + ":" + index}
                                                initial={{ opacity: 0, y: 24 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true, amount: 0.2 }}
                                                transition={{
                                                    duration: 0.45,
                                                    delay: index * 0.1,
                                                    ease: [0.16, 1, 0.3, 1] as const,
                                                }}
                                                className="w-full h-full"
                                            >
                                                <div
                                                    className="h-full min-h-[520px] sm:minh-[540px] md:min-h-[560px]"
                                                    data-artist-card="true"
                                                >
                                                    <ArtistCard artist={artist} onClick={() => onSelectArtist(artist)} />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <p className="text-muted text-center flex-1 flex items-center justify-center py-8">
                                    No artists match your filters.
                                </p>
                            )}
                        </div>

                        <div className="py-4 px-3 sm:px-4 md:px-6">
                            {usingExternalPaging ? (
                                <Pagination
                                    currentPage={page!}
                                    totalPages={totalPages!}
                                    onPrev={() => handleSetCurrentPage((page as number) - 1)}
                                    onNext={() => handleSetCurrentPage((page as number) + 1)}
                                />
                            ) : (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={clientTotalPages}
                                    onPrev={() => handleSetCurrentPage(currentPage - 1)}
                                    onNext={() => handleSetCurrentPage(currentPage + 1)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ArtistsSection;