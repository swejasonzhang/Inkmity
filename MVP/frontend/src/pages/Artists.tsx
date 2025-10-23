import React, { useEffect, useMemo, useState } from "react"
import ArtistCard from "@/components/dashboard/client/ArtistCard"
import ArtistFilter from "@/components/dashboard/client/ArtistFilter"
import { fetchArtists, type Artist } from "@/api"

const PAGE_SIZE = 12

const Artists: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([])
  const [priceFilter, setPriceFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [styleFilter, setStyleFilter] = useState("all")
  const [availabilityFilter, setAvailabilityFilter] = useState("all")
  const [experienceFilter, setExperienceFilter] = useState("all")
  const [bookingFilter, setBookingFilter] = useState("all")
  const [travelFilter, setTravelFilter] = useState("all")
  const [sort, setSort] = useState("rating_desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const filtersKey = useMemo(
    () =>
      [
        priceFilter,
        locationFilter,
        styleFilter,
        availabilityFilter,
        experienceFilter,
        bookingFilter,
        travelFilter,
        sort,
        debouncedSearch,
      ].join("|"),
    [
      priceFilter,
      locationFilter,
      styleFilter,
      availabilityFilter,
      experienceFilter,
      bookingFilter,
      travelFilter,
      sort,
      debouncedSearch,
    ]
  )

  async function loadArtists(opts: { page: number; reset: boolean }) {
    const { page, reset } = opts
    try {
      reset ? setLoading(true) : setLoadingMore(true)
      setError(null)

      const res = await fetchArtists({
        page,
        pageSize: PAGE_SIZE,
        sort,
        search: debouncedSearch,
        location: locationFilter !== "all" ? locationFilter : undefined,
        style: styleFilter !== "all" ? styleFilter : undefined,
        experience: experienceFilter !== "all" ? experienceFilter : undefined,
        booking: bookingFilter !== "all" ? bookingFilter : undefined,
        travel: travelFilter !== "all" ? travelFilter : undefined,
      })

      const next = res.items
      setArtists(prev => (reset ? next : [...prev, ...next]))
      setHasMore(page * res.pageSize < res.total)
    } catch (e: any) {
      setError(e?.message || "Failed to load artists")
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    loadArtists({ page: 1, reset: true })
  }, [filtersKey])

  const onLoadMore = () => {
    const next = currentPage + 1
    setCurrentPage(next)
    loadArtists({ page: next, reset: false })
  }

  const SkeletonCard = () => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 animate-pulse">
      <div className="h-40 w-full rounded-xl bg-white/10 mb-3" />
      <div className="h-4 w-2/3 bg-white/10 rounded mb-2" />
      <div className="h-3 w-1/2 bg-white/10 rounded" />
    </div>
  )

  return (
    <div className="min-h-dvh bg-gray-900 text-white">
      <div className="sticky top-0 z-20 bg-gray-900/85 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
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
            bookingFilter={bookingFilter}
            setBookingFilter={setBookingFilter}
            travelFilter={travelFilter}
            setTravelFilter={setTravelFilter}
            sort={sort}
            setSort={setSort}
            artists={artists}
            setCurrentPage={setCurrentPage}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading && artists.length === 0
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)
            : artists.map(artist => <ArtistCard key={artist._id} artist={artist as any} onClick={() => { }} />)}
        </div>

        {!loading && artists.length === 0 && !error && (
          <div className="text-center text-white/70 py-16">
            <p className="text-lg">No artists match your filters.</p>
            <p className="text-sm mt-1">Try adjusting filters or keywords.</p>
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center mt-6">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 rounded-md border border-white/15 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Artists