import { useEffect, useMemo, useState } from "react"
import ArtistCard from "./ArtistCard"
import ArtistFilter from "./ArtistFilter"
import CircularProgress from "@mui/material/CircularProgress"
import { motion } from "framer-motion"
import Pagination from "../shared/Pagination"
import type { Artist } from "@/api"

type Props = {
    artists: Artist[]
    loading: boolean
    showArtists: boolean
    onSelectArtist: (a: Artist) => void
    onRequestCloseModal?: () => void
    page?: number
    totalPages?: number
    onPageChange?: (p: number) => void
}

const PRESET_STORAGE_KEY = "inkmity_artist_filters"
const ITEMS_PER_PAGE = 12

const normalizeYears = (y: unknown): number | undefined => {
    if (typeof y === "number" && Number.isFinite(y)) return Math.trunc(y)
    if (typeof y === "string") {
        const n = Number(y.toString().replace(/[^\d]/g, ""))
        if (Number.isFinite(n)) return Math.trunc(n)
    }
    return undefined
}

const toNumber = (v: unknown, fallback = 0): number => {
    if (typeof v === "number") return Number.isFinite(v) ? v : fallback
    if (typeof v === "string") {
        const cleaned = v.replace(/[, ]/g, "")
        const n = Number(cleaned)
        return Number.isFinite(n) ? n : fallback
    }
    return fallback
}

const matchesExperience = (years: number | undefined, filter: string) => {
    if (filter === "all") return true
    if (years === undefined) return false
    if (filter === "amateur") return years >= 0 && years <= 2
    if (filter === "experienced") return years >= 3 && years <= 5
    if (filter === "professional") return years >= 6 && years <= 10
    if (filter === "veteran") return years >= 10
    return true
}

export default function ArtistsSection({
    artists,
    loading,
    showArtists,
    onSelectArtist,
    onRequestCloseModal,
    page,
    totalPages,
    onPageChange,
}: Props) {
    const initialPreset: Partial<{
        priceFilter: string
        locationFilter: string
        styleFilter: string
        availabilityFilter: string
        experienceFilter: string
        bookingFilter: string
        travelFilter: string
        sort: string
        searchQuery: string
    }> =
        typeof window !== "undefined"
            ? (() => {
                try {
                    const raw = localStorage.getItem(PRESET_STORAGE_KEY)
                    return raw ? JSON.parse(raw) : {}
                } catch {
                    return {}
                }
            })()
            : {}

    const [priceFilter, setPriceFilter] = useState<string>(initialPreset.priceFilter ?? "all")
    const [locationFilter, setLocationFilter] = useState<string>(initialPreset.locationFilter ?? "all")
    const [styleFilter, setStyleFilter] = useState<string>(initialPreset.styleFilter ?? "all")
    const [availabilityFilter, setAvailabilityFilter] = useState<string>(initialPreset.availabilityFilter ?? "all")
    const [experienceFilter, setExperienceFilter] = useState<string>(initialPreset.experienceFilter ?? "all")
    const [bookingFilter, setBookingFilter] = useState<string>(initialPreset.bookingFilter ?? "all")
    const [travelFilter, setTravelFilter] = useState<string>(initialPreset.travelFilter ?? "all")
    const [sort, setSort] = useState<string>(initialPreset.sort || "experience_desc")
    const [searchQuery, setSearchQuery] = useState<string>(typeof initialPreset.searchQuery === "string" ? initialPreset.searchQuery : "")
    const [debouncedSearch, setDebouncedSearch] = useState<string>((typeof initialPreset.searchQuery === "string" ? initialPreset.searchQuery : "").trim().toLowerCase())
    const [currentPage, setCurrentPage] = useState(1)

    const usingExternalPaging = typeof page === "number" && typeof totalPages === "number" && typeof onPageChange === "function"

    useEffect(() => {
        if (typeof window === "undefined") return
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
        }
        try {
            localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(payload))
        } catch { }
    }, [priceFilter, locationFilter, styleFilter, availabilityFilter, experienceFilter, bookingFilter, travelFilter, sort, searchQuery])

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 250)
        return () => clearTimeout(t)
    }, [searchQuery])

    const filtered = useMemo(() => {
        const now = new Date()

        const inAvailability = (a: Artist) => {
            const isNow = (a as any).isAvailableNow === true
            const nextRaw = (a as any).nextAvailableDate as string | undefined
            const waitlist = (a as any).acceptingWaitlist === true || (a as any).isClosed === true
            if (availabilityFilter === "waitlist") return waitlist
            const next = nextRaw ? new Date(nextRaw) : null
            if (!next && !isNow) {
                if (availabilityFilter === "all") return true
                return false
            }
            const msDay = 24 * 60 * 60 * 1000
            const diffDays = isNow ? 0 : Math.ceil(((next as Date).getTime() - now.getTime()) / msDay)
            if (availabilityFilter === "all") return true
            if (availabilityFilter === "7d") return diffDays <= 7
            if (availabilityFilter === "lt1m") return diffDays <= 30
            if (availabilityFilter === "1to3m") return diffDays > 30 && diffDays <= 90
            if (availabilityFilter === "lte6m") return diffDays <= 180
            return true
        }

        const inPriceRange = (_a: Artist) => {
            if (priceFilter === "all") return true
            return true
        }

        const matchesKeyword = (a: Artist, q: string) => {
            if (!q) return true
            const styles = Array.isArray((a as any).styles) ? (a as any).styles : []
            const bio = (a as any).bio as string | undefined
            return (
                a.username?.toLowerCase().includes(q) ||
                (a as any).location?.toLowerCase().includes(q) ||
                (bio ? bio.toLowerCase().includes(q) : false) ||
                styles.some((s: string) => s.toLowerCase().includes(q))
            )
        }

        const matchesBooking = (a: Artist, v: string) => {
            if (!v || v === "all") return true
            const booking = ((a as any).bookingPreference ?? "").toString()
            return booking === v
        }

        const matchesTravel = (a: Artist, v: string) => {
            if (!v || v === "all") return true
            const travel = ((a as any).travelFrequency ?? "").toString()
            return travel === v
        }

        let list = artists.filter(a => {
            if (!inPriceRange(a)) return false
            if (!(locationFilter === "all" || (a as any).location === locationFilter)) return false
            const styles = Array.isArray((a as any).styles) ? (a as any).styles : []
            if (!(styleFilter === "all" || styles.includes(styleFilter))) return false
            if (!matchesKeyword(a, debouncedSearch)) return false
            if (!inAvailability(a)) return false
            const y = normalizeYears((a as any).yearsExperience)
            if (!matchesExperience(y, experienceFilter)) return false
            if (!matchesBooking(a, bookingFilter)) return false
            if (!matchesTravel(a, travelFilter)) return false
            return true
        })

        if (sort === "experience_desc" || sort === "experience_asc") {
            list = list.slice().sort((a, b) => {
                const ay = normalizeYears((a as any).yearsExperience)
                const by = normalizeYears((b as any).yearsExperience)
                const av = ay ?? (sort === "experience_desc" ? -Infinity : Infinity)
                const bv = by ?? (sort === "experience_desc" ? -Infinity : Infinity)
                return sort === "experience_desc" ? bv - av : av - bv
            })
        } else if (sort === "newest") {
            list = list.slice().sort(
                (a, b) => new Date((b as any).createdAt ?? 0).getTime() - new Date((a as any).createdAt ?? 0).getTime()
            )
        } else if (sort === "highest_rated") {
            list = list.slice().sort((a, b) => {
                const ar = toNumber((a as any).rating, 0)
                const br = toNumber((b as any).rating, 0)
                if (br !== ar) return br - ar
                const arv = toNumber((a as any).reviewsCount, 0)
                const brv = toNumber((b as any).reviewsCount, 0)
                return brv - arv
            })
        } else if (sort === "most_reviews") {
            list = list.slice().sort((a, b) => {
                const arv = toNumber((a as any).reviewsCount, 0)
                const brv = toNumber((b as any).reviewsCount, 0)
                if (brv !== arv) return brv - arv
                const ar = toNumber((a as any).rating, 0)
                const br = toNumber((b as any).rating, 0)
                return br - ar
            })
        }

        return list
    }, [artists, priceFilter, locationFilter, styleFilter, debouncedSearch, availabilityFilter, experienceFilter, bookingFilter, travelFilter, sort])

    const clientPageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    const listItems = usingExternalPaging ? filtered : clientPageItems
    const isCenterLoading = loading || !showArtists

    const motionKey = [
        usingExternalPaging ? page : currentPage,
        priceFilter,
        locationFilter,
        styleFilter,
        availabilityFilter,
        experienceFilter,
        bookingFilter,
        travelFilter,
        sort,
        debouncedSearch,
        listItems.length,
    ].join("|")

    const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!onRequestCloseModal) return
        const target = e.target as HTMLElement
        const interactive = target.closest('button,a,[role="button"],input,textarea,select,[data-keep-open="true"]')
        if (interactive) return
        const insideCard = target.closest('[data-artist-card="true"]')
        if (insideCard) return
        onRequestCloseModal()
    }

    const handleSetCurrentPage = (p: number) => {
        if (usingExternalPaging) onPageChange!(p)
        else setCurrentPage(p)
    }

    return (
        <section
            id="middle-content"
            className="flex-[2.6] flex flex-col max-w-full w-full overflow-y-auto rounded-2xl bg-card"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
            <div className="bg-card px-3 py-3 rounded-lg sticky top-0 z-10 w-full transition-opacity duration-300">
                <ArtistFilter
                    priceFilter={priceFilter}
                    setPriceFilter={v => {
                        setPriceFilter(v)
                        setCurrentPage(1)
                    }}
                    locationFilter={locationFilter}
                    setLocationFilter={v => {
                        setLocationFilter(v)
                        setCurrentPage(1)
                    }}
                    styleFilter={styleFilter}
                    setStyleFilter={v => {
                        setStyleFilter(v)
                        setCurrentPage(1)
                    }}
                    availabilityFilter={availabilityFilter}
                    setAvailabilityFilter={v => {
                        setAvailabilityFilter(v)
                        setCurrentPage(1)
                    }}
                    experienceFilter={experienceFilter}
                    setExperienceFilter={v => {
                        setExperienceFilter(v)
                        setCurrentPage(1)
                    }}
                    bookingFilter={bookingFilter}
                    setBookingFilter={v => {
                        setBookingFilter(v)
                        setCurrentPage(1)
                    }}
                    travelFilter={travelFilter}
                    setTravelFilter={v => {
                        setTravelFilter(v)
                        setCurrentPage(1)
                    }}
                    sort={sort}
                    setSort={v => {
                        setSort(v)
                        setCurrentPage(1)
                    }}
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
                                                key={`${(artist as any).clerkId ?? (artist as any)._id}:${index}`}
                                                initial={{ opacity: 0, y: 24 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true, amount: 0.2 }}
                                                transition={{ duration: 0.45, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
                                                className="w-full h-full"
                                            >
                                                <div className="h-full min-h-[520px] sm:min-h-[540px] md:min-h-[560px]" data-artist-card="true">
                                                    <ArtistCard
                                                        artist={{ ...(artist as any), images: (artist as any).portfolioImages || [] } as any}
                                                        onClick={() => onSelectArtist(artist)}
                                                    />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <p className="text-muted text-center flex-1 flex items-center justify-center py-8">No artists match your filters.</p>
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
                                    totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                                    onPrev={() => handleSetCurrentPage(currentPage - 1)}
                                    onNext={() => handleSetCurrentPage(currentPage + 1)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}