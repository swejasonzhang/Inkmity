import React, { useEffect, useMemo, useState } from "react";
import ArtistCard from "./ArtistCard";
import ArtistFilter from "./ArtistFilter";
import CircularProgress from "@mui/material/CircularProgress";
import { motion } from "framer-motion";
import Pagination from "./Pagination";
import type { ArtistDto } from "@/hooks/useDashboardData";

type Props = {
    artists: ArtistDto[];
    loading: boolean;
    showArtists: boolean;
    onSelectArtist: (a: ArtistDto) => void;
};

const ITEMS_PER_PAGE = 5;

const ArtistsSection: React.FC<Props> = ({ artists, loading, showArtists, onSelectArtist }) => {
    const [priceFilter, setPriceFilter] = useState<string>("all");
    const [locationFilter, setLocationFilter] = useState<string>("all");
    const [styleFilter, setStyleFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [filterOpacity, setFilterOpacity] = useState(1);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        const handleScroll = () => {
            const el = document.getElementById("middle-content");
            const scrollTop = el?.scrollTop || 0;
            const fadeDistance = 100;
            setFilterOpacity(Math.max(1 - scrollTop / fadeDistance, 0));
        };
        const middle = document.getElementById("middle-content");
        middle?.addEventListener("scroll", handleScroll);
        return () => middle?.removeEventListener("scroll", handleScroll);
    }, []);

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
    const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <section
            id="middle-content"
            className="flex-[2.6] flex flex-col max-w-full w-full overflow-y-auto rounded-2xl bg-gray-900"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
            <div
                className="bg-gray-800 px-3 py-3 rounded-lg shadow sticky top-0 z-10 w-full transition-opacity duration-300 backdrop-blur supports-[backdrop-filter]:bg-gray-800/80 lg:backdrop-blur-0"
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
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPrev={() => setCurrentPage((p) => p - 1)}
                    onNext={() => setCurrentPage((p) => p + 1)}
                />
            </div>

            <div className="flex flex-col justify-between flex-1">
                <div className="flex flex-col gap-4 w-full flex-1">
                    {loading || !showArtists ? (
                        <div className="flex justify-center items-center flex-1">
                            <CircularProgress sx={{ color: "#ffffff" }} />
                        </div>
                    ) : pageItems.length > 0 ? (
                        pageItems.map((artist, index) => (
                            <motion.div
                                key={(artist.clerkId ?? artist._id) + ":" + index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                                className={`w-full ${index === 0 ? "mt-4" : ""}`}
                            >
                                <ArtistCard artist={artist} onClick={() => onSelectArtist(artist)} />
                            </motion.div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center flex-1 flex items-center justify-center">
                            No artists match your filters.
                        </p>
                    )}
                </div>

                <div className="py-3">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPrev={() => setCurrentPage((p) => p - 1)}
                        onNext={() => setCurrentPage((p) => p + 1)}
                    />
                </div>
            </div>
        </section>
    );
};

export default ArtistsSection;