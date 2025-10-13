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
};

const ITEMS_PER_PAGE = 12;

const ArtistsSection: React.FC<Props> = ({
    artists,
    loading,
    showArtists,
    onSelectArtist,
    onRequestCloseModal,
}) => {
    const [priceFilter, setPriceFilter] = useState<string>("all");
    const [locationFilter, setLocationFilter] = useState<string>("all");
    const [styleFilter, setStyleFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [filterOpacity] = useState(1);

    useEffect(() => {
        const t = setTimeout(
            () => setDebouncedSearch(searchQuery.trim().toLowerCase()),
            250
        );
        return () => clearTimeout(t);
    }, [searchQuery]);

    const filtered = useMemo(() => {
        return artists
            .filter((artist) => {
                const inPriceRange = !artist.priceRange
                    ? true
                    : priceFilter === "all"
                        ? true
                        : priceFilter === "5000+"
                            ? artist.priceRange.max >= 5000
                            : (() => {
                                const [min, max] = priceFilter.split("-").map(Number);
                                return artist.priceRange.max >= min && artist.priceRange.min <= max;
                            })();

                const inLocation = locationFilter === "all" || artist.location === locationFilter;
                const inStyle = styleFilter === "all" || artist.style?.includes(styleFilter);

                const q = debouncedSearch;
                const matchesKeyword =
                    q === "" ||
                    artist.username?.toLowerCase().includes(q) ||
                    artist.location?.toLowerCase().includes(q) ||
                    artist.bio?.toLowerCase().includes(q) ||
                    (artist.style || []).some((s) => s.toLowerCase().includes(q));

                return inPriceRange && inLocation && inStyle && matchesKeyword;
            })
            .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }, [artists, priceFilter, locationFilter, styleFilter, debouncedSearch]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const pageItems = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const isCenterLoading = loading || !showArtists;

    const motionKey = [
        currentPage,
        priceFilter,
        locationFilter,
        styleFilter,
        debouncedSearch,
        pageItems.length,
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
                    <div
                        className="flex flex-col justify-between flex-1"
                        onPointerDownCapture={handleGridPointerDown}
                    >
                        <div className="w-full flex-1 px-0 pt-3 pb-2">
                            {pageItems.length > 0 ? (
                                !isCenterLoading && (
                                    <div
                                        key={motionKey}
                                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 items-stretch auto-rows-[1fr] gap-6 md:gap-5"
                                    >
                                        {pageItems.map((artist, index) => (
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
                                                    className="h-full min-h-[520px] sm:min-h-[540px] md:min-h-[560px]"
                                                    data-artist-card="true"
                                                >
                                                    <ArtistCard
                                                        artist={artist}
                                                        onClick={() => onSelectArtist(artist)}
                                                    />
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
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPrev={() => setCurrentPage((p) => p - 1)}
                                onNext={() => setCurrentPage((p) => p + 1)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ArtistsSection;